import { dayInMilliseconds, slipLookbackDays, sourceForAlbum } from "./albums";
import { prepareSlipUpload, SlipImageError, type LocalImage } from "./image";
import { AutoImportRequestError, type AutoImportTransport } from "./transport";

export type PhotoAccess = "all" | "limited" | "denied" | "permission-required" | "unsupported";
export type ScanTrigger = "home" | "refresh";

export interface PhotoAssetMetadata {
  id: string;
  creationTime: number | null;
}

/** Device, network and storage boundaries used by one scan session. */
export interface SlipScanPorts {
  now(): number;
  photoAccess(): Promise<PhotoAccess>;
  albums(): Promise<{ key: string; title: string }[]>;
  /** One page of image metadata from an album, newest first, filtered by asset creation time. */
  pageAssets(
    albumKey: string,
    query: { from: number; to: number; offset: number; limit: number }
  ): Promise<PhotoAssetMetadata[]>;
  pageSize?: number;
  readOriginal(assetId: string): Promise<LocalImage>;
  /** Produce a smaller JPEG copy of an image that exceeds the upload limit. */
  shrink(image: LocalImage): Promise<LocalImage>;
  send: AutoImportTransport;
  bindImage(accountId: string, transactionId: string, uri: string): Promise<void>;
  refreshLedger(): Promise<void>;
  log?(event: string, detail: Record<string, unknown>): void;
}

export interface ScanFailure {
  assetId: string;
  kind: "image" | AutoImportRequestError["kind"];
  code: string | null;
  status: number | null;
  retryAfter: number | null;
}

export type ScanRoundStatus = "completed" | "no-access" | "unauthorized" | "cancelled" | "error";

export interface ScanRound {
  accountId: string;
  trigger: ScanTrigger;
  status: ScanRoundStatus;
  discovered: number;
  created: number;
  skipped: number;
  failed: number;
  failures: ScanFailure[];
}

export interface SlipScanState {
  scanning: boolean;
  access: PhotoAccess | null;
  lastRound: ScanRound | null;
}

const MAX_CONCURRENT_IMPORTS = 2;
// Messages can carry local paths, so logs keep only the error class.
const errorName = (cause: unknown) => (cause instanceof Error ? cause.name : typeof cause);
// Input the server rejects will be rejected again unchanged, so it is not sent again automatically.
const PERMANENT_STATUSES = new Set([400, 413, 415]);

export function createSlipScanSession(ports: SlipScanPorts) {
  const pageSize = ports.pageSize ?? 200;
  const listeners = new Set<() => void>();
  /** Assets with a final result in this app run, per account. Persisted memory and retry timing come later. */
  const settled = new Map<string, Set<string>>();
  let state: SlipScanState = { scanning: false, access: null, lastRound: null };
  type ActiveRound = { accountId: string; controller: AbortController; round: ScanRound; done: Promise<ScanRound> };
  let current: ActiveRound | null = null;

  let refreshing: Promise<void> | null = null;
  let refreshAgain = false;

  const log = (event: string, detail: Record<string, unknown>) => ports.log?.(event, detail);

  function setState(patch: Partial<SlipScanState>) {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  }

  function settledFor(accountId: string) {
    let assets = settled.get(accountId);
    if (!assets) settled.set(accountId, (assets = new Set()));
    return assets;
  }

  /** Coalesce ledger refreshes: saves during a refresh schedule exactly one more. */
  function requestRefresh() {
    refreshAgain = true;
    refreshing ??= (async () => {
      while (refreshAgain) {
        refreshAgain = false;
        try {
          await ports.refreshLedger();
        } catch (cause) {
          log("refresh-failed", { error: errorName(cause) });
        }
      }
    })().finally(() => {
      refreshing = null;
    });
  }

  async function discover(): Promise<PhotoAssetMetadata[]> {
    const to = ports.now();
    const from = to - slipLookbackDays * dayInMilliseconds;
    const albums = (await ports.albums()).filter((album) => sourceForAlbum(album.title) !== null);
    const found = new Map<string, PhotoAssetMetadata>();
    await Promise.all(
      albums.map(async (album) => {
        for (let offset = 0; ; offset += pageSize) {
          const page = await ports.pageAssets(album.key, { from, to, offset, limit: pageSize });
          for (const asset of page) if (asset.id && !found.has(asset.id)) found.set(asset.id, asset);
          if (page.length < pageSize) break;
        }
      })
    );
    return [...found.values()].sort((a, b) => (b.creationTime ?? 0) - (a.creationTime ?? 0));
  }

  async function run(entry: ActiveRound): Promise<ScanRound> {
    const { round } = entry;
    const signal = entry.controller.signal;
    const settledAssets = settledFor(round.accountId);
    const fail = (failure: ScanFailure, permanent: boolean) => {
      round.failed++;
      round.failures.push(failure);
      if (permanent) settledAssets.add(failure.assetId);
    };

    async function importAsset(assetId: string) {
      let uri: string;
      let upload: Awaited<ReturnType<typeof prepareSlipUpload>>;
      try {
        const original = await ports.readOriginal(assetId);
        uri = original.uri;
        upload = await prepareSlipUpload(original, ports.shrink);
      } catch (cause) {
        const code = cause instanceof SlipImageError ? cause.code : "UNREADABLE_IMAGE";
        fail({ assetId, kind: "image", code, status: null, retryAfter: null }, code !== "UNREADABLE_IMAGE");
        return;
      }

      let outcome;
      try {
        outcome = await ports.send({ assetId, ...upload }, signal);
      } catch (cause) {
        const error =
          cause instanceof AutoImportRequestError ? cause : new AutoImportRequestError({ kind: "network", cause });
        fail(
          { assetId, kind: error.kind, code: error.code, status: error.status, retryAfter: error.retryAfter },
          error.status !== null && PERMANENT_STATUSES.has(error.status)
        );
        if (error.status === 401) round.status = "unauthorized";
        return;
      }

      settledAssets.add(assetId);
      if (outcome.status === "skipped") {
        round.skipped++;
        return;
      }
      round.created++;
      // The transaction is saved on the server; a local binding failure never undoes or repeats that.
      try {
        await ports.bindImage(round.accountId, outcome.transactionId, uri);
      } catch (cause) {
        log("bind-failed", { error: errorName(cause) });
      }
      requestRefresh();
    }

    try {
      const access = await ports.photoAccess();
      // A superseded round must not change what Home shows for the current one.
      if (current === entry) setState({ access });
      if (access !== "all") {
        round.status = "no-access";
        return round;
      }
      const assets = await discover();
      round.discovered = assets.length;
      const queue = assets.filter((asset) => !settledAssets.has(asset.id));
      const worker = async () => {
        while (queue.length && !signal.aborted && round.status !== "unauthorized") {
          await importAsset(queue.shift()!.id);
        }
      };
      await Promise.all(Array.from({ length: MAX_CONCURRENT_IMPORTS }, worker));
      if (round.status !== "unauthorized") round.status = signal.aborted ? "cancelled" : "completed";
    } catch (cause) {
      round.status = "error";
      log("scan-failed", { error: errorName(cause) });
    }
    await refreshing;
    return round;
  }

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Start a round for this account, or join the one already running for it. */
    request({ accountId, trigger }: { accountId: string; trigger: ScanTrigger }): Promise<ScanRound> {
      if (current?.accountId === accountId && !current.controller.signal.aborted) return current.done;
      current?.controller.abort();
      const controller = new AbortController();
      const round: ScanRound = {
        accountId,
        trigger,
        status: "completed",
        discovered: 0,
        created: 0,
        skipped: 0,
        failed: 0,
        failures: [],
      };
      const entry: ActiveRound = { accountId, controller, round, done: Promise.resolve(round) };
      current = entry;
      entry.done = run(entry).finally(() => {
        if (current !== entry) return;
        current = null;
        log("round", {
          trigger,
          status: round.status,
          discovered: round.discovered,
          created: round.created,
          skipped: round.skipped,
          failed: round.failed,
        });
        setState({ scanning: false, lastRound: round });
      });
      setState({ scanning: true });
      return entry.done;
    },
    /** Stop scheduling further photos; requests already sent are allowed to settle. */
    stop() {
      current?.controller.abort();
    },
  };
}

export type SlipScanSession = ReturnType<typeof createSlipScanSession>;

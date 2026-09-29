import { dayInMilliseconds, slipLookbackDays, sourceForAlbum } from "./albums";
import { prepareSlipUpload, SlipImageError, type LocalImage } from "./image";
import { createScanMemory, type AssetRecord, type ScanMemoryStorage } from "./scan-memory";
import { AutoImportRequestError, type AutoImportTransport } from "./transport";

export type PhotoAccess = "all" | "limited" | "denied" | "permission-required" | "unsupported";
export type ScanTrigger = "home" | "refresh";

export interface PhotoAssetMetadata {
  id: string;
  creationTime: number | null;
  /** Changes when the photo itself is edited, which makes a rejected or skipped photo worth reading again. */
  modificationTime: number | null;
}

/** Device, network and storage boundaries used by one scan session. */
export interface SlipScanPorts {
  now(): number;
  /** Uniform in [0, 1), for retry jitter. Defaults to `Math.random`. */
  random?(): number;
  /** Outcome memory that survives app restarts, one entry per account. */
  store: ScanMemoryStorage;
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
  /**
   * Active ledger transactions saved under these assets' import identity, by asset ID. Deleted transactions are not
   * returned, so their photos stay unbound rather than being matched to another row.
   */
  findImportedTransactions(assetIds: string[], signal?: AbortSignal): Promise<Map<string, string>>;
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
  /** When this photo becomes eligible again, or null when it is not retried automatically. */
  retryAt: number | null;
}

export type ScanRoundStatus = "completed" | "no-access" | "unauthorized" | "cancelled" | "error";

export interface ScanRound {
  accountId: string;
  trigger: ScanTrigger;
  status: ScanRoundStatus;
  discovered: number;
  /** Photos waiting for a retry time that has not arrived yet. */
  deferred: number;
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

const RETRY_FLOOR_MS = 30_000;
const RETRY_CEILING_MS = 15 * 60_000;
// Guards against a malformed header parking a photo indefinitely.
const RETRY_AFTER_LIMIT_MS = 24 * 60 * 60_000;

/**
 * Wait before attempt `attempts + 1`: 30 s doubling per failure, plus up to the same again in jitter, capped at
 * 15 minutes. A longer valid Retry-After from the server wins.
 */
function retryDelay(attempts: number, random: number, retryAfterSeconds: number | null) {
  const base = RETRY_FLOOR_MS * 2 ** Math.max(0, attempts - 1);
  const backoff = Math.min(RETRY_CEILING_MS, base * (1 + Math.min(Math.max(random, 0), 1)));
  const requested =
    retryAfterSeconds !== null && Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0
      ? Math.min(retryAfterSeconds * 1000, RETRY_AFTER_LIMIT_MS)
      : 0;
  return Math.max(backoff, requested);
}

const retryAtOf = (record: AssetRecord | null) => (record?.kind === "retry" ? record.retryAt : null);

/** Whether a remembered outcome still stands for the photo as discovered now. */
function isSettled(record: AssetRecord | undefined, asset: PhotoAssetMetadata) {
  if (!record || record.kind === "retry") return false;
  // The server holds this asset's identity, so sending it again can only be answered as a duplicate.
  if (record.kind === "saved" || record.kind === "duplicate") return true;
  return record.modificationTime === asset.modificationTime;
}

export function createSlipScanSession(ports: SlipScanPorts) {
  const pageSize = ports.pageSize ?? 200;
  const listeners = new Set<() => void>();
  /** Per account, the sign-in session the server rejected with 401. Sending resumes once a different one is used. */
  const rejectedSessions = new Map<string, string | null>();
  /** Per account, photos being imported, including by a stopped round whose requests are still settling. */
  const inFlight = new Map<string, Set<string>>();
  const memory = createScanMemory(ports.store, (event, cause) => log(event, { error: errorName(cause) }));
  let state: SlipScanState = { scanning: false, access: null, lastRound: null };
  type ActiveRound = {
    accountId: string;
    sessionId: string | null;
    controller: AbortController;
    round: ScanRound;
    done: Promise<ScanRound>;
  };
  let current: ActiveRound | null = null;

  let refreshing: Promise<void> | null = null;
  let refreshAgain = false;

  const log = (event: string, detail: Record<string, unknown>) => ports.log?.(event, detail);

  function setState(patch: Partial<SlipScanState>) {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
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
    const { accountId } = round;
    const signal = entry.controller.signal;
    const account = await memory.open(accountId);
    const { records } = account;
    const busy = inFlight.get(accountId) ?? new Set<string>();
    inFlight.set(accountId, busy);
    /** A temporary failure: the same asset ID is sent again once its wait has passed, on a later round. */
    const retryLater = (
      asset: PhotoAssetMetadata,
      error: { code: string | null; status: number | null },
      retryAfter: number | null
    ) => {
      const previous = records.get(asset.id);
      const attempts =
        (previous?.kind === "retry" && previous.modificationTime === asset.modificationTime ? previous.attempts : 0) +
        1;
      const retryAt = ports.now() + retryDelay(attempts, (ports.random ?? Math.random)(), retryAfter);
      return {
        kind: "retry",
        attempts,
        retryAt,
        ...error,
        modificationTime: asset.modificationTime,
      } satisfies AssetRecord;
    };
    const fail = (failure: ScanFailure, record: AssetRecord | null) => {
      round.failed++;
      round.failures.push(failure);
      if (record) account.set(failure.assetId, record);
    };

    async function importAsset(asset: PhotoAssetMetadata) {
      busy.add(asset.id);
      try {
        await attemptImport(asset);
      } finally {
        busy.delete(asset.id);
      }
    }

    async function attemptImport(asset: PhotoAssetMetadata) {
      const { id: assetId, modificationTime } = asset;
      let uri: string;
      let upload: Awaited<ReturnType<typeof prepareSlipUpload>>;
      try {
        const original = await ports.readOriginal(assetId);
        uri = original.uri;
        upload = await prepareSlipUpload(original, ports.shrink);
      } catch (cause) {
        const code = cause instanceof SlipImageError ? cause.code : "UNREADABLE_IMAGE";
        // A photo that could not be read may be readable later, for example once it has downloaded to the device.
        const record: AssetRecord =
          code === "UNREADABLE_IMAGE"
            ? retryLater(asset, { code, status: null }, null)
            : { kind: "rejected", code, status: null, modificationTime };
        fail({ assetId, kind: "image", code, status: null, retryAfter: null, retryAt: retryAtOf(record) }, record);
        return;
      }

      let outcome;
      try {
        outcome = await ports.send({ assetId, ...upload }, signal);
      } catch (cause) {
        const error =
          cause instanceof AutoImportRequestError ? cause : new AutoImportRequestError({ kind: "network", cause });
        const { code, status } = error;
        let record: AssetRecord | null;
        if (status === 401 || error.kind === "cancelled") {
          // Neither says anything about this photo: it stays eligible. A cancelled request may still have been saved,
          // and the server answers the next attempt for this asset ID as a duplicate.
          record = null;
          if (status === 401) {
            round.status = "unauthorized";
            rejectedSessions.set(accountId, entry.sessionId);
          }
        } else if (status !== null && PERMANENT_STATUSES.has(status)) {
          record = { kind: "rejected", code, status, modificationTime };
        } else {
          // Includes network failures and timeouts, which may have been saved: the retry reuses the asset ID.
          record = retryLater(asset, { code, status }, error.retryAfter);
        }
        fail(
          { assetId, kind: error.kind, code, status, retryAfter: error.retryAfter, retryAt: retryAtOf(record) },
          record
        );
        return;
      }

      if (outcome.status === "skipped") {
        round.skipped++;
        account.set(
          assetId,
          outcome.reason === "duplicate"
            ? { kind: "duplicate", resolved: false, modificationTime }
            : { kind: "skipped", reason: outcome.reason, modificationTime }
        );
        return;
      }
      round.created++;
      account.set(assetId, { kind: "saved", transactionId: outcome.transactionId, bound: false });
      await bind(assetId, outcome.transactionId, uri);
      requestRefresh();
    }

    /**
     * Link the local photo to its saved transaction. The transaction is saved on the server either way: a failure here
     * never undoes or repeats that, and the remembered transaction ID lets a later round try again.
     */
    async function bind(assetId: string, transactionId: string, uri?: string) {
      try {
        await ports.bindImage(accountId, transactionId, uri ?? (await ports.readOriginal(assetId)).uri);
        account.set(assetId, { kind: "saved", transactionId, bound: true });
        return true;
      } catch (cause) {
        log("bind-failed", { error: errorName(cause) });
        return false;
      }
    }

    /** Finish local work for photos an earlier round saved on the server. */
    async function repairBindings(unbound: { assetId: string; transactionId: string }[]) {
      for (const { assetId, transactionId } of unbound) {
        if (signal.aborted) return;
        if (await bind(assetId, transactionId)) requestRefresh();
      }
    }

    /**
     * A duplicate answer carries no transaction ID. Find the row only by the exact asset identity it was saved under;
     * without one, the transaction keeps no local photo rather than being guessed from its title, amount or date.
     */
    async function resolveDuplicates(assets: PhotoAssetMetadata[]) {
      const pending = assets.filter(({ id }) => {
        const record = records.get(id);
        return record?.kind === "duplicate" && !record.resolved;
      });
      if (!pending.length || signal.aborted) return;
      let found: Map<string, string>;
      try {
        found = await ports.findImportedTransactions(
          pending.map(({ id }) => id),
          signal
        );
      } catch (cause) {
        // Still unresolved, so a later round asks the server again.
        log("ledger-lookup-failed", { error: errorName(cause) });
        return;
      }
      for (const { id: assetId, modificationTime } of pending) {
        const transactionId = found.get(assetId);
        if (!transactionId) {
          account.set(assetId, { kind: "duplicate", resolved: true, modificationTime });
          continue;
        }
        account.set(assetId, { kind: "saved", transactionId, bound: false });
        if (await bind(assetId, transactionId)) requestRefresh();
      }
    }

    try {
      const access = await ports.photoAccess();
      // A superseded round must not change what Home shows for the current one.
      if (current === entry) setState({ access });
      if (access !== "all") {
        round.status = "no-access";
        return round;
      }
      if (rejectedSessions.has(accountId) && rejectedSessions.get(accountId) === entry.sessionId) {
        round.status = "unauthorized";
        return round;
      }
      rejectedSessions.delete(accountId);
      const assets = await discover();
      round.discovered = assets.length;
      account.retain(new Set(assets.map((asset) => asset.id)), ports.now());
      const startedAt = ports.now();
      const unbound = assets.flatMap(({ id: assetId }) => {
        const record = records.get(assetId);
        return record?.kind === "saved" && !record.bound ? [{ assetId, transactionId: record.transactionId }] : [];
      });
      const queue = assets.filter((asset) => {
        if (busy.has(asset.id)) return false;
        const record = records.get(asset.id);
        if (
          record?.kind === "retry" &&
          record.modificationTime === asset.modificationTime &&
          record.retryAt > startedAt
        ) {
          round.deferred++;
          return false;
        }
        return !isSettled(record, asset);
      });
      const worker = async () => {
        while (queue.length && !signal.aborted && round.status !== "unauthorized") {
          await importAsset(queue.shift()!);
        }
      };
      await Promise.all(Array.from({ length: MAX_CONCURRENT_IMPORTS }, worker));
      if (round.status !== "unauthorized") {
        await repairBindings(unbound);
        await resolveDuplicates(assets);
      }
      if (round.status !== "unauthorized") round.status = signal.aborted ? "cancelled" : "completed";
    } catch (cause) {
      round.status = "error";
      log("scan-failed", { error: errorName(cause) });
    }
    await Promise.all([refreshing, account.flush()]);
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
    /**
     * Start a round for this account, or join the one already running for it. `sessionId` identifies the sign-in
     * session, so a 401 suspends sending only until the account signs in again.
     */
    request({
      accountId,
      sessionId = null,
      trigger,
    }: {
      accountId: string;
      sessionId?: string | null;
      trigger: ScanTrigger;
    }): Promise<ScanRound> {
      if (current?.accountId === accountId && !current.controller.signal.aborted) return current.done;
      current?.controller.abort();
      const controller = new AbortController();
      const round: ScanRound = {
        accountId,
        trigger,
        status: "completed",
        discovered: 0,
        deferred: 0,
        created: 0,
        skipped: 0,
        failed: 0,
        failures: [],
      };
      const entry: ActiveRound = { accountId, sessionId, controller, round, done: Promise.resolve(round) };
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
    /**
     * Forget what this device remembers about the account's photos, for when its ledger data is erased and the server
     * no longer holds their identity.
     */
    async forget(accountId: string) {
      if (current?.accountId === accountId) current.controller.abort();
      await memory.forget(accountId);
    },
    /** Stop scheduling further photos; requests already sent are allowed to settle. */
    stop() {
      current?.controller.abort();
    },
  };
}

export type SlipScanSession = ReturnType<typeof createSlipScanSession>;

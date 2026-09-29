import { discoverSlipPhotos, type PhotoAssetMetadata, type PhotoLibrary } from "./discovery";
import { prepareSlipUpload, SlipImageError, type LocalImage } from "./image";
import type { PhotoAccess } from "./photo-access";
import { createScanMemory, type AssetRecord, type ScanMemoryStorage } from "./scan-memory";
import { AutoImportRequestError, type AutoImportTransport } from "./transport";

/** Entering Home, the app becoming active again while Home is focused, or a released pull-to-refresh. */
export type ScanTrigger = "home" | "foreground" | "refresh";

/** Device, network and storage boundaries used by one scan session. */
export interface SlipScanPorts extends PhotoLibrary {
  now(): number;
  /** Uniform in [0, 1), for retry jitter. Defaults to `Math.random`. */
  random?(): number;
  /** Outcome memory that survives app restarts, one entry per account. */
  store: ScanMemoryStorage;
  /** The current permission, read without prompting: asking is always the person's own action. */
  photoAccess(): Promise<PhotoAccess>;
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
  /** How long a step may take before the round stops waiting for it, in milliseconds. */
  deadlines?: Partial<ScanDeadlines>;
  log?(event: string, detail: Record<string, unknown>): void;
}

/**
 * Native Photos calls have been seen to stop answering on a device. A round then gives up on the step instead of
 * keeping Home reading: discovery ends the round as `error`, a photo read counts as unreadable and is tried again later,
 * and the ledger refresh is left to finish on its own.
 */
export interface ScanDeadlines {
  discovery: number;
  read: number;
  refresh: number;
}

const DEFAULT_DEADLINES: ScanDeadlines = { discovery: 60_000, read: 60_000, refresh: 30_000 };

class DeadlineError extends Error {
  override name = "DeadlineError";
}

function withinDeadline<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new DeadlineError()), ms);
  });
  return Promise.race([work, expired]).finally(() => clearTimeout(timer));
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

/**
 * `paused`: stopped scheduling photos, and requests already sent were allowed to finish.
 * `cancelled`: requests in flight were aborted too, which does not mean the server did not save them.
 */
export type ScanRoundStatus = "completed" | "no-access" | "unauthorized" | "paused" | "cancelled" | "error";

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
/** The error class plus a native module's machine-readable `code`, such as Expo's `ERR_*` codes. */
const errorDetail = (cause: unknown) => {
  const code = cause instanceof Error && "code" in cause && typeof cause.code === "string" ? cause.code : null;
  return { error: errorName(cause), code };
};
/**
 * A 4xx other than 429 (`BUSY`, `AI_RATE_LIMITED`) or a 408 timeout will be answered the same way for the same input,
 * so it is not sent again automatically. 401 is handled separately, as a sign-in problem rather than a photo's.
 */
const isRejectedStatus = (status: number | null) =>
  status !== null && status >= 400 && status < 500 && status !== 408 && status !== 429;
/** Reading a photo is local, so it is tried generously, for example while an iCloud original downloads. */
const UNREADABLE_ATTEMPT_LIMIT = 10;

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

function countFailures(failures: ScanFailure[]) {
  const counts: Record<string, number> = {};
  for (const { kind, code, status } of failures) {
    const key = `${kind}:${code ?? status ?? "-"}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

const referenceOf = (image: LocalImage) => image.reference ?? image.uri;

const retryAtOf = (record: AssetRecord | null) => (record?.kind === "retry" ? record.retryAt : null);

/** Whether a remembered outcome still stands for the photo as discovered now. */
function isSettled(record: AssetRecord | undefined, asset: PhotoAssetMetadata) {
  if (!record || record.kind === "retry") return false;
  // The server holds this asset's identity, so sending it again can only be answered as a duplicate.
  if (record.kind === "saved" || record.kind === "duplicate") return true;
  return record.modificationTime === asset.modificationTime;
}

export function createSlipScanSession(ports: SlipScanPorts) {
  const listeners = new Set<() => void>();
  /** Per account, the sign-in session the server rejected with 401. Sending resumes once a different one is used. */
  const rejectedSessions = new Map<string, string | null>();
  /** Per account, photos being imported, including by a paused round whose requests are still settling. */
  const inFlight = new Map<string, Map<string, Promise<void>>>();
  const deadlines = { ...DEFAULT_DEADLINES, ...ports.deadlines };
  const memory = createScanMemory(ports.store, (event, cause) => log(event, { error: errorName(cause) }));
  let state: SlipScanState = { scanning: false, access: null, lastRound: null };
  type ActiveRound = {
    accountId: string;
    sessionId: string | null;
    /** Aborted to stop scheduling further photos. */
    schedule: AbortController;
    /** Aborted to also cancel requests in flight. */
    requests: AbortController;
    round: ScanRound;
    done: Promise<ScanRound>;
  };
  /** The round Home shows. Only this round may change the display state. */
  let current: ActiveRound | null = null;
  /** Every round not yet finished, including paused ones whose requests are still settling. */
  const unfinished = new Set<ActiveRound>();

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

  async function run(entry: ActiveRound): Promise<ScanRound> {
    const { round } = entry;
    const { accountId } = round;
    const signal = entry.schedule.signal;
    const account = await memory.open(accountId);
    const { records } = account;
    const busy = inFlight.get(accountId) ?? new Map<string, Promise<void>>();
    inFlight.set(accountId, busy);
    const halted = () => round.status === "unauthorized" || round.status === "no-access";
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

    function importAsset(asset: PhotoAssetMetadata) {
      const task = attemptImport(asset).finally(() => {
        if (busy.get(asset.id) === task) busy.delete(asset.id);
      });
      busy.set(asset.id, task);
      return task;
    }

    async function attemptImport(asset: PhotoAssetMetadata) {
      const { id: assetId, modificationTime } = asset;
      let reference: string;
      let upload: Awaited<ReturnType<typeof prepareSlipUpload>>;
      try {
        [reference, upload] = await withinDeadline(
          (async () => {
            const original = await ports.readOriginal(assetId);
            return [referenceOf(original), await prepareSlipUpload(original, ports.shrink)] as const;
          })(),
          deadlines.read
        );
      } catch (cause) {
        const code = cause instanceof SlipImageError ? cause.code : "UNREADABLE_IMAGE";
        if (!(cause instanceof SlipImageError)) log("read-failed", errorDetail(cause));
        const rejected: AssetRecord = { kind: "rejected", code, status: null, modificationTime };
        // A photo that could not be read may be readable later, for example once it has downloaded to the device.
        const retry = code === "UNREADABLE_IMAGE" ? retryLater(asset, { code, status: null }, null) : null;
        const record = retry && retry.attempts < UNREADABLE_ATTEMPT_LIMIT ? retry : rejected;
        fail({ assetId, kind: "image", code, status: null, retryAfter: null, retryAt: retryAtOf(record) }, record);
        return;
      }

      let outcome;
      try {
        // Pausing lets this request finish; only cancelling aborts it.
        outcome = await ports.send({ assetId, ...upload }, entry.requests.signal);
      } catch (cause) {
        const error =
          cause instanceof AutoImportRequestError ? cause : new AutoImportRequestError({ kind: "network", cause });
        const { code, status } = error;
        if (error.kind === "network") log("send-failed", errorDetail(error.cause));
        let record: AssetRecord | null;
        if (status === 401 || error.kind === "cancelled") {
          // Neither says anything about this photo: it stays eligible. A cancelled request may still have been saved,
          // and the server answers the next attempt for this asset ID as a duplicate.
          record = null;
          if (status === 401) {
            round.status = "unauthorized";
            rejectedSessions.set(accountId, entry.sessionId);
          }
        } else if (isRejectedStatus(status)) {
          record = { kind: "rejected", code, status, modificationTime };
        } else {
          // 429, 5xx, network failures, timeouts and unreadable answers. The last three may have been saved: the retry
          // reuses the asset ID, so the server answers it as a duplicate.
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
      await bind(assetId, outcome.transactionId, reference);
      requestRefresh();
    }

    /**
     * Link the local photo to its saved transaction. The transaction is saved on the server either way: a failure here
     * never undoes or repeats that, and the remembered transaction ID lets a later round try again.
     */
    async function bind(assetId: string, transactionId: string, reference?: string) {
      try {
        const lasting = reference ?? referenceOf(await withinDeadline(ports.readOriginal(assetId), deadlines.read));
        await ports.bindImage(accountId, transactionId, lasting);
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
      // Reading starts only past the permission and sign-in gates, so a round with nothing it may do never shows it.
      if (current === entry) setState({ scanning: true });
      const { assets } = await withinDeadline(discoverSlipPhotos(ports, ports.now()), deadlines.discovery);
      round.discovered = assets.length;
      account.retain(new Set(assets.map((asset) => asset.id)), ports.now());
      const startedAt = ports.now();
      const unbound = assets.flatMap(({ id: assetId }) => {
        const record = records.get(assetId);
        return record?.kind === "saved" && !record.bound ? [{ assetId, transactionId: record.transactionId }] : [];
      });
      /** Photos a paused round is still importing: this round waits for their answers instead of sending them again. */
      const joined: Promise<void>[] = [];
      const queue = assets.filter((asset) => {
        const importing = busy.get(asset.id);
        if (importing) {
          joined.push(importing);
          return false;
        }
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
        while (queue.length && !signal.aborted && !halted()) {
          // Access can be narrowed while the app stays open: no further photo is read once it is.
          const access = await ports.photoAccess();
          if (access !== "all") {
            round.status = "no-access";
            if (current === entry) setState({ access });
          }
          const asset = queue.shift();
          if (!asset || signal.aborted || halted()) return;
          await importAsset(asset);
        }
      };
      await Promise.all(Array.from({ length: MAX_CONCURRENT_IMPORTS }, worker));
      await Promise.allSettled(joined);
      if (!halted()) {
        await repairBindings(unbound);
        await resolveDuplicates(assets);
      }
      if (!halted()) {
        round.status = entry.requests.signal.aborted ? "cancelled" : signal.aborted ? "paused" : "completed";
      }
    } catch (cause) {
      round.status = "error";
      log("scan-failed", { error: errorName(cause) });
    }
    await Promise.all([
      refreshing && withinDeadline(refreshing, deadlines.refresh).catch(() => log("refresh-timeout", {})),
      account.flush(),
    ]);
    return round;
  }

  /** Stop the displayed round and release Home's reading state at once; its own late finish changes nothing shown. */
  function detach() {
    const entry = current;
    if (!entry) return;
    current = null;
    entry.schedule.abort();
    if (state.scanning) setState({ scanning: false });
  }

  function abortRounds(rounds: Iterable<ActiveRound>) {
    for (const entry of rounds) {
      entry.schedule.abort();
      entry.requests.abort();
    }
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
      if (current?.accountId === accountId) return current.done;
      // Another account's work stops entirely: its requests carry the previous sign-in.
      abortRounds([...unfinished].filter((entry) => entry.accountId !== accountId));
      detach();
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
      const entry: ActiveRound = {
        accountId,
        sessionId,
        schedule: new AbortController(),
        requests: new AbortController(),
        round,
        done: Promise.resolve(round),
      };
      entry.requests.signal.addEventListener("abort", () => entry.schedule.abort(), { once: true });
      current = entry;
      unfinished.add(entry);
      entry.done = run(entry).finally(() => {
        unfinished.delete(entry);
        log("round", {
          trigger,
          status: round.status,
          discovered: round.discovered,
          created: round.created,
          skipped: round.skipped,
          failed: round.failed,
          // Counts per `kind:code-or-status`, so a device log shows why photos failed without their IDs.
          failures: countFailures(round.failures),
        });
        if (current !== entry) return;
        current = null;
        setState({ scanning: false, lastRound: round });
      });
      return entry.done;
    },
    /**
     * Forget what this device remembers about the account's photos, for when its ledger data is erased and the server
     * no longer holds their identity.
     */
    async forget(accountId: string) {
      if (current?.accountId === accountId) detach();
      abortRounds([...unfinished].filter((entry) => entry.accountId === accountId));
      await memory.forget(accountId);
    },
    /**
     * Stop scheduling further photos, for when Home is left or the app is no longer active. Requests already sent are
     * allowed to finish and their results are kept; the next request resumes the rest and waits for those answers.
     */
    pause: detach,
    /**
     * Stop every round and abort requests in flight, for signing out. An aborted request may still have been saved:
     * the next attempt for its asset ID is answered as a duplicate.
     */
    cancel() {
      detach();
      abortRounds(unfinished);
    },
  };
}

export type SlipScanSession = ReturnType<typeof createSlipScanSession>;

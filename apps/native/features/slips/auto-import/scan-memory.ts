/**
 * What this device remembers about each photo, per account: never photo bytes, local URIs, session data or model output.
 * The server's asset identity stays authoritative; losing this memory only costs requests the server answers as duplicates.
 */
export type AssetRecord =
  /** A ledger row exists for this asset. `bound` records whether the local photo is linked to it yet. */
  | { kind: "saved"; transactionId: string; bound: boolean }
  /** The server already holds this asset's identity. `resolved` once the ledger was searched for its row. */
  | { kind: "duplicate"; resolved: boolean; modificationTime: number | null }
  | { kind: "skipped"; reason: "no_candidate" | "incomplete_candidate"; modificationTime: number | null }
  /** Input the server or device rejected; sent again only if the asset itself changes. */
  | { kind: "rejected"; code: string | null; status: number | null; modificationTime: number | null }
  | {
      kind: "retry";
      attempts: number;
      retryAt: number;
      code: string | null;
      status: number | null;
      modificationTime: number | null;
    };

/** Raw text persisted per account, such as one file per account on the device. */
export interface ScanMemoryStorage {
  read(accountId: string): Promise<string | null>;
  write(accountId: string, text: string): Promise<void>;
}

const FORMAT = 1;
const text = (value: unknown) => typeof value === "string" && value.length > 0;
const nullableText = (value: unknown) => value === null || typeof value === "string";
const nullableNumber = (value: unknown) => value === null || time(value);
const time = (value: unknown) => typeof value === "number" && Number.isFinite(value);
const count = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value >= 0;

function isRecord(value: unknown): value is AssetRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  switch (record.kind) {
    case "saved":
      return text(record.transactionId) && typeof record.bound === "boolean";
    case "duplicate":
      return typeof record.resolved === "boolean" && nullableNumber(record.modificationTime);
    case "skipped":
      return (
        (record.reason === "no_candidate" || record.reason === "incomplete_candidate") &&
        nullableNumber(record.modificationTime)
      );
    case "rejected":
      return nullableText(record.code) && nullableNumber(record.status) && nullableNumber(record.modificationTime);
    case "retry":
      return (
        count(record.attempts) &&
        time(record.retryAt) &&
        nullableText(record.code) &&
        nullableNumber(record.status) &&
        nullableNumber(record.modificationTime)
      );
    default:
      return false;
  }
}

function parse(stored: string | null): Map<string, AssetRecord> {
  const records = new Map<string, AssetRecord>();
  if (!stored) return records;
  const parsed: unknown = JSON.parse(stored);
  if (!parsed || typeof parsed !== "object" || (parsed as { format?: unknown }).format !== FORMAT) return records;
  const assets = (parsed as { assets?: unknown }).assets;
  if (!assets || typeof assets !== "object" || Array.isArray(assets)) return records;
  // Unrecognized entries are dropped: at worst the server is asked again and answers by asset identity.
  for (const [assetId, record] of Object.entries(assets)) if (assetId && isRecord(record)) records.set(assetId, record);
  return records;
}

/** Per-account records loaded once, with writes coalesced so the latest state is persisted after each change. */
export function createScanMemory(storage: ScanMemoryStorage, onError: (event: string, cause: unknown) => void) {
  const accounts = new Map<string, Promise<AccountMemory>>();

  function load(accountId: string): Promise<AccountMemory> {
    const records = storage
      .read(accountId)
      .then(parse)
      .catch((cause) => {
        onError("memory-read-failed", cause);
        return new Map<string, AssetRecord>();
      });
    return records.then((loaded) => accountMemory(accountId, loaded));
  }

  /** `ready` holds back the first write, so earlier records for this account cannot land after it. */
  function accountMemory(
    accountId: string,
    records: Map<string, AssetRecord>,
    ready: Promise<unknown> = Promise.resolve()
  ): AccountMemory & { persist(): void } {
    let writing: Promise<void> | null = null;
    let dirty = false;
    let closed = false;

    async function drain() {
      // Yielding first also means `writing` is assigned before this can finish, even if storage fails synchronously.
      await ready;
      while (dirty) {
        dirty = false;
        try {
          await storage.write(accountId, JSON.stringify({ format: FORMAT, assets: Object.fromEntries(records) }));
        } catch (cause) {
          // The records stay correct in memory for this app run; a later change writes them again.
          onError("memory-write-failed", cause);
        }
      }
      // Cleared in the same step as the last `dirty` check, so no change can land between them unwritten.
      writing = null;
    }

    async function flush() {
      while (writing) await writing;
    }

    function persist() {
      if (closed) return;
      dirty = true;
      writing ??= drain();
    }

    return {
      persist,
      records: records as ReadonlyMap<string, AssetRecord>,
      set(assetId, record) {
        if (closed) return;
        records.set(assetId, record);
        persist();
      },
      retain(assetIds, now) {
        const before = records.size;
        for (const [assetId, record] of records) {
          // A photo still waiting to be retried keeps its wait, in case discovery only missed it briefly.
          if (assetIds.has(assetId) || (record.kind === "retry" && record.retryAt > now)) continue;
          records.delete(assetId);
        }
        if (records.size !== before) persist();
      },
      flush,
      async close() {
        // Refuse changes first, so nothing starts a write after the one being awaited.
        closed = true;
        await flush();
      },
    };
  }

  return {
    /** The account's records, loaded from storage on first use. Unreadable storage starts empty. */
    open(accountId: string): Promise<AccountMemory> {
      let account = accounts.get(accountId);
      if (!account) accounts.set(accountId, (account = load(accountId)));
      return account;
    },
    /**
     * Replace the account's records with empty ones. Rounds still holding the previous records can no longer write,
     * so a request that settles afterwards cannot bring back what was forgotten.
     */
    async forget(accountId: string) {
      const closing = accounts.get(accountId)?.then((previous) => previous.close());
      const fresh = accountMemory(accountId, new Map(), closing);
      accounts.set(accountId, Promise.resolve(fresh));
      fresh.persist();
      await fresh.flush();
    },
  };
}

export interface AccountMemory {
  readonly records: ReadonlyMap<string, AssetRecord>;
  set(assetId: string, record: AssetRecord): void;
  /** Forget assets discovery no longer finds, such as photos older than the scan window. */
  retain(assetIds: ReadonlySet<string>, now: number): void;
  /** Wait until what has been set so far is persisted, or has failed to be. */
  flush(): Promise<void>;
  /** Persist pending changes, then ignore any further ones. */
  close(): Promise<void>;
}

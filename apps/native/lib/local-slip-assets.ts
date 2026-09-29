import { File, Paths } from "expo-file-system";

import type { FinanceTransaction } from "@/types/finance";

const FILE_PREFIX = "moojot-slip-assets-v1";
const webImages = new Map<string, string>();
const nativeImages = new Map<string, Record<string, string>>();
const loads = new Map<string, Promise<Record<string, string>>>();
const pending = new Map<string, Promise<void>>();

function imageKey(userId: string, transactionId: string): string {
  if (!userId || !transactionId) throw new Error("Guest and transaction IDs are required");
  return `${userId}:${transactionId}`;
}

function fileFor(userId: string): File {
  if (!userId) throw new Error("Guest ID is required");
  return new File(Paths.document, `${FILE_PREFIX}.${userId}.json`);
}

function localUri(uri: string | null | undefined): string | null {
  const value = uri?.trim();
  if (!value) return null;
  const scheme = value.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  if (process.env.EXPO_OS === "web") return scheme === "blob" ? value : null;
  return scheme && ["file", "content", "ph", "assets-library", "asset"].includes(scheme) ? value : null;
}

async function imagesFor(userId: string): Promise<Record<string, string>> {
  const cached = nativeImages.get(userId);
  if (cached) return cached;
  let loading = loads.get(userId);
  if (!loading) {
    loading = (async () => {
      const file = fileFor(userId);
      if (!file.exists) return {};
      try {
        const parsed: unknown = JSON.parse(await file.text());
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
        return Object.fromEntries(
          Object.entries(parsed).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string" && !!localUri(entry[1])
          )
        );
      } catch {
        return {};
      }
    })();
    loads.set(userId, loading);
  }
  try {
    const images = await loading;
    nativeImages.set(userId, images);
    return images;
  } finally {
    loads.delete(userId);
  }
}

function enqueue(userId: string, operation: () => Promise<void>): Promise<void> {
  const previous = pending.get(userId) ?? Promise.resolve();
  const current = previous.catch(() => {}).then(operation);
  pending.set(userId, current);
  void current
    .finally(() => {
      if (pending.get(userId) === current) pending.delete(userId);
    })
    .catch(() => {});
  return current;
}

/** Keep device-only image references out of server finance records. */
export function setLocalSlipImage(
  userId: string,
  transactionId: string,
  uri: string | null | undefined
): Promise<void> {
  const key = imageKey(userId, transactionId);
  const value = localUri(uri);
  if (process.env.EXPO_OS === "web") {
    if (value) webImages.set(key, value);
    else webImages.delete(key);
    return Promise.resolve();
  }
  return enqueue(userId, async () => {
    const images = await imagesFor(userId);
    if (value) images[transactionId] = value;
    else delete images[transactionId];
    const file = fileFor(userId);
    if (!file.exists) file.create();
    file.write(JSON.stringify(images));
  });
}

export async function getLocalSlipImage(userId: string, transactionId: string): Promise<string | null> {
  const key = imageKey(userId, transactionId);
  if (process.env.EXPO_OS === "web") return webImages.get(key) ?? null;
  await pending.get(userId)?.catch(() => {});
  return localUri((await imagesFor(userId))[transactionId]);
}

export async function withLocalSlipImage(userId: string, transaction: FinanceTransaction): Promise<FinanceTransaction> {
  return {
    ...transaction,
    slipImageUri: transaction.source === "slip" ? await getLocalSlipImage(userId, transaction.id) : null,
  };
}

export async function withLocalSlipImages(
  userId: string,
  transactions: FinanceTransaction[]
): Promise<FinanceTransaction[]> {
  return Promise.all(transactions.map((transaction) => withLocalSlipImage(userId, transaction)));
}

export function clearLocalSlipImages(userId: string): Promise<void> {
  if (process.env.EXPO_OS === "web") {
    for (const key of webImages.keys()) {
      if (key.startsWith(`${userId}:`)) webImages.delete(key);
    }
    return Promise.resolve();
  }
  return enqueue(userId, async () => {
    const file = fileFor(userId);
    if (file.exists) file.delete();
    nativeImages.delete(userId);
    loads.delete(userId);
  });
}

export async function getExistingLocalSlipUris(userId: string): Promise<Set<string>> {
  if (process.env.EXPO_OS === "web") {
    return new Set(
      Array.from(webImages.entries())
        .filter(([key]) => key.startsWith(`${userId}:`))
        .map(([, uri]) => uri)
    );
  }
  const images = await imagesFor(userId);
  return new Set(Object.values(images));
}

import { Directory, File, Paths } from "expo-file-system";
import { copyAsync } from "expo-file-system/legacy";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Asset } from "expo-media-library";
import { useSyncExternalStore } from "react";

import { entriesQueryOptions } from "@/features/entries/query-options";
import { nativePhotoLibrary, readPhotoAccess } from "@/features/slips/library-scan";
import { setLocalSlipImage } from "@/lib/local-slip-assets";
import { client, orpc, queryClient, rpcFetch, rpcHeaders } from "@/utils/orpc";
import { getServerBaseUrl } from "@/utils/server-url";

import { createHomeScan } from "./home-scan";
import { MAX_IMAGE_BYTES, type LocalImage } from "./image";
import { createImportedTransactionLookup } from "./ledger-identity";
import { createSlipScanSession } from "./scan-session";
import { createAutoImportTransport } from "./transport";

function localImage(uri: string): LocalImage {
  const file = new File(uri);
  return {
    uri,
    byteLength: file.size,
    header: async () => {
      const handle = file.open();
      try {
        return handle.readBytes(16);
      } finally {
        handle.close();
      }
    },
    base64: () => file.base64(),
  };
}

const originalsDirectory = new Directory(Paths.cache, "slip-originals");

/**
 * The photo's current bytes. On iOS, the file behind `Asset.getUri()` can only be read while the Photos request that
 * located it is open, so the photo is copied into the cache through the Photos library instead, one file per asset,
 * and the transaction keeps the lasting `ph://` reference.
 */
async function readOriginal(assetId: string): Promise<LocalImage> {
  if (process.env.EXPO_OS !== "ios") return localImage(await new Asset(assetId).getUri());
  const reference = `ph://${assetId}`;
  if (!originalsDirectory.exists) originalsDirectory.create({ intermediates: true });
  const copy = new File(originalsDirectory, encodeURIComponent(assetId));
  if (copy.exists) copy.delete();
  await copyAsync({ from: reference, to: copy.uri });
  return { ...localImage(copy.uri), reference };
}

/** Re-encode as JPEG, reducing dimensions only as far as needed to fit the upload limit. */
async function shrink(image: LocalImage): Promise<LocalImage> {
  const original = await ImageManipulator.manipulate(image.uri).renderAsync();
  for (const width of [original.width, 2400, 2000, 1600]) {
    if (width > original.width) continue;
    const context = ImageManipulator.manipulate(image.uri);
    if (width < original.width) context.resize({ width });
    const saved = await (await context.renderAsync()).saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
    const result = localImage(saved.uri);
    if (result.byteLength <= MAX_IMAGE_BYTES) return result;
  }
  throw new Error("Image cannot be reduced below the upload limit");
}

/** One file per account: outcomes, retry times and transaction IDs by asset ID, never photo data or session details. */
const scanMemoryFile = (accountId: string) =>
  new File(Paths.document, `moojot-slip-scan-v1.${encodeURIComponent(accountId)}.json`);

export const slipScanSession = createSlipScanSession({
  now: () => Date.now(),
  store: {
    async read(accountId) {
      const file = scanMemoryFile(accountId);
      return file.exists ? file.text() : null;
    },
    async write(accountId, text) {
      const file = scanMemoryFile(accountId);
      if (!file.exists) file.create();
      file.write(text);
    },
  },
  ...nativePhotoLibrary,
  photoAccess: readPhotoAccess,
  readOriginal,
  shrink,
  send: createAutoImportTransport({
    baseUrl: getServerBaseUrl,
    fetch: (request, init) => rpcFetch(request, init) as unknown as Promise<Response>,
    headers: rpcHeaders,
  }),
  findImportedTransactions: createImportedTransactionLookup((input, options) =>
    client.ledger.listTransactions(input, options)
  ),
  bindImage: setLocalSlipImage,
  async refreshLedger() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: orpc.ledger.key() }),
      queryClient.invalidateQueries({ queryKey: orpc.analytics.key() }),
      queryClient.invalidateQueries({ queryKey: entriesQueryOptions.pendingCategories().queryKey }),
    ]);
  },
  log(event, detail) {
    // Counts, statuses and codes only: never photo bytes, URIs, session data or model output.
    console.info("[slip-auto-import]", event, detail);
  },
});

/** When Home reads slips, and what it shows while it does. */
export const homeScan = createHomeScan(slipScanSession);

export function useHomeScanDisplay() {
  return useSyncExternalStore(homeScan.subscribe, homeScan.getState);
}

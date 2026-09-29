import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Album, Asset, AssetField, MediaType, Query, getPermissionsAsync } from "expo-media-library";
import { useSyncExternalStore } from "react";

import { entriesQueryOptions } from "@/features/entries/query-options";
import { accessStatus } from "@/features/slips/library-scan";
import { setLocalSlipImage } from "@/lib/local-slip-assets";
import { orpc, queryClient, rpcFetch, rpcHeaders } from "@/utils/orpc";
import { getServerBaseUrl } from "@/utils/server-url";

import { MAX_IMAGE_BYTES, type LocalImage } from "./image";
import { createSlipScanSession, type PhotoAccess } from "./scan-session";
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

export const slipScanSession = createSlipScanSession({
  now: () => Date.now(),
  async photoAccess(): Promise<PhotoAccess> {
    if (process.env.EXPO_OS !== "ios" && process.env.EXPO_OS !== "android") return "unsupported";
    return accessStatus(await getPermissionsAsync(false, ["photo"]));
  },
  async albums() {
    return Promise.all((await Album.getAll()).map(async (album) => ({ key: album.id, title: await album.getTitle() })));
  },
  async pageAssets(albumKey, { from, to, offset, limit }) {
    const assets = await new Query()
      .album(new Album(albumKey))
      .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
      .gte(AssetField.CREATION_TIME, from)
      .lte(AssetField.CREATION_TIME, to)
      .orderBy({ key: AssetField.CREATION_TIME, ascending: false })
      .limit(limit)
      .offset(offset)
      .exeForMetadata();
    return assets.map((asset) => ({ id: asset.id, creationTime: asset.creationTime }));
  },
  readOriginal: async (assetId) => localImage(await new Asset(assetId).getUri()),
  shrink,
  send: createAutoImportTransport({
    baseUrl: getServerBaseUrl,
    fetch: (request, init) => rpcFetch(request, init) as unknown as Promise<Response>,
    headers: rpcHeaders,
  }),
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

export function useSlipScanState() {
  return useSyncExternalStore(slipScanSession.subscribe, slipScanSession.getState);
}

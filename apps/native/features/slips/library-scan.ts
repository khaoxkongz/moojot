import {
  Album,
  AssetField,
  MediaType,
  Query,
  getPermissionsAsync,
  requestPermissionsAsync,
  type PermissionResponse,
} from "expo-media-library";

import { countSlipPhotos, type PhotoLibrary, type SlipAlbumCounts } from "./auto-import/discovery";
import type { PhotoAccess } from "./auto-import/photo-access";

export { slipAlbumSources, type SlipAlbumSourceId } from "./auto-import/albums";
export type { SlipAlbumCounts } from "./auto-import/discovery";

export type SlipAlbumScanResult =
  | {
      status: "complete";
      counts: SlipAlbumCounts;
      total: number;
      matchedAlbums: number;
    }
  | { status: Exclude<PhotoAccess, "all"> };

const hasPhotoLibrary = () => process.env.EXPO_OS === "ios" || process.env.EXPO_OS === "android";

function accessStatus(permission: PermissionResponse): Exclude<PhotoAccess, "unsupported"> {
  if (permission.accessPrivileges === "limited") return "limited";
  if (permission.granted && permission.accessPrivileges !== "none") return "all";
  return permission.status === "undetermined" ? "permission-required" : "denied";
}

/** The current photo permission. Never shows a system prompt. */
export async function readPhotoAccess(): Promise<PhotoAccess> {
  if (!hasPhotoLibrary()) return "unsupported";
  return accessStatus(await getPermissionsAsync(false, ["photo"]));
}

/** Show the system photo prompt, only in response to the person's own action and only while it can still appear. */
export async function requestPhotoAccess(): Promise<PhotoAccess> {
  const current = await readPhotoAccess();
  if (current !== "permission-required") return current;
  return accessStatus(await requestPermissionsAsync(false, ["photo"]));
}

export const nativePhotoLibrary: PhotoLibrary = {
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
    return assets.map((asset) => ({
      id: asset.id,
      creationTime: asset.creationTime,
      modificationTime: asset.modificationTime,
    }));
  },
};

/**
 * Onboarding's count of image metadata in supported albums. Nothing is read, sent to AI or saved: Home does that.
 */
export async function scanSlipAlbums(requestPermission = false): Promise<SlipAlbumScanResult> {
  const status = requestPermission ? await requestPhotoAccess() : await readPhotoAccess();
  if (status !== "all") {
    console.info("[slip-album-scan]", { status });
    return { status };
  }
  const result: SlipAlbumScanResult = {
    status: "complete",
    ...(await countSlipPhotos(nativePhotoLibrary, Date.now())),
  };
  console.info("[slip-album-scan]", result);
  return result;
}

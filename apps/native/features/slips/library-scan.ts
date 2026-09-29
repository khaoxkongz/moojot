import {
  Album,
  AssetField,
  MediaType,
  Query,
  getPermissionsAsync,
  requestPermissionsAsync,
  type PermissionResponse,
} from "expo-media-library";

import { dayInMilliseconds, slipLookbackDays, sourceForAlbum, type SlipAlbumSourceId } from "./auto-import/albums";

export { slipAlbumSources, type SlipAlbumSourceId } from "./auto-import/albums";

export type SlipAlbumCounts = Record<SlipAlbumSourceId, number>;

export type SlipAlbumScanResult =
  | {
      status: "complete";
      counts: SlipAlbumCounts;
      total: number;
      matchedAlbums: number;
    }
  | { status: "permission-required" | "denied" | "limited" | "unsupported" };

export function accessStatus(
  permission: PermissionResponse
): Exclude<SlipAlbumScanResult["status"], "complete"> | "all" {
  if (permission.accessPrivileges === "limited") return "limited";
  if (permission.granted && permission.accessPrivileges !== "none") return "all";
  return permission.status === "undetermined" ? "permission-required" : "denied";
}

/** Count image metadata in supported albums. Photo pixels never leave the device. */
export async function scanSlipAlbums(
  trigger: "onboarding" | "home",
  requestPermission = false
): Promise<SlipAlbumScanResult> {
  if (process.env.EXPO_OS !== "ios" && process.env.EXPO_OS !== "android") {
    return { status: "unsupported" };
  }

  let permission = await getPermissionsAsync(false, ["photo"]);
  if (requestPermission && accessStatus(permission) !== "all" && permission.canAskAgain) {
    permission = await requestPermissionsAsync(false, ["photo"]);
  }

  const status = accessStatus(permission);
  if (status !== "all") {
    console.info("[slip-album-scan]", { trigger, status });
    return { status };
  }

  const now = Date.now();
  const cutoff = now - slipLookbackDays * dayInMilliseconds;
  const albums = await Album.getAll();
  const namedAlbums = await Promise.all(
    albums.map(async (album) => ({ album, source: sourceForAlbum(await album.getTitle()) }))
  );
  const matched = namedAlbums.filter(
    (item): item is { album: Album; source: SlipAlbumSourceId } => item.source !== null
  );
  const idsBySource: Record<SlipAlbumSourceId, Set<string>> = {
    krungthai: new Set(),
    kplus: new Set(),
    paotang: new Set(),
    truemoney: new Set(),
  };

  await Promise.all(
    matched.map(async ({ album, source }) => {
      const pageSize = 200;
      let offset = 0;
      while (true) {
        const assets = await new Query()
          .album(album)
          .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
          .gte(AssetField.CREATION_TIME, cutoff)
          .lte(AssetField.CREATION_TIME, now)
          .orderBy({ key: AssetField.CREATION_TIME, ascending: false })
          .limit(pageSize)
          .offset(offset)
          .exeForMetadata();
        for (const asset of assets) idsBySource[source].add(asset.id);
        if (assets.length < pageSize) break;
        offset += pageSize;
      }
    })
  );

  const counts: SlipAlbumCounts = {
    krungthai: idsBySource.krungthai.size,
    kplus: idsBySource.kplus.size,
    paotang: idsBySource.paotang.size,
    truemoney: idsBySource.truemoney.size,
  };
  const total = new Set(Object.values(idsBySource).flatMap((ids) => [...ids])).size;
  const result: SlipAlbumScanResult = {
    status: "complete",
    counts,
    total,
    matchedAlbums: matched.length,
  };

  console.info("[slip-album-scan]", { trigger, ...result });
  return result;
}

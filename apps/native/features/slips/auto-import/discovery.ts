import {
  dayInMilliseconds,
  slipAlbumSources,
  slipLookbackDays,
  sourceForAlbum,
  type SlipAlbumSourceId,
} from "./albums";

export interface PhotoAssetMetadata {
  id: string;
  creationTime: number | null;
  /** Changes when the photo itself is edited, which makes a rejected or skipped photo worth reading again. */
  modificationTime: number | null;
}

/** Album and image metadata only: discovery never reads photo contents. */
export interface PhotoLibrary {
  albums(): Promise<{ key: string; title: string }[]>;
  /** One page of image metadata from an album, newest first, filtered by asset creation time. */
  pageAssets(
    albumKey: string,
    query: { from: number; to: number; offset: number; limit: number }
  ): Promise<PhotoAssetMetadata[]>;
  pageSize?: number;
}

export type DiscoveredPhoto = PhotoAssetMetadata & { sources: Set<SlipAlbumSourceId> };

export type SlipAlbumCounts = Record<SlipAlbumSourceId, number>;

/**
 * Every image created in the last 30 days in a supported bank album, once per asset ID, newest first. Other albums
 * are never queried, whatever the photo permission allows.
 */
export async function discoverSlipPhotos(
  library: PhotoLibrary,
  now: number
): Promise<{ assets: DiscoveredPhoto[]; matchedAlbums: number }> {
  const pageSize = library.pageSize ?? 200;
  const from = now - slipLookbackDays * dayInMilliseconds;
  const albums = (await library.albums()).flatMap((album) => {
    const source = sourceForAlbum(album.title);
    return source ? [{ key: album.key, source }] : [];
  });
  const found = new Map<string, DiscoveredPhoto>();
  await Promise.all(
    albums.map(async ({ key, source }) => {
      for (let offset = 0; ; offset += pageSize) {
        const page = await library.pageAssets(key, { from, to: now, offset, limit: pageSize });
        for (const asset of page) {
          if (!asset.id) continue;
          const known = found.get(asset.id);
          if (known) known.sources.add(source);
          else found.set(asset.id, { ...asset, sources: new Set([source]) });
        }
        if (page.length < pageSize) break;
      }
    })
  );
  return {
    assets: [...found.values()].sort((a, b) => (b.creationTime ?? 0) - (a.creationTime ?? 0)),
    matchedAlbums: albums.length,
  };
}

/**
 * Onboarding's count of photos found per bank and in total. These are photos, not slips or transactions: nothing is
 * read, sent or saved here.
 */
export async function countSlipPhotos(
  library: PhotoLibrary,
  now: number
): Promise<{ counts: SlipAlbumCounts; total: number; matchedAlbums: number }> {
  const { assets, matchedAlbums } = await discoverSlipPhotos(library, now);
  const counts = Object.fromEntries(slipAlbumSources.map((source) => [source.id, 0])) as SlipAlbumCounts;
  for (const asset of assets) for (const source of asset.sources) counts[source]++;
  return { counts, total: assets.length, matchedAlbums };
}

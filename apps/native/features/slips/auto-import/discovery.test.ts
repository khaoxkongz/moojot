import { describe, expect, it } from "vite-plus/test";

import { countSlipPhotos, discoverSlipPhotos, type PhotoLibrary } from "./discovery";

const day = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 8, 29, 12);

function library(photos: { id: string; album: string; ageDays: number }[], albums: string[]) {
  const queries: { album: string; from: number; to: number; offset: number }[] = [];
  const photoLibrary: PhotoLibrary = {
    pageSize: 2,
    albums: async () => albums.map((title) => ({ key: `key:${title}`, title })),
    pageAssets: async (albumKey, query) => {
      const album = albumKey.slice(4);
      queries.push({ album, from: query.from, to: query.to, offset: query.offset });
      return photos
        .filter((photo) => photo.album === album)
        .map((photo) => ({ id: photo.id, creationTime: now - photo.ageDays * day, modificationTime: null }))
        .filter((asset) => asset.creationTime >= query.from && asset.creationTime <= query.to)
        .sort((a, b) => b.creationTime - a.creationTime)
        .slice(query.offset, query.offset + query.limit);
    },
  };
  return { photoLibrary, queries };
}

describe("slip photo discovery", () => {
  it("counts photos per supported source and in total by unique asset ID over the last 30 days", async () => {
    const { photoLibrary, queries } = library(
      [
        { id: "k1", album: "Krungthai NEXT", ageDays: 1 },
        { id: "k2", album: "Krungthai NEXT", ageDays: 2 },
        { id: "k3", album: "Krungthai NEXT", ageDays: 3 },
        { id: "shared", album: "K PLUS", ageDays: 1 },
        { id: "shared", album: "เป๋าตัง", ageDays: 1 },
        { id: "old", album: "TrueMoney", ageDays: 31 },
        { id: "camera", album: "Camera Roll", ageDays: 1 },
      ],
      ["Krungthai NEXT", "K PLUS", "เป๋าตัง", "TrueMoney", "Camera Roll"]
    );

    const result = await countSlipPhotos(photoLibrary, now);

    expect(result).toEqual({
      counts: { krungthai: 3, kplus: 1, paotang: 1, truemoney: 0 },
      total: 4,
      matchedAlbums: 4,
    });
    expect(queries.some((query) => query.album === "Camera Roll")).toBe(false);
    expect(queries.every((query) => query.from === now - 30 * day && query.to === now)).toBe(true);
    // Every page is read, not just the first.
    expect(queries.filter((query) => query.album === "Krungthai NEXT").map((query) => query.offset)).toEqual([0, 2]);
  });

  it("reports when no supported album exists, rather than an empty count from a matched album", async () => {
    const { photoLibrary } = library([{ id: "camera", album: "Camera Roll", ageDays: 1 }], ["Camera Roll"]);

    expect(await countSlipPhotos(photoLibrary, now)).toEqual({
      counts: { krungthai: 0, kplus: 0, paotang: 0, truemoney: 0 },
      total: 0,
      matchedAlbums: 0,
    });
  });

  it("lists each discovered asset once, newest first, for the Home scan", async () => {
    const { photoLibrary } = library(
      [
        { id: "older", album: "Paotang", ageDays: 5 },
        { id: "shared", album: "K PLUS", ageDays: 2 },
        { id: "shared", album: "TrueMoney", ageDays: 2 },
        { id: "newest", album: "Krungthai NEXT", ageDays: 1 },
      ],
      ["Krungthai NEXT", "K PLUS", "Paotang", "TrueMoney"]
    );

    const { assets } = await discoverSlipPhotos(photoLibrary, now);

    expect(assets.map((asset) => asset.id)).toEqual(["newest", "shared", "older"]);
    expect(assets.find((asset) => asset.id === "shared")?.sources).toEqual(new Set(["kplus", "truemoney"]));
  });
});

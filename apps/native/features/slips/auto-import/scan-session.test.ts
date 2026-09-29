import { describe, expect, it } from "vite-plus/test";

import { MAX_IMAGE_BYTES } from "./image";
import { createSlipScanSession, type PhotoAccess, type SlipScanPorts } from "./scan-session";
import { AutoImportRequestError, type AutoImportInput, type AutoImportOutcome } from "./transport";

const day = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 8, 29, 12);
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46]);
const HEIC = Uint8Array.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]);

const base64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");

type Photo = { id: string; album: string; creationTime: number | null; bytes?: Uint8Array; size?: number };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

function harness(
  options: {
    photos?: Photo[];
    albums?: string[];
    access?: PhotoAccess;
    pageSize?: number;
    respond?: (input: AutoImportInput) => Promise<AutoImportOutcome> | AutoImportOutcome;
    bindImage?: SlipScanPorts["bindImage"];
    refreshLedger?: SlipScanPorts["refreshLedger"];
    shrink?: SlipScanPorts["shrink"];
    libraryError?: Error;
  } = {}
) {
  const photos = options.photos ?? [];
  const albums = options.albums ?? ["Krungthai NEXT", "K PLUS", "Paotang", "TrueMoney", "Camera Roll"];
  const sent: AutoImportInput[] = [];
  const bindings: { accountId: string; transactionId: string; uri: string }[] = [];
  const pageQueries: { album: string; from: number; to: number; offset: number }[] = [];
  let active = 0;
  let peak = 0;
  let refreshes = 0;
  let nextId = 1;

  const ports: SlipScanPorts = {
    pageSize: options.pageSize ?? 2,
    now: () => now,
    photoAccess: async () => options.access ?? "all",
    albums: async () => {
      if (options.libraryError) throw options.libraryError;
      return albums.map((title) => ({ key: title, title }));
    },
    pageAssets: async (album, query) => {
      pageQueries.push({ album, ...query });
      return photos
        .filter((photo) => photo.album === album)
        .filter((photo) => (photo.creationTime ?? 0) >= query.from && (photo.creationTime ?? 0) <= query.to)
        .sort((a, b) => (b.creationTime ?? 0) - (a.creationTime ?? 0))
        .slice(query.offset, query.offset + query.limit)
        .map(({ id, creationTime }) => ({ id, creationTime }));
    },
    readOriginal: async (assetId) => {
      const photo = photos.find((item) => item.id === assetId);
      if (!photo?.bytes) throw new Error("unreadable");
      const bytes = photo.bytes;
      return {
        uri: `file:///photos/${assetId}`,
        byteLength: photo.size ?? bytes.length,
        header: async () => bytes.slice(0, 16),
        base64: async () => base64(bytes),
      };
    },
    shrink:
      options.shrink ??
      (async (image) => ({
        uri: `${image.uri}.shrunk.jpg`,
        byteLength: JPEG.length,
        header: async () => JPEG,
        base64: async () => base64(JPEG),
      })),
    send: async (input) => {
      sent.push(input);
      active++;
      peak = Math.max(peak, active);
      try {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return options.respond
          ? await options.respond(input)
          : { status: "created", transactionId: `tx-${nextId++}`, warnings: [] };
      } finally {
        active--;
      }
    },
    bindImage:
      options.bindImage ??
      (async (accountId, transactionId, uri) => {
        bindings.push({ accountId, transactionId, uri });
      }),
    refreshLedger:
      options.refreshLedger ??
      (async () => {
        refreshes++;
      }),
  };
  return {
    session: createSlipScanSession(ports),
    sent,
    bindings,
    pageQueries,
    peak: () => peak,
    refreshes: () => refreshes,
  };
}

const photo = (id: string, album = "K PLUS", ageDays = 1, bytes: Uint8Array = PNG): Photo => ({
  id,
  album,
  creationTime: now - ageDays * day,
  bytes,
});

describe("slip scan session", () => {
  it("sends each supported-album photo from the last 30 days once and binds created transactions", async () => {
    const shared = photo("shared", "K PLUS");
    const { session, sent, bindings, pageQueries } = harness({
      photos: [
        photo("a", "Krungthai NEXT", 1, JPEG),
        photo("b", "Krungthai NEXT", 2),
        photo("c", "Krungthai NEXT", 3),
        shared,
        { ...shared, album: "Paotang" },
        photo("camera", "Camera Roll"),
        photo("old", "K PLUS", 31),
      ],
    });

    const round = await session.request({ accountId: "alice", trigger: "home" });

    expect(round).toMatchObject({ status: "completed", discovered: 4, created: 4, skipped: 0, failed: 0 });
    expect(sent.map((input) => input.assetId).sort()).toEqual(["a", "b", "c", "shared"]);
    expect(sent.find((input) => input.assetId === "a")).toEqual({
      assetId: "a",
      fileBase64: base64(JPEG),
      mimeType: "image/jpeg",
    });
    expect(sent.find((input) => input.assetId === "b")).toEqual({
      assetId: "b",
      fileBase64: base64(PNG),
      mimeType: "image/png",
    });
    expect(bindings).toHaveLength(4);
    expect(bindings.every((binding) => binding.accountId === "alice")).toBe(true);
    expect(bindings.find((binding) => binding.uri === "file:///photos/a")?.transactionId).toMatch(/^tx-/);
    expect(pageQueries.some((query) => query.album === "Camera Roll")).toBe(false);
    expect(pageQueries.filter((query) => query.album === "Krungthai NEXT").map((query) => query.offset)).toEqual([
      0, 2,
    ]);
    expect(pageQueries.every((query) => query.from === now - 30 * day && query.to === now)).toBe(true);
    expect(session.getState()).toMatchObject({ scanning: false });
  });

  it("matches existing album aliases without widening to other albums", async () => {
    const { session, sent } = harness({
      albums: ["กรุงไทย", "k-plus", "เป๋าตัง", "True Money", "Screenshots"],
      photos: [
        photo("kt", "กรุงไทย"),
        photo("kp", "k-plus"),
        photo("pt", "เป๋าตัง"),
        photo("tm", "True Money"),
        photo("ss", "Screenshots"),
      ],
    });
    await session.request({ accountId: "alice", trigger: "home" });
    expect(sent.map((input) => input.assetId).sort()).toEqual(["kp", "kt", "pt", "tm"]);
  });

  it("keeps processing after skipped and failed photos and counts each outcome separately", async () => {
    const { session, sent, bindings } = harness({
      photos: [
        { ...photo("unreadable", "K PLUS", 1), bytes: undefined },
        photo("heic", "K PLUS", 2, HEIC),
        photo("busy", "K PLUS", 3),
        photo("duplicate", "K PLUS", 4),
        photo("incomplete", "K PLUS", 5),
        photo("good", "K PLUS", 6),
      ],
      respond: (input) => {
        if (input.assetId === "busy") throw new AutoImportRequestError({ kind: "response", code: "BUSY", status: 429 });
        if (input.assetId === "duplicate") return { status: "skipped", reason: "duplicate", reasons: [], warnings: [] };
        if (input.assetId === "incomplete")
          return {
            status: "skipped",
            reason: "incomplete_candidate",
            reasons: [{ field: "amountSatang", code: "required_or_invalid" }],
            warnings: [],
          };
        return { status: "created", transactionId: "tx-good", warnings: [] };
      },
    });

    const round = await session.request({ accountId: "alice", trigger: "home" });

    expect(round).toMatchObject({ status: "completed", discovered: 6, created: 1, skipped: 2, failed: 3 });
    expect(sent.map((input) => input.assetId).sort()).toEqual(["busy", "duplicate", "good", "incomplete"]);
    expect(bindings).toEqual([{ accountId: "alice", transactionId: "tx-good", uri: "file:///photos/good" }]);
    expect(round.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ assetId: "busy", code: "BUSY", status: 429 }),
        expect.objectContaining({ assetId: "heic", code: "UNSUPPORTED_IMAGE" }),
        expect.objectContaining({ assetId: "unreadable", code: "UNREADABLE_IMAGE" }),
      ])
    );
  });

  it("does not immediately resend photos that already settled, but retries temporary failures on a later round", async () => {
    let busy = true;
    const { session, sent } = harness({
      photos: [photo("saved"), photo("skipped", "K PLUS", 2), photo("busy", "K PLUS", 3)],
      respond: (input) => {
        if (input.assetId === "skipped")
          return { status: "skipped", reason: "no_candidate", reasons: [], warnings: [] };
        if (input.assetId === "busy" && busy)
          throw new AutoImportRequestError({ kind: "response", code: "AI_RATE_LIMITED", status: 429, retryAfter: 60 });
        return { status: "created", transactionId: `tx-${input.assetId}`, warnings: [] };
      },
    });

    await session.request({ accountId: "alice", trigger: "home" });
    busy = false;
    const second = await session.request({ accountId: "alice", trigger: "refresh" });

    expect(sent.map((input) => input.assetId)).toEqual(expect.arrayContaining(["saved", "skipped", "busy"]));
    expect(sent.filter((input) => input.assetId === "saved")).toHaveLength(1);
    expect(sent.filter((input) => input.assetId === "skipped")).toHaveLength(1);
    expect(sent.filter((input) => input.assetId === "busy")).toHaveLength(2);
    expect(second).toMatchObject({ created: 1, skipped: 0, failed: 0 });

    // Another account shares no local memory of those photos.
    await session.request({ accountId: "bob", trigger: "home" });
    expect(sent.filter((input) => input.assetId === "saved")).toHaveLength(2);
  });

  it("imports at most two photos at a time", async () => {
    const { session, peak } = harness({
      photos: Array.from({ length: 7 }, (_, index) => photo(`p${index}`, "TrueMoney", index)),
    });
    await session.request({ accountId: "alice", trigger: "home" });
    expect(peak()).toBe(2);
  });

  it("joins duplicate triggers into one round and exposes busy state until it ends", async () => {
    const gate = deferred<void>();
    const { session, sent } = harness({
      photos: [photo("a"), photo("b", "K PLUS", 2)],
      respond: async (input) => {
        await gate.promise;
        return { status: "created", transactionId: `tx-${input.assetId}`, warnings: [] };
      },
    });
    const states: boolean[] = [];
    session.subscribe(() => states.push(session.getState().scanning));

    const first = session.request({ accountId: "alice", trigger: "home" });
    const second = session.request({ accountId: "alice", trigger: "refresh" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(session.getState().scanning).toBe(true);
    gate.resolve();

    expect(await first).toBe(await second);
    expect(sent).toHaveLength(2);
    expect(session.getState().scanning).toBe(false);
    expect(states[0]).toBe(true);
    expect(states.at(-1)).toBe(false);
  });

  it.each(["limited", "denied", "permission-required", "unsupported"] as const)(
    "sends nothing without full photo access (%s)",
    async (access) => {
      const { session, sent, pageQueries } = harness({ access, photos: [photo("a")] });
      const round = await session.request({ accountId: "alice", trigger: "home" });
      expect(round).toMatchObject({ status: "no-access", discovered: 0 });
      expect(sent).toHaveLength(0);
      expect(pageQueries).toHaveLength(0);
      expect(session.getState()).toMatchObject({ scanning: false, access });
    }
  );

  it("ends the busy state when discovery finds nothing or the photo library throws", async () => {
    const empty = harness();
    expect(await empty.session.request({ accountId: "alice", trigger: "home" })).toMatchObject({
      status: "completed",
      discovered: 0,
    });
    expect(empty.session.getState().scanning).toBe(false);

    const broken = harness({ libraryError: new Error("media library crashed") });
    expect(await broken.session.request({ accountId: "alice", trigger: "home" })).toMatchObject({ status: "error" });
    expect(broken.session.getState().scanning).toBe(false);
  });

  it("stops sending further photos after the session is rejected with 401", async () => {
    const { session, sent } = harness({
      photos: Array.from({ length: 6 }, (_, index) => photo(`p${index}`, "K PLUS", index)),
      respond: () => {
        throw new AutoImportRequestError({ kind: "response", code: "UNAUTHORIZED", status: 401 });
      },
    });
    const round = await session.request({ accountId: "alice", trigger: "home" });
    expect(round.status).toBe("unauthorized");
    expect(sent.length).toBeLessThanOrEqual(2);
    expect(session.getState().scanning).toBe(false);
  });

  it("keeps a created transaction when binding the local image or refreshing Home fails", async () => {
    const { session, sent } = harness({
      photos: [photo("a"), photo("b", "K PLUS", 2)],
      bindImage: async () => {
        throw new Error("disk full");
      },
      refreshLedger: async () => {
        throw new Error("offline");
      },
    });
    const round = await session.request({ accountId: "alice", trigger: "home" });
    expect(round).toMatchObject({ status: "completed", created: 2, failed: 0 });
    expect(sent).toHaveLength(2);
    expect(session.getState().scanning).toBe(false);

    await session.request({ accountId: "alice", trigger: "refresh" });
    expect(sent).toHaveLength(2);
  });

  it("refreshes ledger-derived Home data after saving and before reporting the round as finished", async () => {
    let refreshed = false;
    const { session } = harness({
      photos: [photo("a")],
      refreshLedger: async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        refreshed = true;
      },
    });
    await session.request({ accountId: "alice", trigger: "home" });
    expect(refreshed).toBe(true);

    const idle = harness({
      photos: [photo("skip")],
      respond: () => ({ status: "skipped", reason: "no_candidate", reasons: [], warnings: [] }),
    });
    await idle.session.request({ accountId: "alice", trigger: "home" });
    expect(idle.refreshes()).toBe(0);
  });

  it("sends originals within 10 MiB unchanged and shrinks only oversized images", async () => {
    const shrunk: string[] = [];
    const { session, sent, bindings } = harness({
      photos: [
        { ...photo("small"), size: MAX_IMAGE_BYTES },
        { ...photo("large", "K PLUS", 2), size: MAX_IMAGE_BYTES + 1 },
      ],
      shrink: async (image) => {
        shrunk.push(image.uri);
        return {
          uri: `${image.uri}.jpg`,
          byteLength: JPEG.length,
          header: async () => JPEG,
          base64: async () => base64(JPEG),
        };
      },
    });
    await session.request({ accountId: "alice", trigger: "home" });
    expect(shrunk).toEqual(["file:///photos/large"]);
    expect(sent.find((input) => input.assetId === "small")).toMatchObject({
      mimeType: "image/png",
      fileBase64: base64(PNG),
    });
    expect(sent.find((input) => input.assetId === "large")).toMatchObject({
      mimeType: "image/jpeg",
      fileBase64: base64(JPEG),
    });
    // The local binding keeps the original photo, not the temporary upload copy.
    expect(bindings.find((binding) => binding.transactionId && binding.uri.includes("large"))?.uri).toBe(
      "file:///photos/large"
    );
  });

  it("fails an oversized image that cannot be reduced below the limit without sending it", async () => {
    const { session, sent } = harness({
      photos: [{ ...photo("huge"), size: MAX_IMAGE_BYTES * 3 }, photo("next", "K PLUS", 2)],
      shrink: async (image) => ({
        uri: `${image.uri}.jpg`,
        byteLength: MAX_IMAGE_BYTES + 1,
        header: async () => JPEG,
        base64: async () => base64(JPEG),
      }),
    });
    const round = await session.request({ accountId: "alice", trigger: "home" });
    expect(sent.map((input) => input.assetId)).toEqual(["next"]);
    expect(round).toMatchObject({ created: 1, failed: 1 });
  });

  it("starts a separate round when another account requests a scan and never binds across accounts", async () => {
    const gate = deferred<void>();
    const { session, bindings } = harness({
      photos: [photo("a")],
      respond: async () => {
        await gate.promise;
        return { status: "created", transactionId: "tx-a", warnings: [] };
      },
    });
    const alice = session.request({ accountId: "alice", trigger: "home" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const bob = session.request({ accountId: "bob", trigger: "home" });
    gate.resolve();
    await Promise.all([alice, bob]);
    expect(bindings.filter((binding) => binding.accountId === "alice")).toHaveLength(1);
    expect(bindings.filter((binding) => binding.accountId === "bob")).toHaveLength(1);
  });
});

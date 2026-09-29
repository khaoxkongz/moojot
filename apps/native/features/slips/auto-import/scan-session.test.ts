import { describe, expect, it } from "vite-plus/test";

import { MAX_IMAGE_BYTES } from "./image";
import type { PhotoAccess } from "./photo-access";
import { createSlipScanSession, type SlipScanPorts } from "./scan-session";
import { AutoImportRequestError, type AutoImportInput, type AutoImportOutcome } from "./transport";

const day = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 8, 29, 12);
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46]);
const HEIC = Uint8Array.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]);

const base64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");

type Photo = {
  id: string;
  album: string;
  creationTime: number | null;
  modificationTime?: number | null;
  bytes?: Uint8Array;
  size?: number;
};

/** Busy-state changes from the first busy state on, with repeats collapsed: one round reads as `[true, false]`. */
const busyRuns = (states: boolean[]) =>
  states.slice(Math.max(0, states.indexOf(true))).filter((state, index, all) => state !== all[index - 1]);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

function harness(
  options: {
    photos?: Photo[];
    albums?: string[];
    /** Photo permission at the start of each round; a function lets it change between rounds. */
    access?: PhotoAccess | (() => PhotoAccess);
    pageSize?: number;
    respond?: (input: AutoImportInput) => Promise<AutoImportOutcome> | AutoImportOutcome;
    bindImage?: SlipScanPorts["bindImage"];
    refreshLedger?: SlipScanPorts["refreshLedger"];
    shrink?: SlipScanPorts["shrink"];
    libraryError?: Error;
    /** Persistent scan memory shared by sessions, as a reopened app would find it. */
    store?: Map<string, string>;
    clock?: { now: number };
    random?: () => number;
    /** Active ledger rows by the asset identity they were imported under; a function to simulate failures. */
    ledger?: Map<string, string> | (() => Promise<Map<string, string>>);
    storeError?: { read?: Error; write?: Error };
  } = {}
) {
  const store = options.store ?? new Map<string, string>();
  const clock = options.clock ?? { now };
  const photos = options.photos ?? [];
  const albums = options.albums ?? ["Krungthai NEXT", "K PLUS", "Paotang", "TrueMoney", "Camera Roll"];
  const sent: AutoImportInput[] = [];
  const bindings: { accountId: string; transactionId: string; uri: string }[] = [];
  const pageQueries: { album: string; from: number; to: number; offset: number }[] = [];
  let active = 0;
  let peak = 0;
  let refreshes = 0;
  let nextId = 1;
  const lookups: string[][] = [];

  const ports: SlipScanPorts = {
    pageSize: options.pageSize ?? 2,
    now: () => clock.now,
    random: options.random,
    store: {
      read: async (accountId) => {
        if (options.storeError?.read) throw options.storeError.read;
        return store.get(accountId) ?? null;
      },
      write: async (accountId, text) => {
        if (options.storeError?.write) throw options.storeError.write;
        store.set(accountId, text);
      },
    },
    photoAccess: async () => (typeof options.access === "function" ? options.access() : (options.access ?? "all")),
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
        .map(({ id, creationTime, modificationTime }) => ({
          id,
          creationTime,
          modificationTime: modificationTime ?? null,
        }));
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
    findImportedTransactions: async (assetIds) => {
      lookups.push([...assetIds]);
      const ledger = typeof options.ledger === "function" ? await options.ledger() : (options.ledger ?? new Map());
      return new Map([...ledger].filter(([assetId]) => assetIds.includes(assetId)));
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
    /** The same app installation opened again: new session, same device storage. */
    reopen: () => createSlipScanSession(ports),
    store,
    clock,
    sent,
    bindings,
    lookups,
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

  it("does not resend photos that already settled, but retries temporary failures on a later round", async () => {
    let busy = true;
    const { session, sent, clock } = harness({
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
    clock.now = now + 60_000;
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
    expect(busyRuns(states)).toEqual([true, false]);
  });

  it.each(["limited", "denied", "permission-required", "unsupported"] as const)(
    "sends nothing and never shows the reading state without full photo access (%s)",
    async (access) => {
      const { session, sent, pageQueries } = harness({ access, photos: [photo("a")] });
      const states: boolean[] = [];
      session.subscribe(() => states.push(session.getState().scanning));

      const round = await session.request({ accountId: "alice", trigger: "home" });

      expect(round).toMatchObject({ status: "no-access", discovered: 0 });
      expect(sent).toHaveLength(0);
      expect(pageQueries).toHaveLength(0);
      expect(states).not.toContain(true);
      expect(session.getState()).toMatchObject({ scanning: false, access, lastRound: round });
    }
  );

  it("reads on the next request once full access is restored, and pauses again when it is revoked", async () => {
    let access: PhotoAccess = "denied";
    const photos = [photo("a")];
    const { session, sent } = harness({ access: () => access, photos });

    expect(await session.request({ accountId: "alice", trigger: "home" })).toMatchObject({ status: "no-access" });
    expect(session.getState().access).toBe("denied");

    // Returning from Settings with full access: the same account reads without onboarding again.
    access = "all";
    expect(await session.request({ accountId: "alice", trigger: "home" })).toMatchObject({
      status: "completed",
      created: 1,
    });
    expect(sent.map((input) => input.assetId)).toEqual(["a"]);
    expect(session.getState().access).toBe("all");

    // Narrowed to selected photos later: a new photo is not sent.
    access = "limited";
    photos.push(photo("b", "K PLUS", 2));
    expect(await session.request({ accountId: "alice", trigger: "refresh" })).toMatchObject({ status: "no-access" });
    expect(sent).toHaveLength(1);
    expect(session.getState()).toMatchObject({ scanning: false, access: "limited" });
  });

  it("finishes a round with full access and nothing new as a normal completed round", async () => {
    const { session, sent } = harness({ albums: ["Camera Roll"], photos: [photo("camera", "Camera Roll")] });

    expect(await session.request({ accountId: "alice", trigger: "home" })).toMatchObject({
      status: "completed",
      discovered: 0,
    });
    expect(sent).toHaveLength(0);
    expect(session.getState()).toMatchObject({ scanning: false, access: "all" });
  });

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

  it("suspends sending after a 401 until the account signs in again, without deferring the photos", async () => {
    let signedIn = false;
    const { session, sent } = harness({
      photos: [photo("a"), photo("b", "K PLUS", 2), photo("c", "K PLUS", 3)],
      respond: (input) => {
        if (!signedIn) throw new AutoImportRequestError({ kind: "response", code: "UNAUTHORIZED", status: 401 });
        return { status: "created", transactionId: `tx-${input.assetId}`, warnings: [] };
      },
    });
    await session.request({ accountId: "alice", sessionId: "expired", trigger: "home" });
    const rejected = sent.length;

    const suspended = await session.request({ accountId: "alice", sessionId: "expired", trigger: "refresh" });
    expect(suspended.status).toBe("unauthorized");
    expect(sent).toHaveLength(rejected);

    signedIn = true;
    const resumed = await session.request({ accountId: "alice", sessionId: "renewed", trigger: "home" });
    expect(resumed).toMatchObject({ status: "completed", created: 3, deferred: 0 });
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

  describe("remembered outcomes", () => {
    it("does not send created or skipped photos again after the app is reopened", async () => {
      const store = new Map<string, string>();
      const photos = [
        photo("saved"),
        photo("duplicate", "K PLUS", 2),
        photo("empty", "K PLUS", 3),
        photo("incomplete", "K PLUS", 4),
      ];
      const respond = (input: AutoImportInput): AutoImportOutcome => {
        if (input.assetId === "saved") return { status: "created", transactionId: "tx-saved", warnings: [] };
        const reason =
          input.assetId === "duplicate"
            ? "duplicate"
            : input.assetId === "empty"
              ? "no_candidate"
              : "incomplete_candidate";
        return { status: "skipped", reason, reasons: [], warnings: [] };
      };
      const first = harness({ store, photos, respond });
      expect(await first.session.request({ accountId: "alice", trigger: "home" })).toMatchObject({
        created: 1,
        skipped: 3,
      });

      const reopened = harness({ store, photos: [...photos, photo("new", "K PLUS", 5)], respond });
      const round = await reopened.session.request({ accountId: "alice", trigger: "home" });

      expect(reopened.sent.map((input) => input.assetId)).toEqual(["new"]);
      expect(round).toMatchObject({ status: "completed", discovered: 5, created: 0, skipped: 1, failed: 0 });
    });

    it.each([400, 413, 415])(
      "does not resend unchanged input rejected with %i, even after a long time",
      async (status) => {
        const store = new Map<string, string>();
        const clock = { now };
        const photos = [photo("rejected"), photo("next", "K PLUS", 2)];
        const first = harness({
          store,
          clock,
          photos,
          respond: (input) => {
            if (input.assetId === "rejected") throw new AutoImportRequestError({ kind: "response", code: "X", status });
            return { status: "created", transactionId: "tx-next", warnings: [] };
          },
        });
        const round = await first.session.request({ accountId: "alice", trigger: "home" });
        expect(round).toMatchObject({ created: 1, failed: 1 });
        expect(round.failures[0]).toMatchObject({ assetId: "rejected", status, retryAt: null });

        clock.now = now + 24 * 60 * 60_000;
        await first.session.request({ accountId: "alice", trigger: "refresh" });
        const reopened = harness({ store, clock, photos });
        await reopened.session.request({ accountId: "alice", trigger: "home" });
        expect(first.sent).toHaveLength(2);
        expect(reopened.sent).toHaveLength(0);
      }
    );

    it("reads a skipped or rejected photo again once the photo itself changes, but never a saved one", async () => {
      const store = new Map<string, string>();
      const versions = { saved: 1, empty: 1, heic: 1 };
      const photos = () => [
        { ...photo("saved"), modificationTime: versions.saved },
        { ...photo("empty", "K PLUS", 2), modificationTime: versions.empty },
        { ...photo("heic", "K PLUS", 3, versions.heic === 1 ? HEIC : PNG), modificationTime: versions.heic },
      ];
      const respond = (input: AutoImportInput): AutoImportOutcome =>
        input.assetId === "saved"
          ? { status: "created", transactionId: "tx-saved", warnings: [] }
          : { status: "skipped", reason: "no_candidate", reasons: [], warnings: [] };
      await harness({ store, photos: photos(), respond }).session.request({ accountId: "alice", trigger: "home" });

      versions.saved = versions.empty = versions.heic = 2;
      const edited = harness({ store, photos: photos(), respond });
      await edited.session.request({ accountId: "alice", trigger: "home" });
      expect(edited.sent.map((input) => input.assetId).sort()).toEqual(["empty", "heic"]);
    });

    it("forgets photos once discovery no longer finds them, such as after they leave the 30-day window", async () => {
      const { session, store, clock } = harness({ photos: [photo("old", "K PLUS", 29), photo("new", "K PLUS", 1)] });
      await session.request({ accountId: "alice", trigger: "home" });
      expect(store.get("alice")).toContain('"old"');

      clock.now = now + 2 * day;
      await session.request({ accountId: "alice", trigger: "home" });
      expect(store.get("alice")).not.toContain('"old"');
      expect(store.get("alice")).toContain('"new"');
    });

    it("keeps a photo's retry wait when discovery briefly misses it", async () => {
      const clock = { now };
      const photos = [photo("busy")];
      const run = harness({
        clock,
        random: () => 0,
        photos,
        respond: () => {
          throw new AutoImportRequestError({ kind: "response", code: "BUSY", status: 429 });
        },
      });
      await run.session.request({ accountId: "alice", trigger: "home" });
      // The album is briefly unavailable, then found again before the wait has passed.
      photos.length = 0;
      clock.now = now + 10_000;
      await run.session.request({ accountId: "alice", trigger: "home" });
      photos.push(photo("busy"));
      clock.now = now + 20_000;
      await run.session.request({ accountId: "alice", trigger: "home" });
      expect(run.sent).toHaveLength(1);
    });

    it("does not let a request that settles after the memory is forgotten write into it", async () => {
      const store = new Map<string, string>();
      const gate = deferred<void>();
      const first = harness({
        store,
        photos: [photo("a")],
        respond: async () => {
          await gate.promise;
          return { status: "created", transactionId: "tx-deleted", warnings: [] };
        },
      });
      const round = first.session.request({ accountId: "alice", trigger: "home" });
      await new Promise((resolve) => setTimeout(resolve, 5));
      await first.session.forget("alice");
      gate.resolve();
      await round;

      expect(store.get("alice")).not.toContain("tx-deleted");
      const reopened = harness({ store, photos: [photo("a")] });
      await reopened.session.request({ accountId: "alice", trigger: "home" });
      expect(reopened.sent).toHaveLength(1);
    });

    it("reads photos again after the account's ledger data is cleared", async () => {
      const store = new Map<string, string>();
      const first = harness({ store, photos: [photo("a")] });
      await first.session.request({ accountId: "alice", trigger: "home" });
      await first.session.request({ accountId: "bob", trigger: "home" });
      await first.session.forget("alice");

      const reopened = harness({ store, photos: [photo("a")] });
      await reopened.session.request({ accountId: "alice", trigger: "home" });
      await reopened.session.request({ accountId: "bob", trigger: "home" });
      expect(reopened.sent.map((input) => input.assetId)).toEqual(["a"]);
      expect(reopened.bindings.map((binding) => binding.accountId)).toEqual(["alice"]);
    });
  });

  describe("stopping", () => {
    it("does not send a photo again while its request from a stopped round is still in flight", async () => {
      const gate = deferred<void>();
      const run = harness({
        photos: [photo("a"), photo("b", "K PLUS", 2), photo("c", "K PLUS", 3)],
        respond: async (input) => {
          if (input.assetId === "a") await gate.promise;
          return { status: "created", transactionId: `tx-${input.assetId}`, warnings: [] };
        },
      });
      const stopped = run.session.request({ accountId: "alice", trigger: "home" });
      await new Promise((resolve) => setTimeout(resolve, 5));
      run.session.stop();
      const next = run.session.request({ accountId: "alice", trigger: "home" });
      await new Promise((resolve) => setTimeout(resolve, 5));
      gate.resolve();
      await Promise.all([stopped, next]);

      expect(run.sent.filter((input) => input.assetId === "a")).toHaveLength(1);
      expect(run.bindings.map((binding) => binding.transactionId).sort()).toEqual(["tx-a", "tx-b", "tx-c"]);
    });

    it("sends a cancelled photo again on the next round without waiting, and a saved answer then binds it", async () => {
      let cancelled = true;
      const { session, sent, bindings } = harness({
        photos: [photo("a")],
        respond: () => {
          if (cancelled) throw new AutoImportRequestError({ kind: "cancelled" });
          // The cancelled request had in fact been saved.
          return { status: "skipped", reason: "duplicate", reasons: [], warnings: [] };
        },
        ledger: new Map([["a", "tx-a"]]),
      });
      await session.request({ accountId: "alice", trigger: "home" });
      cancelled = false;
      await session.request({ accountId: "alice", trigger: "home" });
      expect(sent).toHaveLength(2);
      expect(bindings).toEqual([{ accountId: "alice", transactionId: "tx-a", uri: "file:///photos/a" }]);
    });
  });

  describe("device storage failures", () => {
    it("keeps saved results and the rest of the round when the memory cannot be written", async () => {
      const { session, sent, store } = harness({
        photos: [photo("a"), photo("b", "K PLUS", 2)],
        storeError: { write: new Error("disk full") },
      });
      expect(await session.request({ accountId: "alice", trigger: "home" })).toMatchObject({
        status: "completed",
        created: 2,
      });
      // This app run still remembers them.
      await session.request({ accountId: "alice", trigger: "refresh" });
      expect(sent).toHaveLength(2);
      expect(store.size).toBe(0);
    });

    it.each([
      ["unreadable", { read: new Error("io") }, undefined],
      ["corrupt", undefined, "{not json"],
      ["from another format", undefined, JSON.stringify({ format: 99, assets: { a: { kind: "saved" } } })],
    ])("starts from empty memory when it is %s and relies on the server's asset identity", async (_, error, text) => {
      const store = new Map<string, string>(text ? [["alice", text]] : []);
      const { session, sent } = harness({
        store,
        storeError: error,
        photos: [photo("a")],
        respond: () => ({ status: "skipped", reason: "duplicate", reasons: [], warnings: [] }),
      });
      expect(await session.request({ accountId: "alice", trigger: "home" })).toMatchObject({
        status: "completed",
        skipped: 1,
      });
      expect(sent.map((input) => input.assetId)).toEqual(["a"]);
    });
  });

  describe("local image binding", () => {
    it("repairs a failed binding on a later round from the remembered transaction ID without sending again", async () => {
      const store = new Map<string, string>();
      let diskFull = true;
      const bound: { accountId: string; transactionId: string; uri: string }[] = [];
      const options = {
        store,
        photos: [photo("a"), photo("b", "K PLUS", 2)],
        respond: (input: AutoImportInput): AutoImportOutcome => ({
          status: "created",
          transactionId: `tx-${input.assetId}`,
          warnings: [],
        }),
        bindImage: async (accountId: string, transactionId: string, uri: string) => {
          if (diskFull) throw new Error("disk full");
          bound.push({ accountId, transactionId, uri });
        },
      };
      const first = harness(options);
      expect(await first.session.request({ accountId: "alice", trigger: "home" })).toMatchObject({ created: 2 });

      diskFull = false;
      const reopened = harness(options);
      const round = await reopened.session.request({ accountId: "alice", trigger: "home" });

      expect(reopened.sent).toHaveLength(0);
      expect(round).toMatchObject({ created: 0, skipped: 0, failed: 0 });
      expect(bound.sort((x, y) => x.transactionId.localeCompare(y.transactionId))).toEqual([
        { accountId: "alice", transactionId: "tx-a", uri: "file:///photos/a" },
        { accountId: "alice", transactionId: "tx-b", uri: "file:///photos/b" },
      ]);

      // Once repaired, nothing is bound again.
      await reopened.session.request({ accountId: "alice", trigger: "refresh" });
      expect(bound).toHaveLength(2);
    });
  });

  describe("duplicates", () => {
    const duplicate: AutoImportOutcome = { status: "skipped", reason: "duplicate", reasons: [], warnings: [] };

    it("binds the photo to the transaction saved under its asset identity when the first response was lost", async () => {
      const store = new Map<string, string>();
      const clock = { now };
      // The server saved tx-a, but the response never arrived.
      const lost = harness({
        store,
        clock,
        random: () => 0,
        photos: [photo("a")],
        respond: () => {
          throw new AutoImportRequestError({ kind: "network" });
        },
      });
      await lost.session.request({ accountId: "alice", trigger: "home" });
      expect(lost.bindings).toHaveLength(0);

      const ledger = new Map([["a", "tx-a"]]);
      const later = harness({ store, clock, photos: [photo("a")], respond: () => duplicate, ledger });
      clock.now = now + 30_000;
      const round = await later.session.request({ accountId: "alice", trigger: "home" });

      expect(round).toMatchObject({ created: 0, skipped: 1, failed: 0 });
      expect(later.bindings).toEqual([{ accountId: "alice", transactionId: "tx-a", uri: "file:///photos/a" }]);
      await later.session.request({ accountId: "alice", trigger: "refresh" });
      expect(later.sent).toHaveLength(1);
      expect(later.lookups).toHaveLength(1);
    });

    it("leaves a duplicate without a photo when no active transaction has its identity, such as after deletion", async () => {
      const { session, bindings, lookups, sent } = harness({
        photos: [photo("deleted")],
        respond: () => duplicate,
        ledger: new Map([["other", "tx-other"]]),
      });
      await session.request({ accountId: "alice", trigger: "home" });
      await session.request({ accountId: "alice", trigger: "refresh" });
      expect(bindings).toHaveLength(0);
      expect(sent).toHaveLength(1);
      expect(lookups).toEqual([["deleted"]]);
    });

    it("looks the duplicate up again on a later round when the ledger could not be read, without sending the photo", async () => {
      let offline = true;
      const { session, bindings, sent } = harness({
        photos: [photo("a")],
        respond: () => duplicate,
        ledger: async () => {
          if (offline) throw new Error("offline");
          return new Map([["a", "tx-a"]]);
        },
      });
      expect(await session.request({ accountId: "alice", trigger: "home" })).toMatchObject({
        status: "completed",
        skipped: 1,
      });
      offline = false;
      await session.request({ accountId: "alice", trigger: "refresh" });
      expect(sent).toHaveLength(1);
      expect(bindings).toEqual([{ accountId: "alice", transactionId: "tx-a", uri: "file:///photos/a" }]);
    });
  });

  describe("accounts", () => {
    it("keeps outcome and retry memory separate per account across reopening", async () => {
      const store = new Map<string, string>();
      const photos = [photo("saved"), photo("busy", "K PLUS", 2)];
      const respond = (input: AutoImportInput): AutoImportOutcome => {
        if (input.assetId === "busy") throw new AutoImportRequestError({ kind: "response", code: "BUSY", status: 429 });
        return { status: "created", transactionId: "tx-saved", warnings: [] };
      };
      await harness({ store, photos, respond }).session.request({ accountId: "alice", trigger: "home" });

      const bob = harness({ store, photos });
      await bob.session.request({ accountId: "bob", trigger: "home" });
      expect(bob.sent.map((input) => input.assetId).sort()).toEqual(["busy", "saved"]);
      expect(bob.bindings.every((binding) => binding.accountId === "bob")).toBe(true);

      const alice = harness({ store, photos });
      await alice.session.request({ accountId: "alice", trigger: "home" });
      expect(alice.sent).toHaveLength(0);
    });

    it("records a late result from the previous account under that account without touching the new one", async () => {
      const store = new Map<string, string>();
      const gate = deferred<void>();
      const run = harness({
        store,
        photos: [photo("a")],
        respond: async (input) => {
          const request = run.sent.length;
          if (request === 1) await gate.promise;
          return { status: "created", transactionId: `tx-${request}-${input.assetId}`, warnings: [] };
        },
      });
      const alice = run.session.request({ accountId: "alice", trigger: "home" });
      await new Promise((resolve) => setTimeout(resolve, 5));
      const bobRound = await run.session.request({ accountId: "bob", trigger: "home" });
      gate.resolve();
      await alice;

      expect(run.session.getState()).toMatchObject({ scanning: false, lastRound: bobRound });
      expect(run.bindings).toEqual(
        expect.arrayContaining([
          { accountId: "alice", transactionId: "tx-1-a", uri: "file:///photos/a" },
          { accountId: "bob", transactionId: "tx-2-a", uri: "file:///photos/a" },
        ])
      );
      expect(store.get("bob")).not.toContain("tx-1-a");
      expect(store.get("alice")).toContain("tx-1-a");
    });
  });

  describe("retry timing", () => {
    const second = 1000;
    const minute = 60 * second;
    const busy = () => {
      throw new AutoImportRequestError({ kind: "response", code: "BUSY", status: 429 });
    };

    /** A photo that fails with `fail` until `recover()` is called, and a way to run rounds at chosen times. */
    function retrying(fail: () => never, random: () => number) {
      let failing = true;
      const clock = { now };
      const run = harness({
        clock,
        random,
        photos: [photo("slip")],
        respond: () => {
          if (failing) fail();
          return { status: "created", transactionId: "tx-slip", warnings: [] };
        },
      });
      return {
        ...run,
        recover: () => (failing = false),
        /** Run a round `elapsed` ms after the start and report whether the photo was sent in it. */
        async sendsAt(elapsed: number) {
          clock.now = now + elapsed;
          const before = run.sent.length;
          await run.session.request({ accountId: "alice", trigger: "refresh" });
          return run.sent.length > before;
        },
      };
    }

    it("waits at least 30 seconds, then backs off exponentially with bounded jitter", async () => {
      const low = retrying(busy, () => 0);
      expect(await low.sendsAt(0)).toBe(true);
      expect(await low.sendsAt(30 * second - 1)).toBe(false);
      expect(await low.sendsAt(30 * second)).toBe(true);
      // Second failure: the wait doubles.
      expect(await low.sendsAt(90 * second - 1)).toBe(false);
      expect(await low.sendsAt(90 * second)).toBe(true);

      const high = retrying(busy, () => 0.999);
      expect(await high.sendsAt(0)).toBe(true);
      // Jitter lengthens the wait, but by less than one more doubling.
      expect(await high.sendsAt(30 * second)).toBe(false);
      expect(await high.sendsAt(60 * second)).toBe(true);
    });

    it("never waits longer than 15 minutes between attempts", async () => {
      const run = retrying(busy, () => 0.999);
      let elapsed = 0;
      for (let attempt = 0; attempt < 12; attempt++) {
        // Probe each minute until the photo becomes eligible again.
        let waited = 0;
        while (!(await run.sendsAt(elapsed + waited))) waited += minute;
        elapsed += waited;
        expect(waited).toBeLessThanOrEqual(15 * minute);
      }
      run.recover();
      expect(await run.sendsAt(elapsed + 15 * minute)).toBe(true);
      expect(await run.sendsAt(elapsed + 60 * minute)).toBe(false);
    });

    it("honors a longer Retry-After, and ignores a shorter one in favor of the minimum wait", async () => {
      const long = retrying(
        () => {
          throw new AutoImportRequestError({
            kind: "response",
            code: "AI_RATE_LIMITED",
            status: 429,
            retryAfter: 1200,
          });
        },
        () => 0
      );
      expect(await long.sendsAt(0)).toBe(true);
      expect(await long.sendsAt(20 * minute - 1)).toBe(false);
      expect(await long.sendsAt(20 * minute)).toBe(true);

      const short = retrying(
        () => {
          throw new AutoImportRequestError({ kind: "response", code: "BUSY", status: 429, retryAfter: 5 });
        },
        () => 0
      );
      expect(await short.sendsAt(0)).toBe(true);
      expect(await short.sendsAt(29 * second)).toBe(false);
    });

    it.each([
      ["5xx", new AutoImportRequestError({ kind: "response", code: "AI_UPSTREAM_ERROR", status: 502 })],
      ["504", new AutoImportRequestError({ kind: "response", code: "IMPORT_TIMEOUT", status: 504 })],
      ["network failure", new AutoImportRequestError({ kind: "network" })],
      ["client timeout", new AutoImportRequestError({ kind: "timeout" })],
    ])("defers a photo after a %s and sends the same asset ID later", async (_, error) => {
      const run = retrying(
        () => {
          throw error;
        },
        () => 0
      );
      expect(await run.sendsAt(0)).toBe(true);
      expect(await run.sendsAt(10 * second)).toBe(false);
      run.recover();
      expect(await run.sendsAt(30 * second)).toBe(true);
      expect(run.sent.map((input) => input.assetId)).toEqual(["slip", "slip"]);
    });

    it("finishes a round with only deferred photos without waiting for them", async () => {
      const run = retrying(busy, () => 0);
      await run.sendsAt(0);
      const states: boolean[] = [];
      run.session.subscribe(() => states.push(run.session.getState().scanning));

      const round = await run.session.request({ accountId: "alice", trigger: "home" });

      expect(round).toMatchObject({ status: "completed", discovered: 1, deferred: 1, created: 0, failed: 0 });
      expect(busyRuns(states)).toEqual([true, false]);
      expect(run.sent).toHaveLength(1);
    });

    it("keeps retry deadlines after the app is reopened", async () => {
      const store = new Map<string, string>();
      const clock = { now };
      const first = harness({ store, clock, random: () => 0, photos: [photo("slip")], respond: busy });
      await first.session.request({ accountId: "alice", trigger: "home" });

      const reopened = harness({ store, clock, random: () => 0, photos: [photo("slip")] });
      clock.now = now + 10 * second;
      await reopened.session.request({ accountId: "alice", trigger: "home" });
      expect(reopened.sent).toHaveLength(0);
      clock.now = now + 30 * second;
      await reopened.session.request({ accountId: "alice", trigger: "home" });
      expect(reopened.sent.map((input) => input.assetId)).toEqual(["slip"]);
    });
  });
});

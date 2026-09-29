import { afterAll, beforeAll, beforeEach, expect, it } from "vite-plus/test";
import { Effect, Layer } from "effect";
import sharp from "sharp";
import { createAuth } from "@moojot/auth";
import { createAppRuntime } from "@moojot/api/runtime";
import { GeminiProvider } from "@moojot/api/features/import/gemini.provider";
import { ImportError } from "@moojot/api/features/import/import.error";
import { createServerApp } from "../src/app";
import { startTestDatabase } from "./mongo";
import { createImportedTransactionLookup } from "../../native/features/slips/auto-import/ledger-identity";
import { createSlipScanSession, type SlipScanPorts } from "../../native/features/slips/auto-import/scan-session";
import { createAutoImportTransport } from "../../native/features/slips/auto-import/transport";

// The native scan session and transport against the real authenticated route, Import, Ledger and MongoDB.
// Only the photo library, device storage, local image store and Gemini are replaced.

const env = {
  BETTER_AUTH_URL: "https://localhost:3333",
  BETTER_AUTH_SECRET: "test-only-secret-with-at-least-32-characters",
  CORS_ORIGIN: "http://localhost:3001",
  NODE_ENV: "development" as const,
};
const now = Date.now();
const day = 24 * 60 * 60 * 1000;

let database: Awaited<ReturnType<typeof startTestDatabase>>;
let runtime: ReturnType<typeof createAppRuntime>;
let app: ReturnType<typeof createServerApp>;
let cookie: string;
let ownerId: string;

const images: Record<string, Buffer> = {};
const modelInputs: string[] = [];
const modelOutput = new Map<string, Effect.Effect<string | undefined, ImportError>>();
const requests: { path: string; csrf: string | null; cookie: string | null }[] = [];
const AUTO_IMPORT = "/rpc/import/slip/auto-import";
const autoImports = () => requests.filter((request) => request.path === AUTO_IMPORT);

function recordedFetch(request: Request) {
  requests.push({
    path: new URL(request.url).pathname,
    csrf: request.headers.get("x-csrf-token"),
    cookie: request.headers.get("cookie"),
  });
  return app.fetch(request);
}

/** A signed-in RPC call, as the app's ledger client makes it. */
async function rpc<T>(path: string, input: unknown): Promise<T> {
  const response = await recordedFetch(
    new Request(`${env.BETTER_AUTH_URL}/rpc/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie, "x-csrf-token": "orpc" },
      body: JSON.stringify({ json: input }),
    })
  );
  expect(response.status).toBe(200);
  return ((await response.json()) as { json: T }).json;
}

const readable = (title: string, amountSatang: number) =>
  Effect.succeed(
    JSON.stringify({
      candidates: [{ kind: "expense", amountSatang, occurredOn: "2026-09-28", title, issues: [] }],
      warnings: [],
    })
  );

beforeAll(async () => {
  database = await startTestDatabase();
  const square = (background: string) => sharp({ create: { width: 24, height: 24, channels: 3, background } });
  images.receipt = await square("white").png().toBuffer();
  images.receiptJpeg = await square("#eeeeee").jpeg().toBuffer();
  images.blank = await square("black").png().toBuffer();
  images.limited = await square("#ff0000").png().toBuffer();
  images.broken = images.receipt.subarray(0, 40);
  modelOutput.set(images.receipt.toString("base64"), readable("กาแฟ", 6500));
  modelOutput.set(images.receiptJpeg.toString("base64"), readable("ข้าวมันไก่", 5000));
  modelOutput.set(images.blank.toString("base64"), Effect.succeed(JSON.stringify({ candidates: [], warnings: [] })));
  modelOutput.set(
    images.limited.toString("base64"),
    Effect.fail(new ImportError({ code: "AI_RATE_LIMITED", retryAfter: 45 }))
  );

  runtime = createAppRuntime(
    database.db,
    Layer.succeed(GeminiProvider, {
      extract: (input) =>
        Effect.suspend(() => {
          modelInputs.push(input.fileBase64);
          return modelOutput.get(input.fileBase64) ?? Effect.succeed(undefined);
        }),
    })
  );
  const auth = createAuth(env, database.db);
  app = createServerApp({ auth, db: database.db, runtime, env });
  const signup = await app.request("https://localhost:3333/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin: env.CORS_ORIGIN },
    body: JSON.stringify({ name: "Native", email: "native@example.test", password: "test-only-password" }),
  });
  expect(signup.status).toBe(200);
  cookie = signup.headers.get("set-cookie")!.split(";")[0]!;
  ownerId = (await database.db.user.findUniqueOrThrow({ where: { email: "native@example.test" } })).id;
}, 120_000);

afterAll(async () => {
  await runtime?.dispose();
  await database?.close();
});

beforeEach(async () => {
  modelInputs.length = 0;
  requests.length = 0;
  await database.db.financeTransaction.deleteMany();
});

const library: Record<string, { album: string; age: number; image: keyof typeof images }> = {
  "ph://receipt": { album: "K PLUS", age: 1, image: "receipt" },
  "ph://broken": { album: "K PLUS", age: 2, image: "broken" },
  "ph://receipt-jpeg": { album: "Krungthai NEXT", age: 3, image: "receiptJpeg" },
  "ph://blank": { album: "Paotang", age: 4, image: "blank" },
  "ph://limited": { album: "TrueMoney", age: 5, image: "limited" },
  "ph://camera": { album: "Camera Roll", age: 1, image: "receipt" },
};

function scanSession(
  options: {
    authenticated?: boolean;
    /** Device storage that outlives one app run; a fresh one models reinstalling or lost local state. */
    store?: Map<string, string>;
    clock?: { now: number };
    /** Photos in the library; all of `library` by default. */
    photos?: string[];
    /** Assets whose next response is lost after the server has handled the request. */
    loseResponse?: Set<string>;
    bindImage?: SlipScanPorts["bindImage"];
  } = {}
) {
  const bindings: { accountId: string; transactionId: string; uri: string }[] = [];
  const store = options.store ?? new Map<string, string>();
  const clock = options.clock ?? { now };
  const photos = Object.entries(library).filter(([id]) => !options.photos || options.photos.includes(id));
  let refreshes = 0;
  const send = createAutoImportTransport({
    baseUrl: env.BETTER_AUTH_URL,
    fetch: async (request) => {
      const { assetId } = ((await request.clone().json()) as { json: { assetId: string } }).json;
      const response = await recordedFetch(request);
      if (options.loseResponse?.delete(assetId)) throw new TypeError("Network request failed");
      return response;
    },
    headers: (): Record<string, string> => (options.authenticated === false ? {} : { Cookie: cookie }),
  });
  const ports: SlipScanPorts = {
    now: () => clock.now,
    random: () => 0,
    store: {
      read: async (accountId) => store.get(accountId) ?? null,
      write: async (accountId, text) => {
        store.set(accountId, text);
      },
    },
    photoAccess: async () => "all",
    albums: async () =>
      ["K PLUS", "Krungthai NEXT", "Paotang", "TrueMoney", "Camera Roll"].map((title) => ({ key: title, title })),
    pageAssets: async (album, query) =>
      photos
        .filter(([, photo]) => photo.album === album)
        .map(([id, photo]) => ({ id, creationTime: now - photo.age * day, modificationTime: null }))
        .filter((asset) => asset.creationTime >= query.from && asset.creationTime <= query.to)
        .slice(query.offset, query.offset + query.limit),
    readOriginal: async (assetId) => {
      const bytes = images[library[assetId]!.image]!;
      return {
        uri: `file:///library/${assetId.slice(5)}`,
        byteLength: bytes.length,
        header: async () => bytes.subarray(0, 16),
        base64: async () => bytes.toString("base64"),
      };
    },
    shrink: async () => {
      throw new Error("Synthetic photos never exceed the limit");
    },
    send,
    findImportedTransactions: createImportedTransactionLookup((input) =>
      rpc<{ id: string; dedupeKey: string | null }[]>("ledger/listTransactions", input)
    ),
    bindImage:
      options.bindImage ??
      (async (accountId, transactionId, uri) => {
        bindings.push({ accountId, transactionId, uri });
      }),
    refreshLedger: async () => {
      refreshes++;
    },
  };
  return { session: createSlipScanSession(ports), bindings, refreshes: () => refreshes };
}

it("saves slips through the auto-import route and binds each local photo to its transaction", async () => {
  const { session, bindings, refreshes } = scanSession();

  const round = await session.request({ accountId: ownerId, trigger: "home" });

  expect(round).toMatchObject({ status: "completed", discovered: 5, created: 2, skipped: 1, failed: 2 });
  expect(round.failures).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ assetId: "ph://broken", kind: "response", code: "INVALID_FILE", status: 400 }),
      expect.objectContaining({
        assetId: "ph://limited",
        kind: "response",
        code: "AI_RATE_LIMITED",
        status: 429,
        retryAfter: 45,
      }),
    ])
  );

  const rows = await database.db.financeTransaction.findMany({ orderBy: { title: "asc" } });
  expect(rows).toHaveLength(2);
  expect(rows).toEqual([
    expect.objectContaining({
      userId: ownerId,
      title: "กาแฟ",
      amountSatang: 6500n,
      source: "slip",
      categoryId: null,
      slipImageUri: null,
      dedupeKey: "slip:ph://receipt",
    }),
    expect.objectContaining({
      userId: ownerId,
      title: "ข้าวมันไก่",
      source: "slip",
      categoryId: null,
      dedupeKey: "slip:ph://receipt-jpeg",
    }),
  ]);
  expect(bindings).toEqual(
    expect.arrayContaining([
      { accountId: ownerId, transactionId: rows[0]!.id, uri: "file:///library/receipt" },
      { accountId: ownerId, transactionId: rows[1]!.id, uri: "file:///library/receipt-jpeg" },
    ])
  );
  expect(bindings).toHaveLength(2);
  expect(refreshes()).toBeGreaterThan(0);

  // Only the explicit wire route was called, authenticated, with the CSRF header; nothing created a second ledger row.
  expect(requests).toHaveLength(5);
  expect(requests.every((request) => request.path === "/rpc/import/slip/auto-import")).toBe(true);
  expect(requests.every((request) => request.csrf === "orpc" && request.cookie === cookie)).toBe(true);

  // Gemini received the original bytes; the invalid file was rejected before reaching it.
  expect(modelInputs.sort()).toEqual(
    ["receipt", "receiptJpeg", "blank", "limited"].map((name) => images[name]!.toString("base64")).sort()
  );
});

it("does not create another transaction when local memory is lost, and binds the photos to their existing rows", async () => {
  await scanSession().session.request({ accountId: ownerId, trigger: "home" });
  const rows = await database.db.financeTransaction.findMany();
  requests.length = 0;

  const { session, bindings } = scanSession();
  const round = await session.request({ accountId: ownerId, trigger: "home" });

  expect(round).toMatchObject({ created: 0, skipped: 3 });
  expect(await database.db.financeTransaction.count()).toBe(2);
  // Each duplicate is matched to the row saved under its own asset identity, not by title, amount or date.
  const idFor = (assetId: string) => rows.find((row) => row.dedupeKey === `slip:${assetId}`)!.id;
  expect(bindings).toEqual(
    expect.arrayContaining([
      { accountId: ownerId, transactionId: idFor("ph://receipt"), uri: "file:///library/receipt" },
      { accountId: ownerId, transactionId: idFor("ph://receipt-jpeg"), uri: "file:///library/receipt-jpeg" },
    ])
  );
  expect(bindings).toHaveLength(2);
  expect(requests.filter((request) => request.path !== AUTO_IMPORT)).toEqual([
    { path: "/rpc/ledger/listTransactions", csrf: "orpc", cookie },
  ]);
});

it("remembers outcomes across reopening and resends only a temporarily failed photo once its wait has passed", async () => {
  const store = new Map<string, string>();
  const clock = { now };
  await scanSession({ store, clock }).session.request({ accountId: ownerId, trigger: "home" });
  requests.length = 0;
  modelInputs.length = 0;

  // Reopened before the 45-second Retry-After: nothing is due.
  clock.now = now + 44_000;
  const early = await scanSession({ store, clock }).session.request({ accountId: ownerId, trigger: "home" });
  expect(early).toMatchObject({ status: "completed", deferred: 1, created: 0, skipped: 0, failed: 0 });
  expect(requests).toHaveLength(0);

  clock.now = now + 45_000;
  const round = await scanSession({ store, clock }).session.request({ accountId: ownerId, trigger: "refresh" });

  expect(autoImports()).toHaveLength(1);
  expect(round).toMatchObject({ created: 0, skipped: 0, failed: 1 });
  expect(round.failures[0]).toMatchObject({ assetId: "ph://limited", code: "AI_RATE_LIMITED" });
  expect(modelInputs).toEqual([images.limited!.toString("base64")]);
  expect(await database.db.financeTransaction.count()).toBe(2);
});

it("recovers a response lost after the server saved it by resending the same asset ID, without a second row", async () => {
  const store = new Map<string, string>();
  const clock = { now };
  const lost = scanSession({ store, clock, photos: ["ph://receipt"], loseResponse: new Set(["ph://receipt"]) });
  const first = await lost.session.request({ accountId: ownerId, trigger: "home" });
  expect(first).toMatchObject({ created: 0, failed: 1 });
  expect(first.failures[0]).toMatchObject({ kind: "network", retryAt: now + 30_000 });
  expect(lost.bindings).toHaveLength(0);
  const [row] = await database.db.financeTransaction.findMany();
  expect(row).toMatchObject({ dedupeKey: "slip:ph://receipt", deletedAt: null });

  clock.now = now + 30_000;
  const later = scanSession({ store, clock, photos: ["ph://receipt"] });
  const round = await later.session.request({ accountId: ownerId, trigger: "home" });

  expect(round).toMatchObject({ created: 0, skipped: 1, failed: 0 });
  expect(later.bindings).toEqual([{ accountId: ownerId, transactionId: row!.id, uri: "file:///library/receipt" }]);
  expect(autoImports()).toHaveLength(2);
  expect(modelInputs).toHaveLength(1);
  expect(await database.db.financeTransaction.count()).toBe(1);

  // Recovered: later rounds send nothing more.
  await later.session.request({ accountId: ownerId, trigger: "refresh" });
  expect(autoImports()).toHaveLength(2);
});

it("keeps a deleted import deleted and leaves its photo unbound when the photo is found again", async () => {
  await scanSession({ photos: ["ph://receipt"] }).session.request({ accountId: ownerId, trigger: "home" });
  const [row] = await database.db.financeTransaction.findMany();
  await rpc("ledger/deleteTransaction", { id: row!.id });

  const { session, bindings } = scanSession({ photos: ["ph://receipt"] });
  const round = await session.request({ accountId: ownerId, trigger: "home" });

  expect(round).toMatchObject({ created: 0, skipped: 1 });
  expect(bindings).toHaveLength(0);
  const rows = await database.db.financeTransaction.findMany();
  expect(rows).toHaveLength(1);
  expect(rows[0]!.deletedAt).not.toBeNull();
});

it("repairs a failed local binding from the remembered transaction ID without another import request", async () => {
  const store = new Map<string, string>();
  const failing = scanSession({
    store,
    bindImage: async () => {
      throw new Error("disk full");
    },
  });
  const first = await failing.session.request({ accountId: ownerId, trigger: "home" });
  expect(first).toMatchObject({ created: 2, skipped: 1, failed: 2 });
  const rows = await database.db.financeTransaction.findMany();
  requests.length = 0;

  const { session, bindings } = scanSession({ store });
  const round = await session.request({ accountId: ownerId, trigger: "home" });

  expect(round).toMatchObject({ created: 0, skipped: 0, failed: 0, deferred: 1 });
  expect(requests).toHaveLength(0);
  expect(bindings.map((binding) => binding.transactionId).sort()).toEqual(rows.map((row) => row.id).sort());
  expect(await database.db.financeTransaction.count()).toBe(2);
});

it("stops the round without writing when the session is not authenticated", async () => {
  const { session, bindings } = scanSession({ authenticated: false });
  const round = await session.request({ accountId: ownerId, trigger: "home" });
  expect(round.status).toBe("unauthorized");
  expect(round.failures[0]).toMatchObject({ code: "UNAUTHORIZED", status: 401 });
  expect(requests.length).toBeLessThanOrEqual(2);
  expect(bindings).toHaveLength(0);
  expect(modelInputs).toHaveLength(0);
  expect(await database.db.financeTransaction.count()).toBe(0);
});

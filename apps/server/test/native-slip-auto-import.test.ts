import { afterAll, beforeAll, beforeEach, expect, it } from "vite-plus/test";
import { Effect, Layer } from "effect";
import sharp from "sharp";
import { createAuth } from "@moojot/auth";
import { createAppRuntime } from "@moojot/api/runtime";
import { GeminiProvider } from "@moojot/api/features/import/gemini.provider";
import { ImportError } from "@moojot/api/features/import/import.error";
import { createServerApp } from "../src/app";
import { startTestDatabase } from "./mongo";
import { createSlipScanSession, type SlipScanPorts } from "../../native/features/slips/auto-import/scan-session";
import { createAutoImportTransport } from "../../native/features/slips/auto-import/transport";

// The native scan session and transport against the real authenticated route, Import, Ledger and MongoDB.
// Only the photo library, local image store and Gemini are replaced.

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

function scanSession(options: { authenticated?: boolean } = {}) {
  const bindings: { accountId: string; transactionId: string; uri: string }[] = [];
  let refreshes = 0;
  const send = createAutoImportTransport({
    baseUrl: env.BETTER_AUTH_URL,
    fetch: async (request) => {
      requests.push({
        path: new URL(request.url).pathname,
        csrf: request.headers.get("x-csrf-token"),
        cookie: request.headers.get("cookie"),
      });
      return app.fetch(request);
    },
    headers: (): Record<string, string> => (options.authenticated === false ? {} : { Cookie: cookie }),
  });
  const ports: SlipScanPorts = {
    now: () => now,
    photoAccess: async () => "all",
    albums: async () =>
      ["K PLUS", "Krungthai NEXT", "Paotang", "TrueMoney", "Camera Roll"].map((title) => ({ key: title, title })),
    pageAssets: async (album, query) =>
      Object.entries(library)
        .filter(([, photo]) => photo.album === album)
        .map(([id, photo]) => ({ id, creationTime: now - photo.age * day }))
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
    bindImage: async (accountId, transactionId, uri) => {
      bindings.push({ accountId, transactionId, uri });
    },
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

it("does not create another transaction when photos are sent again after local memory is lost", async () => {
  await scanSession().session.request({ accountId: ownerId, trigger: "home" });
  requests.length = 0;

  const { session, bindings } = scanSession();
  const round = await session.request({ accountId: ownerId, trigger: "home" });

  expect(round).toMatchObject({ created: 0, skipped: 3 });
  expect(bindings).toHaveLength(0);
  expect(await database.db.financeTransaction.count()).toBe(2);
  expect(requests.every((request) => request.path === "/rpc/import/slip/auto-import")).toBe(true);
});

it("resends only a temporarily failed photo in the next round of the same session", async () => {
  const { session } = scanSession();
  await session.request({ accountId: ownerId, trigger: "home" });
  requests.length = 0;
  modelInputs.length = 0;

  const round = await session.request({ accountId: ownerId, trigger: "refresh" });

  expect(requests).toHaveLength(1);
  expect(round).toMatchObject({ created: 0, skipped: 0, failed: 1 });
  expect(modelInputs).toEqual([images.limited!.toString("base64")]);
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

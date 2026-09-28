import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vite-plus/test";
import { Clock, Effect, Exit, Layer, Scope } from "effect";
import { TestClock } from "effect/testing";
import { createAuth } from "@moojot/auth";
import { createAppRuntime } from "@moojot/api/runtime";
import { GeminiProvider } from "@moojot/api/features/import/gemini.provider";
import { createServerApp } from "../src/app";
import { startTestDatabase } from "./mongo";
import sharp from "sharp";
import { ImportError } from "@moojot/api/features/import/import.error";
import { LedgerService } from "@moojot/api/features/ledger/ledger.service";

let database: Awaited<ReturnType<typeof startTestDatabase>>;
let runtime: ReturnType<typeof createAppRuntime>;
let app: ReturnType<typeof createServerApp>;
let cookie: string;
let auth: ReturnType<typeof createAuth>;
const env = {
  BETTER_AUTH_URL: "https://localhost:3333",
  BETTER_AUTH_SECRET: "test-only-secret-with-at-least-32-characters",
  CORS_ORIGIN: "http://localhost:3001",
  NODE_ENV: "development" as const,
};
let png: string;
let jpeg: string;
const candidate = { kind: "expense", amountSatang: 12550, occurredOn: "2026-09-28", title: "อาหาร", issues: [] };
let modelCalls = 0;
let modelResult: Effect.Effect<string | undefined, ImportError>;

const request = async (input: unknown, authenticated = true, options: RequestInit = {}, target = app) =>
  target.request("/rpc/import/slip/auto-import", {
    method: "POST",
    headers: { "content-type": "application/json", "x-csrf-token": "orpc", ...(authenticated ? { cookie } : {}) },
    body: JSON.stringify({ json: input }),
    ...options,
  });
const slip = (overrides: Record<string, unknown> = {}) => ({
  assetId: crypto.randomUUID(),
  fileBase64: png,
  mimeType: "image/png",
  ...overrides,
});
const body = async (response: Response) => ((await response.json()) as { json: Record<string, unknown> }).json;

beforeAll(async () => {
  database = await startTestDatabase();
  const image = sharp({ create: { width: 16, height: 16, channels: 3, background: "white" } });
  png = (await image.png().toBuffer()).toString("base64");
  jpeg = (await image.jpeg().toBuffer()).toString("base64");
  runtime = createAppRuntime(
    database.db,
    Layer.succeed(GeminiProvider, {
      extract: () =>
        Effect.suspend(() => {
          modelCalls++;
          return modelResult;
        }),
    })
  );
  auth = createAuth(env, database.db);
  app = createServerApp({ auth, db: database.db, runtime, env });
  const signup = await app.request("https://localhost:3333/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin: env.CORS_ORIGIN },
    body: JSON.stringify({ name: "Alice", email: "alice@example.test", password: "test-only-password" }),
  });
  expect(signup.status).toBe(200);
  cookie = signup.headers.get("set-cookie")!.split(";")[0]!;
}, 120_000);
afterAll(async () => {
  await runtime?.dispose();
  await database?.close();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function controlledClock() {
  const scope = Effect.runSync(Scope.make());
  const clock = await Effect.runPromise(TestClock.make().pipe(Scope.provide(scope)));
  const run = runtime.runPromiseExit.bind(runtime);
  vi.spyOn(runtime, "runPromiseExit").mockImplementation((effect, options) =>
    run(effect.pipe(Effect.provideService(Clock.Clock, clock)), options)
  );
  return {
    advance: (ms: number) => Effect.runPromise(clock.adjust(ms)),
    close: () => Effect.runPromise(Scope.close(scope, Exit.void)),
  };
}
beforeEach(async () => {
  modelCalls = 0;
  modelResult = Effect.succeed(JSON.stringify({ candidates: [candidate], warnings: [] }));
  await database.db.financeTransaction.deleteMany();
});

it("creates exactly one uncategorized transaction for the authenticated owner", async () => {
  const response = await app.request("/rpc/import/slip/auto-import", {
    method: "POST",
    headers: { "content-type": "application/json", cookie, "x-csrf-token": "orpc" },
    body: JSON.stringify({ json: { assetId: "photo-1", fileBase64: png, mimeType: "image/png" } }),
  });
  expect(response.status).toBe(200);
  const { json: outcome } = (await response.json()) as { json: { status: string; transactionId: string } };
  expect(outcome).toEqual({ status: "created", transactionId: expect.any(String), warnings: [] });
  expect(modelCalls).toBe(1);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  const rows = await database.db.financeTransaction.findMany();
  const owner = await database.db.user.findUniqueOrThrow({ where: { email: "alice@example.test" } });
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    id: outcome.transactionId,
    userId: owner.id,
    amountSatang: 12550n,
    occurredOn: "2026-09-28",
    title: "อาหาร",
    source: "slip",
    categoryId: null,
    slipImageUri: null,
    dedupeKey: "slip:photo-1",
    dedupeIdentity: "key:slip:photo-1",
  });
});

it("requires a real session before reading an image", async () => {
  const response = await request(slip(), false);
  expect(response.status).toBe(401);
  expect(await body(response)).toMatchObject({ code: "UNAUTHORIZED" });
  expect(modelCalls).toBe(0);
});

it("accepts original JPEG bytes", async () => {
  expect((await request(slip({ fileBase64: jpeg, mimeType: "image/jpeg" }))).status).toBe(200);
});

it.each([
  [{ assetId: "" }, 400, "INVALID_ASSET_ID"],
  [{ assetId: " photo" }, 400, "INVALID_ASSET_ID"],
  [{ assetId: "photo\n" }, 400, "INVALID_ASSET_ID"],
  [{ assetId: "a\u0000b" }, 400, "INVALID_ASSET_ID"],
  [{ assetId: "ก".repeat(86) }, 400, "INVALID_ASSET_ID"],
  [{ assetId: null }, 400, "INVALID_ASSET_ID"],
  [{ fileBase64: "" }, 400, "FILE_REQUIRED"],
  [{ fileBase64: undefined }, 400, "FILE_REQUIRED"],
  [{ fileBase64: "a===" }, 400, "INVALID_FILE"],
  [{ fileBase64: "AB==" }, 400, "INVALID_FILE"],
  [{ fileBase64: "data:image/png;base64,AAAA" }, 400, "INVALID_FILE"],
  [{ fileBase64: "AAAA\n" }, 400, "INVALID_FILE"],
  [{ fileBase64: "/9j/" }, 400, "INVALID_FILE"],
  [{ fileBase64: "R0lGODlh" }, 415, "UNSUPPORTED_IMAGE"],
  [{ mimeType: "application/pdf" }, 415, "UNSUPPORTED_IMAGE"],
  [{ mimeType: "image/jpeg" }, 415, "UNSUPPORTED_FILE"],
  [{ userId: "other-user" }, 400, "INVALID_REQUEST"],
  [{ dedupeKey: "chosen" }, 400, "INVALID_REQUEST"],
  [{ source: "statement" }, 400, "INVALID_REQUEST"],
  [{ categoryId: "food" }, 400, "INVALID_REQUEST"],
  [{ localUri: "file:///photo" }, 400, "INVALID_REQUEST"],
  [{ password: "secret" }, 400, "INVALID_REQUEST"],
  [{ model: "chosen-model" }, 400, "INVALID_REQUEST"],
] as const)("rejects invalid image input %# before Gemini", async (overrides, status, code) => {
  const response = await request(slip(overrides));
  expect(response.status).toBe(status);
  expect(await body(response)).toMatchObject({ code });
  expect(modelCalls).toBe(0);
  expect(await database.db.financeTransaction.count()).toBe(0);
});

it.each([10 * 1024 * 1024 + 1, 10 * 1024 * 1024 + 3])(
  "rejects oversized decoded/encoded images (%i bytes)",
  async (size) => {
    const response = await request(slip({ fileBase64: Buffer.alloc(size).toString("base64") }));
    expect(response.status).toBe(413);
    expect(await body(response)).toMatchObject({ code: "FILE_TOO_LARGE" });
    expect(modelCalls).toBe(0);
  }
);

it("skips a document without a candidate and preserves document warnings", async () => {
  modelResult = Effect.succeed(JSON.stringify({ candidates: [], warnings: ["ภาพไม่ชัด"] }));
  const response = await request(slip());
  expect(await body(response)).toEqual({
    status: "skipped",
    reason: "no_candidate",
    reasons: [],
    warnings: ["ภาพไม่ชัด"],
  });
  expect(await database.db.financeTransaction.count()).toBe(0);
});

it.each([
  ["amountSatang", undefined],
  ["amountSatang", null],
  ["amountSatang", 0],
  ["amountSatang", -10],
  ["amountSatang", 10.5],
  ["amountSatang", 9007199254740992],
  ["amountSatang", "100"],
  ["occurredOn", undefined],
  ["occurredOn", null],
  ["occurredOn", "2026-02-29"],
  ["occurredOn", "2026-04-31"],
  ["occurredOn", "2026-9-28"],
  ["occurredOn", 20260928],
] as const)("skips an incomplete %s (%s)", async (field, value) => {
  modelResult = Effect.succeed(
    JSON.stringify({ candidates: [{ ...candidate, [field]: value, issues: ["ตรวจสอบข้อมูล"] }], warnings: ["ภาพไม่ชัด"] })
  );
  const response = await request(slip());
  expect(response.status).toBe(200);
  expect(await body(response)).toEqual({
    status: "skipped",
    reason: "incomplete_candidate",
    reasons: [{ field, code: "required_or_invalid" }],
    warnings: ["ภาพไม่ชัด", "ตรวจสอบข้อมูล"],
  });
  expect(await database.db.financeTransaction.count()).toBe(0);
});

it("uses a fallback title while keeping AI issues as warnings", async () => {
  modelResult = Effect.succeed(
    JSON.stringify({ candidates: [{ ...candidate, title: " \t ", issues: ["ยอดเงินไม่ชัด"] }], warnings: ["ภาพจาง"] })
  );
  const response = await request(slip());
  expect(await body(response)).toMatchObject({
    status: "created",
    warnings: ["ภาพจาง", "ยอดเงินไม่ชัด", "ไม่พบชื่อรายการ ใช้ชื่อรายการจากสลิป"],
  });
  expect(await database.db.financeTransaction.findFirst()).toMatchObject({ title: "รายการจากสลิป" });
});

it.each(["income", "transfer"])("saves a complete %s candidate despite its warnings", async (kind) => {
  modelResult = Effect.succeed(
    JSON.stringify({ candidates: [{ ...candidate, kind, issues: ["ตรวจสอบอีกครั้ง"] }], warnings: [] })
  );
  expect(await body(await request(slip()))).toMatchObject({ status: "created", warnings: ["ตรวจสอบอีกครั้ง"] });
  expect(await database.db.financeTransaction.findFirst()).toMatchObject({ kind, categoryId: null });
});

it.each([
  undefined,
  "not json",
  "{}",
  "null",
  JSON.stringify({ candidates: [{ ...candidate, kind: "unknown" }], warnings: [] }),
  JSON.stringify({ candidates: [candidate, candidate], warnings: [] }),
  JSON.stringify({ candidates: [candidate, null], warnings: [] }),
  JSON.stringify({ candidates: [{ ...candidate, issues: "bad" }], warnings: [] }),
  JSON.stringify({ candidates: [candidate], warnings: [5] }),
])("rejects malformed model output %# without storing any part of it", async (output) => {
  modelResult = Effect.succeed(output);
  const response = await request(slip());
  expect(response.status).toBe(502);
  expect(await body(response)).toMatchObject({ code: "AI_INVALID_RESPONSE" });
  expect(await database.db.financeTransaction.count()).toBe(0);
});

it("retries a committed request by identity without another model call, including after deletion", async () => {
  const input = slip({ assetId: "photo/opaque:🧾" });
  // Discarding the first response simulates a response lost after the commit.
  await request(input);
  expect(await body(await request(input))).toEqual({
    status: "skipped",
    reason: "duplicate",
    reasons: [],
    warnings: [],
  });
  const row = await database.db.financeTransaction.findFirstOrThrow();
  await runtime.runPromise(LedgerService.use((ledger) => ledger.deleteTransaction(row.userId, { id: row.id })));
  expect(await body(await request(input))).toMatchObject({ status: "skipped", reason: "duplicate" });
  expect(modelCalls).toBe(1);
  expect(await database.db.financeTransaction.count()).toBe(1);
});

it("treats identical extracted fields from different assets independently", async () => {
  expect(await body(await request(slip()))).toMatchObject({ status: "created" });
  expect(await body(await request(slip()))).toMatchObject({ status: "created" });
  expect(await database.db.financeTransaction.count()).toBe(2);
});

it("settles simultaneous requests for the same asset using the unique index", async () => {
  const input = slip();
  const responses = await Promise.all([request(input), request(input)]);
  const outcomes = await Promise.all(responses.map(body));
  expect(outcomes.map((outcome) => outcome.status).sort()).toEqual(["created", "skipped"]);
  expect(outcomes.find((outcome) => outcome.status === "skipped")).toMatchObject({ reason: "duplicate" });
  expect(await database.db.financeTransaction.count()).toBe(1);
});

it("keeps each image result independent when another image is skipped or fails", async () => {
  const created = await body(await request(slip()));
  modelResult = Effect.succeed(JSON.stringify({ candidates: [], warnings: [] }));
  const skipped = await body(await request(slip()));
  modelResult = Effect.fail(new ImportError({ code: "AI_UNAVAILABLE" }));
  const failed = await request(slip());
  expect([created.status, skipped.status, failed.status]).toEqual(["created", "skipped", 503]);
  expect(await database.db.financeTransaction.count()).toBe(1);
});

it.each([
  ["P1001", 503, "PERSISTENCE_UNAVAILABLE"],
  ["P2000", 500, "PERSISTENCE_FAILED"],
] as const)("maps database read failure %s without calling Gemini", async (code, status, expected) => {
  vi.spyOn(database.db.financeTransaction, "findUnique").mockRejectedValueOnce({
    code,
    message: "private database details",
  });
  const response = await request(slip());
  expect(response.status).toBe(status);
  expect(await body(response)).toMatchObject({ code: expected });
  expect(modelCalls).toBe(0);
});

it("does not disguise an unrelated unique conflict as a duplicate", async () => {
  await request(slip());
  await database.db.$runCommandRaw({
    createIndexes: "finance_transaction",
    indexes: [{ key: { userId: 1, title: 1 }, name: "test_unrelated_unique", unique: true }],
  });
  try {
    const response = await request(slip());
    expect(response.status).toBe(500);
    expect(await body(response)).toMatchObject({ code: "PERSISTENCE_FAILED" });
    expect(await database.db.financeTransaction.count()).toBe(1);
  } finally {
    await database.db.$runCommandRaw({ dropIndexes: "finance_transaction", index: "test_unrelated_unique" });
  }
});

it("bounds Gemini concurrency to two with two FIFO waiters", async () => {
  const releases: Array<() => void> = [];
  modelResult = Effect.callback<string>((resume) => {
    releases.push(() => resume(Effect.succeed(JSON.stringify({ candidates: [], warnings: [] }))));
  });
  const requests: Array<Promise<Response>> = [];
  requests.push(request(slip()));
  await vi.waitFor(() => expect(modelCalls).toBe(1));
  requests.push(request(slip()));
  await vi.waitFor(() => expect(modelCalls).toBe(2));
  const order: string[] = [];
  const lookup = database.db.financeTransaction.findUnique.bind(database.db.financeTransaction);
  vi.spyOn(database.db.financeTransaction, "findUnique").mockImplementation((args) => {
    order.push(args.where.userId_dedupeIdentity!.dedupeIdentity);
    return lookup(args);
  });
  requests.push(
    request(slip({ assetId: "fifo-first" })).then((response) => {
      order.push("first-done");
      return response;
    })
  );
  await vi.waitFor(() => expect(order).toContain("key:slip:fifo-first"));
  requests.push(
    request(slip({ assetId: "fifo-second" })).then((response) => {
      order.push("second-done");
      return response;
    })
  );
  await vi.waitFor(() => expect(order).toContain("key:slip:fifo-second"));
  const busy = await request(slip());
  expect(busy.status).toBe(429);
  expect(await body(busy)).toMatchObject({ code: "BUSY" });
  expect(busy.headers.get("retry-after")).toBe("30");
  expect(modelCalls).toBe(2);
  releases[0]!();
  await vi.waitFor(() => expect(modelCalls).toBe(3));
  releases[2]!();
  await vi.waitFor(() => expect(order).toContain("first-done"));
  expect(order).not.toContain("second-done");
  await vi.waitFor(() => expect(modelCalls).toBe(4));
  releases[1]!();
  releases[3]!();
  expect((await Promise.all(requests)).map((response) => response.status)).toEqual([200, 200, 200, 200]);
});

it("expires a queued request after ten seconds and frees its place", async () => {
  const clock = await controlledClock();
  const controllers = [new AbortController(), new AbortController()];
  modelResult = Effect.never;
  const active = controllers.map((controller) => request(slip(), true, { signal: controller.signal }));
  try {
    await vi.waitFor(() => expect(modelCalls).toBe(2));
    const waiting = request(slip());
    await new Promise((resolve) => setTimeout(resolve, 50));
    await clock.advance(10_000);
    const response = await waiting;
    expect(response.status).toBe(429);
    expect(await body(response)).toMatchObject({ code: "BUSY" });
    expect(response.headers.get("retry-after")).toBe("30");
    expect(modelCalls).toBe(2);
  } finally {
    controllers.forEach((controller) => controller.abort());
    await Promise.all(active);
    await clock.close();
  }
});

it("times out Gemini at 110 seconds without a retry or write", async () => {
  const clock = await controlledClock();
  try {
    modelResult = Effect.never;
    const pending = request(slip());
    await vi.waitFor(() => expect(modelCalls).toBe(1));
    await clock.advance(110_000);
    const response = await pending;
    expect(response.status).toBe(504);
    expect(await body(response)).toMatchObject({ code: "AI_TIMEOUT" });
    expect(modelCalls).toBe(1);
    expect(await database.db.financeTransaction.count()).toBe(0);
  } finally {
    await clock.close();
  }
});

it("times out a stalled preflight at 140 seconds and never begins a write", async () => {
  const clock = await controlledClock();
  let release!: () => void;
  const lookup = vi.spyOn(database.db.financeTransaction, "findUnique").mockReturnValueOnce(
    new Promise<null>((resolve) => {
      release = () => resolve(null);
    }) as ReturnType<typeof database.db.financeTransaction.findUnique>
  );
  try {
    const pending = request(slip());
    await vi.waitFor(() => expect(lookup).toHaveBeenCalled());
    await clock.advance(140_000);
    const response = await pending;
    expect(response.status).toBe(504);
    expect(await body(response)).toMatchObject({ code: "IMPORT_TIMEOUT" });
    release();
    expect(modelCalls).toBe(0);
    expect(await database.db.financeTransaction.count()).toBe(0);
  } finally {
    release();
    await clock.close();
  }
});

it("awaits the real creation result even after disconnect and the pre-write deadline", async () => {
  const clock = await controlledClock();
  const controller = new AbortController();
  const create = database.db.financeTransaction.create.bind(database.db.financeTransaction);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const writing = vi
    .spyOn(database.db.financeTransaction, "create")
    .mockImplementation((args) => gate.then(() => create(args)) as ReturnType<typeof create>);
  try {
    let settled = false;
    const pending = request(slip(), true, { signal: controller.signal }).then((response) => {
      settled = true;
      return response;
    });
    await vi.waitFor(() => expect(writing).toHaveBeenCalled());
    controller.abort();
    await clock.advance(200_000);
    expect(settled).toBe(false);
    release();
    expect(await body(await pending)).toMatchObject({ status: "created" });
    expect(await database.db.financeTransaction.count()).toBe(1);
  } finally {
    release();
    await clock.close();
  }
});

it("releases both queue places and active permits when requests disconnect", async () => {
  const controllers = Array.from({ length: 4 }, () => new AbortController());
  let canceledModels = 0;
  modelResult = Effect.never.pipe(
    Effect.onInterrupt(() =>
      Effect.sync(() => {
        canceledModels++;
      })
    )
  );
  const pending: Array<Promise<Response>> = [];
  try {
    pending.push(...controllers.slice(0, 2).map((controller) => request(slip(), true, { signal: controller.signal })));
    await vi.waitFor(() => expect(modelCalls).toBe(2));
    pending.push(...controllers.slice(2).map((controller) => request(slip(), true, { signal: controller.signal })));
    await new Promise((resolve) => setTimeout(resolve, 50));
    controllers[2]!.abort();
    controllers[3]!.abort();
    await Promise.all(pending.slice(2));
    expect(modelCalls).toBe(2);
    controllers[0]!.abort();
    controllers[1]!.abort();
    await Promise.all(pending);
    expect(canceledModels).toBe(2);
    modelResult = Effect.succeed(JSON.stringify({ candidates: [], warnings: [] }));
    const responses = await Promise.all([request(slip()), request(slip())]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(await database.db.financeTransaction.count()).toBe(0);
  } finally {
    controllers.forEach((controller) => controller.abort());
    await Promise.all(pending);
  }
});

it.each([
  [429, "AI_RATE_LIMITED", 429],
  [500, "AI_UNAVAILABLE", 503],
  [503, "AI_UNAVAILABLE", 503],
  [400, "AI_UPSTREAM_ERROR", 502],
  [401, "AI_UPSTREAM_ERROR", 502],
] as const)("maps real SDK HTTP %i errors and never retries", async (upstreamStatus, code, status) => {
  const fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ error: { message: "SECRET-model-and-key-details" } }), {
      status: upstreamStatus,
      headers: { "content-type": "application/json", "retry-after": "75" },
    })
  );
  vi.stubGlobal("fetch", fetch);
  const providerRuntime = createAppRuntime(
    database.db,
    GeminiProvider.layer({ apiKey: "test-only-key-aaaaaaaaaaaaaaaaaaaa", model: "gemini-test" })
  );
  try {
    const server = createServerApp({ auth, db: database.db, runtime: providerRuntime, env });
    const response = await request(slip(), true, {}, server);
    expect(response.status).toBe(status);
    expect(await body(response)).toMatchObject({ code });
    expect(fetch).toHaveBeenCalledTimes(1);
    if (upstreamStatus === 429) expect(response.headers.get("retry-after")).toBe("75");
    expect(await database.db.financeTransaction.count()).toBe(0);
  } finally {
    await providerRuntime.dispose();
  }
});

it("uses the configured model with store=false and a slip-only response schema", async () => {
  const fetch = vi.fn().mockResolvedValue(
    Response.json({
      id: "test-interaction",
      status: "completed",
      steps: [
        {
          type: "model_output",
          content: [{ type: "text", text: JSON.stringify({ candidates: [candidate], warnings: [] }) }],
        },
      ],
    })
  );
  vi.stubGlobal("fetch", fetch);
  const providerRuntime = createAppRuntime(
    database.db,
    GeminiProvider.layer({ apiKey: "test-only-key-aaaaaaaaaaaaaaaaaaaa", model: "gemini-test" })
  );
  try {
    const server = createServerApp({ auth, db: database.db, runtime: providerRuntime, env });
    expect(await body(await request(slip(), true, {}, server))).toMatchObject({ status: "created" });
    const sent = fetch.mock.calls[0]![0] as Request;
    const payload = (await sent.json()) as {
      model: string;
      store: boolean;
      response_format: { schema: { properties: { candidates: { maxItems: number } } } };
    };
    expect(payload).toMatchObject({ model: "gemini-test", store: false });
    expect(payload.response_format.schema.properties.candidates.maxItems).toBe(1);
    expect(JSON.stringify(payload.response_format)).not.toContain("confidence");
    expect(fetch).toHaveBeenCalledTimes(1);
  } finally {
    await providerRuntime.dispose();
  }
});

it.each([
  { apiKey: "", model: "gemini-test" },
  { apiKey: "short", model: "gemini-test" },
  { apiKey: "test-only-key-aaaaaaaaaaaaaaaaaaaa", model: "" },
  { apiKey: "test-only-key-aaaaaaaaaaaaaaaaaaaa", model: " https://bad/model" },
])("refuses to start the runtime with invalid local Gemini configuration %#", async (config) => {
  const invalid = createAppRuntime(database.db, GeminiProvider.layer(config));
  try {
    await expect(invalid.runPromise(Effect.void)).rejects.toMatchObject({ _tag: "GeminiConfigurationError" });
  } finally {
    await invalid.dispose();
  }
});

it.each([
  "/rpc/import/slip",
  "/rpc/import/statement",
  "/api-reference/import/slip",
  "/api-reference/import/statement",
  "/rpc/import/autoImportSlip",
])("removes the obsolete or noncanonical URL %s", async (path) => {
  const response = await app.request(path, {
    method: "POST",
    headers: { "content-type": "application/json", "x-csrf-token": "orpc", cookie },
    body: JSON.stringify({ json: slip() }),
  });
  expect(response.status).toBe(404);
  expect(modelCalls).toBe(0);
});

it("rejects an oversized HTTP body before attempting to parse RPC JSON", async () => {
  const response = await request(null, true, { body: "!".repeat(14 * 1024 * 1024 + 1) });
  expect(response.status).toBe(413);
  expect(await body(response)).toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(modelCalls).toBe(0);
});

it("gives malformed HTTP JSON the stable INVALID_REQUEST code", async () => {
  const response = await request(null, true, { body: "{" });
  expect(response.status).toBe(400);
  expect(await body(response)).toMatchObject({ code: "INVALID_REQUEST" });
});

it("preserves native development CORS and exposes retry headers", async () => {
  const response = await app.request("/rpc/import/slip/auto-import", {
    method: "OPTIONS",
    headers: {
      origin: "http://localhost:8081",
      "access-control-request-method": "POST",
      "access-control-request-headers": "content-type,x-csrf-token",
    },
  });
  expect(response.status).toBe(204);
  expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:8081");
  expect(response.headers.get("access-control-allow-credentials")).toBe("true");
  const imported = await request(slip(), true, {
    headers: { "content-type": "application/json", "x-csrf-token": "orpc", cookie, origin: "http://localhost:8081" },
  });
  expect(imported.headers.get("access-control-expose-headers")).toContain("Retry-After");
});

it("preserves historical statement transactions after cutover", async () => {
  const owner = await database.db.user.findUniqueOrThrow({ where: { email: "alice@example.test" } });
  const historical = await runtime.runPromise(
    LedgerService.use((ledger) =>
      ledger.createTransaction(owner.id, {
        kind: "expense",
        amountSatang: 4500,
        occurredOn: "2025-01-01",
        title: "Old statement",
        source: "statement",
      })
    )
  );
  await request(slip());
  const saved = await runtime.runPromise(LedgerService.use((ledger) => ledger.getTransaction(owner.id, historical.id)));
  expect(saved).toMatchObject({ id: historical.id, source: "statement", amountSatang: 4500 });
});

it("keeps the same asset ID independent across authenticated users", async () => {
  const input = slip({ assetId: "shared-device-asset" });
  await request(input);
  const signup = await app.request("https://localhost:3333/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin: env.CORS_ORIGIN },
    body: JSON.stringify({ name: "Bob", email: "bob@example.test", password: "test-only-password" }),
  });
  const bobCookie = signup.headers.get("set-cookie")!.split(";")[0]!;
  const response = await request(input, true, {
    headers: { "content-type": "application/json", "x-csrf-token": "orpc", cookie: bobCookie },
  });
  expect(await body(response)).toMatchObject({ status: "created" });
  const rows = await database.db.financeTransaction.findMany();
  expect(rows).toHaveLength(2);
  expect(new Set(rows.map((row) => row.userId)).size).toBe(2);
});

it("authenticates a request without a CSRF header before reporting other input problems", async () => {
  const response = await request(slip(), false, { headers: { "content-type": "application/json" } });
  expect(response.status).toBe(401);
  expect(await body(response)).toMatchObject({ code: "UNAUTHORIZED" });
});

it("enforces the HTTP byte limit even if Content-Length understates the body", async () => {
  const response = await request(null, true, {
    headers: { "content-type": "application/json", "content-length": "1", "x-csrf-token": "orpc", cookie },
    body: "!".repeat(14 * 1024 * 1024 + 1),
  });
  expect(response.status).toBe(413);
  expect(await body(response)).toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
});

it("does not write or call Gemini for an already disconnected request", async () => {
  const controller = new AbortController();
  controller.abort();
  await request(slip(), true, { signal: controller.signal });
  expect(modelCalls).toBe(0);
  expect(await database.db.financeTransaction.count()).toBe(0);
});

it("does not expose an unguarded trailing-slash alias for the import URL", async () => {
  const response = await app.request("/rpc/import/slip/auto-import/", {
    method: "POST",
    headers: { "content-type": "application/json", "x-csrf-token": "orpc", cookie },
    body: JSON.stringify({ json: slip() }),
  });
  expect(response.status).toBe(404);
  expect(modelCalls).toBe(0);
});

it("omits private input, model output and database details from errors and logs", async () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const privateText = "PRIVATE-model-secret-8b14";
  modelResult = Effect.succeed(privateText);
  const invalid = await request(slip());
  expect(await invalid.text()).not.toContain(privateText);
  vi.spyOn(database.db.financeTransaction, "findUnique").mockRejectedValueOnce({ code: "P1001", message: privateText });
  expect(await (await request(slip())).text()).not.toContain(privateText);
  modelResult = Effect.die(new Error(privateText));
  const defect = await request(slip());
  expect(defect.status).toBe(500);
  expect(await body(defect)).toMatchObject({ code: "IMPORT_FAILED" });
  await new Promise((resolve) => setTimeout(resolve, 10));
  const logs = JSON.stringify([log.mock.calls, errorLog.mock.calls, warn.mock.calls]);
  expect(logs).not.toContain(privateText);
  expect(logs).not.toContain(png);
  expect(logs).not.toContain(cookie);
});

it("settles a first-ever concurrent import without category initialization races", async () => {
  await database.db.financeCategory.deleteMany();
  const input = slip();
  const outcomes = await Promise.all([request(input), request(input)]).then((responses) =>
    Promise.all(responses.map(body))
  );
  expect(outcomes.map((outcome) => outcome.status).sort()).toEqual(["created", "skipped"]);
  expect(await database.db.financeTransaction.count()).toBe(1);
});

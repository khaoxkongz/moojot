import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { Effect, Layer } from "effect";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { SimpleCsrfProtectionLinkPlugin } from "@orpc/client/plugins";
import type { AppRouterClient } from "@moojot/api/features/index";
import { createAuth } from "@moojot/auth";
import { createAppRuntime } from "@moojot/api/runtime";
import { GeminiProvider } from "@moojot/api/features/import/gemini.provider";
import { createServerApp } from "../src/app";
import { startTestDatabase } from "./mongo";
import { createEntryActions } from "../../native/features/entries/entry-actions";
import { summaryMonth } from "../../native/features/summary/summary";

// Summary's totals, bars and trend against the real authenticated routes and MongoDB. Native modules are imported by
// path, as in home-filter-queue.test.ts.

const env = {
  BETTER_AUTH_URL: "https://localhost:3333",
  BETTER_AUTH_SECRET: "test-only-secret-with-at-least-32-characters",
  CORS_ORIGIN: "http://localhost:3001",
  NODE_ENV: "development" as const,
};
const today = "2026-10-02";

let database: Awaited<ReturnType<typeof startTestDatabase>>;
let runtime: ReturnType<typeof createAppRuntime>;
let app: ReturnType<typeof createServerApp>;

async function signUp(email: string) {
  const response = await app.request(`${env.BETTER_AUTH_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: env.CORS_ORIGIN },
    body: JSON.stringify({ name: "Summary", email, password: "test-only-password" }),
  });
  expect(response.status).toBe(200);
  const cookie = response.headers.get("set-cookie")!.split(";")[0]!;
  const client: AppRouterClient = createORPCClient(
    new RPCLink({
      url: `${env.BETTER_AUTH_URL}/rpc`,
      plugins: [new SimpleCsrfProtectionLinkPlugin()],
      headers: { cookie },
      fetch: async (request) => app.fetch(request),
    })
  );
  await client.ledger.initializeDatabase();
  return client;
}

type Client = Awaited<ReturnType<typeof signUp>>;
type EntryInput = Parameters<Client["ledger"]["createTransaction"]>[0];
const add = (client: Client, kind: EntryInput["kind"], amountSatang: number, patch: Partial<EntryInput> = {}) =>
  client.ledger.createTransaction({ kind, amountSatang, occurredOn: today, title: kind, ...patch });

beforeAll(async () => {
  database = await startTestDatabase();
  runtime = createAppRuntime(
    database.db,
    Layer.succeed(GeminiProvider, { extract: () => Effect.die("Unused test provider") })
  );
  app = createServerApp({ auth: createAuth(env, database.db), db: database.db, runtime, env });
}, 120_000);

afterAll(async () => {
  await runtime?.dispose();
  await database?.close();
});

describe("Summary totals", () => {
  it("totals a month by its own bounds when the month starts on the 25th", async () => {
    const client = await signUp("custom-start@example.test");
    await client.financePreferences.setMonthStartDay({ day: 25 });
    await add(client, "expense", 100, { occurredOn: "2026-09-24" }); // last day of the month that started 25 ส.ค.
    await add(client, "expense", 2_000, { occurredOn: "2026-09-25" }); // first day of กันยายน's month
    await add(client, "income", 50_000, { occurredOn: "2026-10-01" });
    await add(client, "transfer", 7_000, { occurredOn: "2026-10-02" });
    await add(client, "expense", 300, { occurredOn: "2026-10-24" }); // its last day
    await add(client, "expense", 9_999, { occurredOn: "2026-10-25" }); // the next month: never counted

    const month = summaryMonth(today, 0, await client.financePreferences.getMonthStartDay());
    expect(month).toMatchObject({ from: "2026-09-25", to: "2026-10-24" });
    expect(await client.analytics.getPeriodSummary({ from: month.from, to: month.to })).toMatchObject({
      incomeSatang: 50_000,
      expenseSatang: 2_300,
      transferSatang: 7_000,
      transferCount: 1,
      netSatang: 47_700,
    });
    const before = summaryMonth(today, -1, 25);
    expect(await client.analytics.getPeriodSummary({ from: before.from, to: before.to })).toMatchObject({
      incomeSatang: 0,
      expenseSatang: 100,
      netSatang: -100,
    });
  });
});

describe("Summary bars", () => {
  it("shares a tag of the kind's whole total, so an entry with two tags counts in both and shares pass 100%", async () => {
    const client = await signUp("tags@example.test");
    const trip = await client.ledger.createTag({ name: "เที่ยว" });
    const work = await client.ledger.createTag({ name: "งาน" });
    await add(client, "expense", 30_000, { tagIds: [trip.id, work.id] });
    await add(client, "expense", 10_000, { tagIds: [trip.id] });
    await add(client, "expense", 60_000); // no tag: part of the base, never a bar of its own
    await add(client, "income", 99_900, { tagIds: [work.id] }); // the other kind
    await add(client, "expense", 77_700, { tagIds: [work.id], occurredOn: "2026-09-30" }); // another month

    const month = summaryMonth(today, 0, 1);
    const tags = await client.analytics.getTagBreakdown({ from: month.from, to: month.to, kind: "expense" });
    expect(tags.map((tag) => [tag.tagName, tag.totalSatang, tag.transactionCount, tag.percentage])).toEqual([
      ["ไม่มีแท็ก", 60_000, 1, 60],
      ["เที่ยว", 40_000, 2, 40],
      ["งาน", 30_000, 1, 30],
    ]);
  });

  it("gives the pending group the ids of its entries, newest first, within the month, kind and filter", async () => {
    const client = await signUp("pending@example.test");
    const kbank = { bank: "KBank" };
    const older = await add(client, "expense", 500, { occurredOn: "2026-10-01", ...kbank });
    const newer = await add(client, "expense", 200, kbank);
    await add(client, "expense", 900, { ...kbank, categoryId: "expense-food" });
    const ktc = await add(client, "expense", 400, { cardName: "KTC", cardLast4: "4821" }); // outside the filter
    await add(client, "income", 700, kbank); // the other kind
    await add(client, "transfer", 800, kbank); // never pending
    await add(client, "expense", 300, { occurredOn: "2026-09-30", ...kbank }); // another month

    const month = summaryMonth(today, 0, 1);
    const groups = await client.analytics.getCategoryBreakdown({
      from: month.from,
      to: month.to,
      kind: "expense",
      walletFilter: { banks: ["KBank"], cards: [], includeUnspecified: false },
    });
    expect(groups.map((group) => [group.categoryId, group.totalSatang, group.transactionCount])).toEqual([
      ["expense-food", 900, 1],
      [null, 700, 2],
    ]);
    expect(groups.find((group) => !group.categoryId)?.pendingIds).toEqual([newer.id, older.id]);
    expect(groups.find((group) => group.categoryId)?.pendingIds).toEqual([]);

    // The queue opened from that group saves a pick, and the bars read it back.
    const queue = { ids: groups.find((group) => !group.categoryId)!.pendingIds, index: 0 };
    await createEntryActions(client.ledger).setCategory(queue.ids[0]!, "expense-transport");
    const after = await client.analytics.getCategoryBreakdown({ from: month.from, to: month.to, kind: "expense" });
    // Unfiltered now, so the KTC entry counts too.
    expect(after.find((group) => !group.categoryId)).toMatchObject({
      pendingIds: [ktc.id, older.id],
      totalSatang: 900,
    });
    expect(after.find((group) => group.categoryId === "expense-transport")).toMatchObject({ totalSatang: 200 });
  });
});

describe("Summary trend", () => {
  it("shows six months ending at the month on screen, each by its own custom bounds, under the filter", async () => {
    const client = await signUp("trend@example.test");
    await client.financePreferences.setMonthStartDay({ day: 25 });
    const kbank = { bank: "KBank" };
    await add(client, "expense", 1_000, { occurredOn: "2026-03-25", ...kbank }); // มีนาคม's month (25 มี.ค. – 24 เม.ย.)
    await add(client, "expense", 2_000, { occurredOn: "2026-05-24", ...kbank }); // เมษายน's month (25 เม.ย. – 24 พ.ค.)
    await add(client, "expense", 3_000, { occurredOn: "2026-08-25", ...kbank }); // สิงหาคม's month
    await add(client, "expense", 4_000, { occurredOn: "2026-08-26", cardName: "KTC", cardLast4: "4821" });
    await add(client, "income", 5_000, { occurredOn: "2026-09-01", ...kbank });
    await add(client, "expense", 6_000, { occurredOn: "2026-09-25", ...kbank }); // กันยายน's month: after the one shown

    const month = summaryMonth(today, -1, 25); // สิงหาคม: 25 ส.ค. – 24 ก.ย.
    const trend = await client.analytics.getMonthlyTrend({
      count: 6,
      asOf: month.from,
      walletFilter: { banks: ["KBank"], cards: [], includeUnspecified: false },
    });
    expect(trend.map((item) => [item.periodKey, item.from, item.to, item.expenseSatang, item.incomeSatang])).toEqual([
      ["2026-03", "2026-03-25", "2026-04-24", 1_000, 0],
      ["2026-04", "2026-04-25", "2026-05-24", 2_000, 0],
      ["2026-05", "2026-05-25", "2026-06-24", 0, 0],
      ["2026-06", "2026-06-25", "2026-07-24", 0, 0],
      ["2026-07", "2026-07-25", "2026-08-24", 0, 0],
      ["2026-08", "2026-08-25", "2026-09-24", 3_000, 5_000],
    ]);
  });
});

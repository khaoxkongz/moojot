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
import { homeDays, loadAllEntries, needsCategory } from "../../native/features/home/home-days";
import {
  canSkipInQueue,
  currentInQueue,
  nextInQueue,
  openCategoryQueue,
  queueDoneMessage,
  queueProgress,
} from "../../native/features/entries/category-queue";
import { createEntryActions } from "../../native/features/entries/entry-actions";
import { entryWallet } from "../../native/features/wallets/entry-wallet";

// Home's filter, day list and pending-category queue against the real authenticated routes and MongoDB. Native modules
// are imported by path, as in manual-entry.test.ts.

const env = {
  BETTER_AUTH_URL: "https://localhost:3333",
  BETTER_AUTH_SECRET: "test-only-secret-with-at-least-32-characters",
  CORS_ORIGIN: "http://localhost:3001",
  NODE_ENV: "development" as const,
};
const today = "2026-09-30";

let database: Awaited<ReturnType<typeof startTestDatabase>>;
let runtime: ReturnType<typeof createAppRuntime>;
let app: ReturnType<typeof createServerApp>;

async function signUp(email: string) {
  const response = await app.request(`${env.BETTER_AUTH_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: env.CORS_ORIGIN },
    body: JSON.stringify({ name: "Home", email, password: "test-only-password" }),
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
const expense = (client: Client, patch: Partial<Parameters<Client["ledger"]["createTransaction"]>[0]>) =>
  client.ledger.createTransaction({ kind: "expense", amountSatang: 100, occurredOn: today, title: "x", ...patch });

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

describe("wallet filter", () => {
  it("counts only entries with no bank or card as ไม่ระบุ, even manual ones", async () => {
    const client = await signUp("unspecified@example.test");
    const none = await expense(client, { title: "เงินสด", source: "manual" });
    await expense(client, { title: "จดเองกสิกร", bank: "KBank", source: "manual" });
    await expense(client, { title: "จดเองบัตร", cardName: "KTC", cardLast4: "4821", source: "manual" });
    await expense(client, { title: "สลิปกสิกร", bank: "KBank", source: "slip" });
    const unspecified = { banks: [], cards: [], includeUnspecified: true };

    const rows = await client.ledger.listTransactions({ walletFilter: unspecified });
    expect(rows.map((row) => row.id)).toEqual([none.id]);
    const summary = await client.analytics.getPeriodSummary({ from: today, to: today, walletFilter: unspecified });
    expect(summary).toMatchObject({ expenseSatang: 100, transactionCount: 1 });
  });

  it("puts each entry under the wallet the app names it by", async () => {
    const client = await signUp("entry-wallet@example.test");
    const shapes = [
      { bank: "KBank" },
      { bank: "KBank", cardLast4: "4821" },
      { cardName: "KTC", cardLast4: "4821" },
      { bank: "KBank", cardName: "KTC" },
      { cardLast4: "4821" },
      {},
    ];
    for (const shape of shapes) {
      const row = await expense(client, shape);
      const wallet = entryWallet(row);
      const filter = {
        banks: wallet.type === "bank" ? [wallet.bank] : [],
        cards: wallet.type === "card" ? [wallet.card] : [],
        includeUnspecified: wallet.type === "unspecified",
      };
      const matched = await client.ledger.listTransactions({ walletFilter: filter });
      expect(
        matched.map((entry) => entry.id),
        JSON.stringify(shape)
      ).toContain(row.id);
      const summary = await client.analytics.getPeriodSummary({ from: today, to: today, walletFilter: filter });
      expect(summary.transactionCount, JSON.stringify(shape)).toBe(matched.length);
    }
  });

  it("still reads a filter from an older app that names ไม่ระบุ includeOther", async () => {
    const client = await signUp("legacy-filter@example.test");
    const none = await expense(client, { title: "เงินสด" });
    await expense(client, { title: "กสิกร", bank: "KBank" });
    const legacy = { banks: [], cards: [], includeOther: true, includeDeletedCards: true };

    const rows = await client.ledger.listTransactions({ walletFilter: legacy });
    expect(rows.map((row) => row.id)).toEqual([none.id]);
    const summary = await client.analytics.getPeriodSummary({ from: today, to: today, walletFilter: legacy });
    expect(summary).toMatchObject({ expenseSatang: 100, transactionCount: 1 });
  });
});

describe("home day list", () => {
  it("reads every page of a period, so day totals and counts are not cut at 1,000 rows", async () => {
    const client = await signUp("many@example.test");
    const user = await database.db.user.findFirstOrThrow({ where: { email: "many@example.test" } });
    const rows = Array.from({ length: 1001 }, (_, index) => {
      const id = crypto.randomUUID();
      return {
        id,
        userId: user.id,
        kind: "expense",
        amountSatang: 100n,
        occurredOn: today,
        title: `แถว ${index}`,
        source: "manual",
        categoryId: index === 0 ? null : "expense-food",
        dedupeIdentity: `id:${id}`,
        recurringIdentity: `id:${id}`,
      };
    });
    await database.db.financeTransaction.createMany({ data: rows });
    await expense(client, { occurredOn: "2026-09-29", amountSatang: 5000, categoryId: "expense-food" });

    const entries = await loadAllEntries((filters) => client.ledger.listTransactions(filters), {
      from: "2026-09-01",
      to: today,
    });
    expect(entries).toHaveLength(1002);
    const days = homeDays(entries, { today, categories: [] });
    expect(days.map((day) => [day.date, day.rows.length, day.totalSatang])).toEqual([
      [today, 1001, 100100],
      ["2026-09-29", 1, 5000],
    ]);
  }, 60_000);

  it("pages entries recorded at the same moment in one fixed order, so no page repeats or drops one", async () => {
    const client = await signUp("same-moment@example.test");
    const user = await database.db.user.findFirstOrThrow({ where: { email: "same-moment@example.test" } });
    const createdAt = new Date("2026-09-30T05:00:00.000Z");
    // Stored in ascending id order: without a final tiebreaker the database is free to return them in any order.
    const ids = Array.from({ length: 6 }, (_, index) => `00000000-0000-4000-8000-00000000000${index}`);
    await database.db.financeTransaction.createMany({
      data: ids.map((id) => ({
        id,
        userId: user.id,
        kind: "expense",
        amountSatang: 100n,
        occurredOn: today,
        title: id,
        source: "manual",
        createdAt,
        updatedAt: createdAt,
        dedupeIdentity: `id:${id}`,
        recurringIdentity: `id:${id}`,
      })),
    });

    const pages = [];
    for (let offset = 0; offset < ids.length; offset += 2) {
      pages.push(...(await client.ledger.listTransactions({ from: today, to: today, limit: 2, offset })));
    }
    expect(pages.map((row) => row.id)).toEqual([...ids].reverse());
  });
});

describe("pending-category queue", () => {
  it("queues the scope it was opened for, saves each pick and skips what was dealt with elsewhere", async () => {
    const client = await signUp("queue@example.test");
    const entries = createEntryActions(client.ledger);
    const first = await expense(client, { title: "7-Eleven", source: "slip", bank: "KBank" });
    const second = await expense(client, { title: "Grab" });
    const third = await expense(client, { title: "ข้าว" });
    await expense(client, { title: "มีหมวดแล้ว", categoryId: "expense-food" });
    await client.ledger.createTransaction({ kind: "transfer", amountSatang: 100, occurredOn: today, title: "ย้าย" });
    const yesterday = await expense(client, { title: "เมื่อวาน", occurredOn: "2026-09-29" });
    const readToday = () => loadAllEntries((f) => client.ledger.listTransactions(f), { from: today, to: today });

    // Newest first, today only: the transfer and the categorized entry never wait for a category.
    let queue = openCategoryQueue(await readToday());
    expect(queue?.ids).toEqual([third.id, second.id, first.id]);
    expect(queueProgress(queue!)).toBe("1 จาก 3");

    await entries.setCategory(third.id, "expense-food");
    queue = nextInQueue(queue!);
    expect(queueProgress(queue!)).toBe("2 จาก 3");
    expect(canSkipInQueue(queue!)).toBe(true);
    queue = nextInQueue(queue!); // ข้ามไปก่อน: Grab stays pending

    // While the queue was open the last entry got a category in the editor, so nothing is left to show.
    await entries.setCategory(first.id, "expense-transport");
    const pending = new Set((await readToday()).filter(needsCategory).map((row) => row.id));
    expect(currentInQueue(queue!, (id) => pending.has(id))).toBeNull();

    expect(await client.ledger.getTransaction({ id: third.id })).toMatchObject({ categoryId: "expense-food" });
    expect(await client.ledger.getTransaction({ id: second.id })).toMatchObject({ categoryId: null });
    const stillPending = (await loadAllEntries((f) => client.ledger.listTransactions(f), {})).filter(needsCategory);
    expect(stillPending.map((row) => row.id).sort()).toEqual([second.id, yesterday.id].sort());
    expect(queueDoneMessage(stillPending.length)).toBe("บันทึกหมวดแล้ว");
    expect(queueDoneMessage(0)).toBe("เลือกหมวดครบแล้ว");
  });

  it("refuses a category of the other kind and keeps the entry pending", async () => {
    const client = await signUp("queue-kind@example.test");
    const entries = createEntryActions(client.ledger);
    const row = await expense(client, { title: "Grab" });
    await expect(entries.setCategory(row.id, "income-salary")).rejects.toThrow("เลือกหมวดไม่สำเร็จ");
    expect(await client.ledger.getTransaction({ id: row.id })).toMatchObject({ categoryId: null });
  });
});

describe("latest jot", () => {
  it("is the entry recorded last, even when it is for an earlier day", async () => {
    const client = await signUp("latest@example.test");
    await expense(client, { title: "วันนี้", occurredOn: today });
    const backdated = await expense(client, { title: "ย้อนหลัง", occurredOn: "2026-08-01" });

    const [latest] = await client.ledger.listTransactions({ sort: "recorded", limit: 1 });
    expect(latest?.id).toBe(backdated.id);
  });
});

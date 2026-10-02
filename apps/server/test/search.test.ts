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
import { loadAllEntries } from "../../native/features/entries/all-entries";
import { searchFilters, searchResults } from "../../native/features/search/search";

// Search across every month through the real authenticated routes and MongoDB. Native modules are imported by path, as
// in manual-entry.test.ts.

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
    body: JSON.stringify({ name: "Search", email, password: "test-only-password" }),
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

const titles = async (client: Client, search: string) =>
  (await client.ledger.listTransactions({ search })).map((row) => row.title).sort();

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

describe("search by amount", () => {
  it("matches digits inside the amount as the app writes it, with or without commas and decimals", async () => {
    const client = await signUp("amount@example.test");
    await expense(client, { title: "Netflix", amountSatang: 41900 });
    await expense(client, { title: "ค่าเช่า", amountSatang: 419000 });
    await expense(client, { title: "ค่าไฟ", amountSatang: 125050 });
    await expense(client, { title: "กาแฟ", amountSatang: 1200 });

    expect(await titles(client, "419")).toEqual(["Netflix", "ค่าเช่า"]);
    expect(await titles(client, "4,190")).toEqual(["ค่าเช่า"]);
    expect(await titles(client, "1,250")).toEqual(["ค่าไฟ"]);
    expect(await titles(client, "250.5")).toEqual(["ค่าไฟ"]);
    // "12" is written "12", so a decimal point finds only amounts with satang.
    expect(await titles(client, "12.")).toEqual([]);
    expect(await titles(client, "12")).toEqual(["กาแฟ", "ค่าไฟ"]);
  });
});

describe("search by bank", () => {
  it("finds a bank by any of its names, whichever spelling the entry stored", async () => {
    const client = await signUp("bank-names@example.test");
    await expense(client, { title: "slip-k", bank: "KBank", source: "slip" });
    await expense(client, { title: "old-k", bank: "กสิกรไทย" });
    await expense(client, { title: "slip-s", bank: "SCB", source: "slip" });
    await expense(client, { title: "cash" });

    expect(await titles(client, "กสิกร")).toEqual(["old-k", "slip-k"]);
    expect(await titles(client, "kbank")).toEqual(["old-k", "slip-k"]);
    expect(await titles(client, "ไทยพาณิชย์")).toEqual(["slip-s"]);
  });

  it("does not find a bank's entries when the term only mentions the bank inside other words", async () => {
    const client = await signUp("bank-in-sentence@example.test");
    await expense(client, { title: "trip", note: "ค่ารถไปกรุงเทพ" });
    await expense(client, { title: "transfer", note: "โอนจาก kbank ไปออม" });
    await expense(client, { title: "slip-b", bank: "BBL", source: "slip" });
    await expense(client, { title: "slip-k", bank: "KBank", source: "slip" });

    expect(await titles(client, "ค่ารถไปกรุงเทพ")).toEqual(["trip"]);
    expect(await titles(client, "โอนจาก kbank ไปออม")).toEqual(["transfer"]);
  });

  it("finds Bangkok Bank by its English name, whichever spelling the entry stored", async () => {
    const client = await signUp("bank-bangkok@example.test");
    await expense(client, { title: "slip-b", bank: "BBL", source: "slip" });
    await expense(client, { title: "old-b", bank: "ธนาคารกรุงเทพ" });
    await expense(client, { title: "slip-k", bank: "KBank", source: "slip" });

    expect(await titles(client, "bangkok")).toEqual(["old-b", "slip-b"]);
    expect(await titles(client, "Bangkok Bank")).toEqual(["old-b", "slip-b"]);
  });

  it("finds a bank the app does not know by part of the name the entry stored", async () => {
    const client = await signUp("bank-unknown@example.test");
    await expense(client, { title: "gsb", bank: "ออมสิน" });
    await expense(client, { title: "cash" });

    expect(await titles(client, "ออม")).toEqual(["gsb"]);
  });
});

describe("search across every month", () => {
  it("reads every page, so the count and expense total cover more than 1,000 results", async () => {
    const client = await signUp("many-results@example.test");
    const user = await database.db.user.findFirstOrThrow({ where: { email: "many-results@example.test" } });
    const rows = Array.from({ length: 1001 }, (_, index) => {
      const id = crypto.randomUUID();
      const month = String((index % 12) + 1).padStart(2, "0");
      return {
        id,
        userId: user.id,
        kind: "expense",
        amountSatang: 100n,
        occurredOn: `2025-${month}-15`,
        title: `ค่ากาแฟ ${index}`,
        source: "manual",
        categoryId: "expense-food",
        dedupeIdentity: `id:${id}`,
        recurringIdentity: `id:${id}`,
      };
    });
    await database.db.financeTransaction.createMany({ data: rows });
    await expense(client, { title: "ค่ากาแฟ วันนี้", amountSatang: 5050 });
    await client.ledger.createTransaction({ kind: "income", amountSatang: 900, occurredOn: today, title: "ค่ากาแฟคืน" });
    await expense(client, { title: "ค่าน้ำ", amountSatang: 7000 });

    const entries = await loadAllEntries((filters) => client.ledger.listTransactions(filters), searchFilters("ค่ากาแฟ"));
    const results = searchResults(entries, { term: "ค่ากาแฟ", today, categories: [] });
    expect(results.summary).toBe("พบ 1,003 รายการ · รายจ่ายรวม 1,051.50 ฿");
    expect(results.days.map((day) => [day.date, day.countLabel])).toEqual([
      [today, "2 รายการ"],
      ...Array.from({ length: 12 }, (_, index) => {
        const month = 12 - index;
        return [`2025-${String(month).padStart(2, "0")}-15`, `${month <= 5 ? 84 : 83} รายการ`];
      }),
    ]);
  }, 60_000);
});

describe("search within one card", () => {
  it("keeps to the card it was opened for when two cards share a name", async () => {
    const client = await signUp("card-scope@example.test");
    const mine = await expense(client, { title: "ช้อปปิ้ง", cardName: "KTC", cardLast4: "4821" });
    await expense(client, { title: "ช้อปปิ้ง", cardName: "KTC", cardLast4: "9999" });
    await expense(client, { title: "ช้อปปิ้ง", cardName: "KTC" });
    await expense(client, { title: "ช้อปปิ้ง", bank: "KBank" });

    const scoped = await client.ledger.listTransactions(searchFilters("KTC", { cardName: "KTC", cardLast4: "4821" }));
    expect(scoped.map((row) => row.id)).toEqual([mine.id]);
    const unscoped = await client.ledger.listTransactions(searchFilters("KTC"));
    expect(unscoped).toHaveLength(3);
  });
});

describe("recent searches", () => {
  it("keeps each user's terms newest first, once each, and forgets a removed one", async () => {
    const client = await signUp("recent@example.test");
    const other = await signUp("recent-other@example.test");
    await client.financePreferences.addRecentSearch({ term: "Grab" });
    await client.financePreferences.addRecentSearch({ term: " ค่าไฟ " });
    expect(await client.financePreferences.addRecentSearch({ term: "grab" })).toEqual(["grab", "ค่าไฟ"]);

    expect(await client.financePreferences.removeRecentSearch({ term: "ค่าไฟ" })).toEqual(["grab"]);
    expect(await client.financePreferences.getRecentSearches()).toEqual(["grab"]);
    expect(await other.financePreferences.getRecentSearches()).toEqual([]);
  });
});

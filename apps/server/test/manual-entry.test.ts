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
// The native modules are imported by path: the server's `@/` alias points at its own `src`, and the native app is not a
// package the server depends on, so there is no package name to import them by.
import {
  blankEntryDraft,
  changeEntryKind,
  checkEntryDraft,
  draftFromTransaction,
  entrySourceChoices,
  selectEntrySource,
  type EntryDraft,
} from "../../native/features/entries/entry-draft";
import { createEntryActions } from "../../native/features/entries/entry-actions";
import { bankFilterGroups } from "../../native/features/wallets/banks";

// The native editor's save, delete and restore against the real authenticated Ledger routes and MongoDB.

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
    body: JSON.stringify({ name: "Entry", email, password: "test-only-password" }),
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
  const actions = createEntryActions(client.ledger);
  // What the editor does on save: check the draft once, then save what the check produced.
  const save = ({ id, draft, categoryName }: { id?: string; draft: EntryDraft; categoryName?: string }) => {
    const checked = checkEntryDraft(draft, { today, categoryName });
    if (!checked.ok) throw new Error(checked.message);
    return actions.save({ id, input: checked.input });
  };
  return { client, entries: { ...actions, save } };
}

const draft = (patch: Partial<EntryDraft>): EntryDraft => ({ ...blankEntryDraft(today), ...patch });

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

describe("manual entry", () => {
  it("saves what the user chose, in satang on the chosen day", async () => {
    const { client, entries } = await signUp("save@example.test");
    const tag = await client.ledger.createTag({ name: "เงินสด" });
    const scb = entrySourceChoices({ banks: [], cards: [] }, draft({})).find((c) => c.label === "ไทยพาณิชย์")!;
    const saved = await entries.save({
      draft: selectEntrySource(
        draft({
          amount: "1,250.5",
          occurredOn: "2026-09-12",
          categoryId: "expense-food",
          tagIds: [tag.id],
          note: "เที่ยง",
        }),
        scb
      ),
      categoryName: "อาหาร",
    });

    const read = await client.ledger.getTransaction({ id: saved.id });
    expect(read).toMatchObject({
      kind: "expense",
      amountSatang: 125050,
      occurredOn: "2026-09-12",
      title: "เที่ยง",
      note: "เที่ยง",
      categoryId: "expense-food",
      tagIds: [tag.id],
      bank: "SCB",
      cardName: null,
      cardLast4: null,
      source: "manual",
    });
  });

  it("puts a manual KBank entry in the same filter group as a slip KBank entry", async () => {
    const { client, entries } = await signUp("bank-group@example.test");
    const slip = await client.ledger.createTransaction({
      kind: "expense",
      amountSatang: 27500,
      occurredOn: today,
      title: "มื้อกลางวัน",
      bank: "KBank",
      source: "slip",
    });
    const kbank = entrySourceChoices({ banks: await client.analytics.listBanks(), cards: [] }, draft({})).filter(
      (choice) => choice.label === "กสิกรไทย"
    );
    expect(kbank).toHaveLength(1);
    const manual = await entries.save({ draft: selectEntrySource(draft({ amount: "20" }), kbank[0]!) });

    const groups = bankFilterGroups((await client.analytics.listWalletFilterOptions()).banks);
    expect(groups.map((group) => group.label)).toEqual(["กสิกรไทย"]);
    const rows = await client.ledger.listTransactions({
      walletFilter: { banks: groups[0]!.banks, cards: [], includeUnspecified: false },
    });
    expect(rows.map((row) => row.id).sort()).toEqual([slip.id, manual.id].sort());
  });

  it("groups every spelling of one bank under one filter row", async () => {
    const { client } = await signUp("bank-spellings@example.test");
    for (const bank of ["KBank", "กสิกรไทย", "SCB"])
      await client.ledger.createTransaction({
        kind: "expense",
        amountSatang: 100,
        occurredOn: today,
        title: bank,
        bank,
      });

    const groups = bankFilterGroups((await client.analytics.listWalletFilterOptions()).banks);
    expect(groups.map((group) => group.label)).toEqual(["กสิกรไทย", "ไทยพาณิชย์"]);
    const rows = await client.ledger.listTransactions({
      walletFilter: { banks: groups[0]!.banks, cards: [], includeUnspecified: false },
    });
    expect(rows.map((row) => row.title).sort()).toEqual(["KBank", "กสิกรไทย"].sort());
  });

  it("saves an existing card by its name and last four digits", async () => {
    const { client, entries } = await signUp("card@example.test");
    await entries.save({ draft: draft({ amount: "10", cardName: "KTC", cardLast4: "4821" }) });
    await entries.save({ draft: draft({ amount: "20", cardName: "KTC", cardLast4: "1234" }) });

    const cards = await client.analytics.listCards();
    const second = entrySourceChoices({ banks: [], cards }, draft({})).find((c) => c.label === "บัตร KTC •• 1234")!;
    const saved = await entries.save({ draft: selectEntrySource(draft({ amount: "30" }), second) });

    expect(await client.ledger.getTransaction({ id: saved.id })).toMatchObject({ cardName: "KTC", cardLast4: "1234" });
  });

  it("edits an entry in place, and a new type drops the old category", async () => {
    const { client, entries } = await signUp("edit@example.test");
    const created = await entries.save({
      draft: draft({ amount: "100", categoryId: "expense-food" }),
      categoryName: "อาหาร",
    });

    const edited = changeEntryKind({ ...draftFromTransaction(created), amount: "150", title: "คืนเงิน" }, "income");
    await entries.save({ id: created.id, draft: edited });

    const rows = await client.ledger.listTransactions({});
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: created.id,
      kind: "income",
      amountSatang: 15000,
      title: "คืนเงิน",
      categoryId: null,
    });
  });

  it("does not count a transfer as income or expense", async () => {
    const { client, entries } = await signUp("transfer@example.test");
    await entries.save({ draft: draft({ amount: "500", categoryId: "expense-food" }) });
    await entries.save({ draft: changeEntryKind(draft({ amount: "2000", categoryId: "expense-food" }), "transfer") });

    const summary = await client.analytics.getPeriodSummary({ from: "2026-09-01", to: "2026-09-30" });
    expect(summary).toMatchObject({ expenseSatang: 50000, incomeSatang: 0, transferSatang: 200000 });
  });

  it("keeps the draft valid for another try when the server refuses it", async () => {
    const { entries } = await signUp("refused@example.test");
    const refused = draft({ amount: "100", categoryId: "income-salary" });
    await expect(entries.save({ draft: refused })).rejects.toThrow("บันทึกไม่สำเร็จ");
    expect(refused).toMatchObject({ amount: "100", categoryId: "income-salary" });
  });

  it("deletes at once and restores the same entry, without a copy", async () => {
    const { client, entries } = await signUp("restore@example.test");
    const tag = await client.ledger.createTag({ name: "ทริป" });
    const created = await entries.save({
      draft: draft({ amount: "75", title: "ชานม", categoryId: "expense-food", tagIds: [tag.id], bank: "กรุงไทย" }),
    });

    await entries.remove(created.id);
    expect(await client.ledger.listTransactions({})).toEqual([]);
    expect(await client.ledger.getTransaction({ id: created.id })).toBeNull();

    await entries.restore(created.id);
    const rows = await client.ledger.listTransactions({});
    expect(rows).toHaveLength(1);
    const { updatedAt: _after, ...restored } = rows[0]!;
    const { updatedAt: _before, ...original } = created;
    expect(restored).toEqual(original);
  });

  it("says so when the entry to delete or restore is gone", async () => {
    const { entries } = await signUp("gone@example.test");
    const created = await entries.save({ draft: draft({ amount: "75" }) });
    await entries.remove(created.id);
    await expect(entries.remove(created.id)).rejects.toThrow("ไม่พบรายการนี้แล้ว");
    await entries.restore(created.id);
    await expect(entries.restore(created.id)).rejects.toThrow("เอากลับคืนไม่ได้");
  });

  it("never deletes or restores another account's entry", async () => {
    const alice = await signUp("alice-entry@example.test");
    const bob = await signUp("bob-entry@example.test");
    const created = await alice.entries.save({ draft: draft({ amount: "75" }) });

    await expect(bob.entries.remove(created.id)).rejects.toThrow("ไม่พบรายการนี้แล้ว");
    await alice.entries.remove(created.id);
    await expect(bob.entries.restore(created.id)).rejects.toThrow("เอากลับคืนไม่ได้");
    expect(await alice.client.ledger.listTransactions({})).toEqual([]);
  });
});

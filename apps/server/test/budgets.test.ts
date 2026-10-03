import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { Effect, Layer } from "effect";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { SimpleCsrfProtectionLinkPlugin } from "@orpc/client/plugins";
import type { AppRouterClient } from "@moojot/api/features/index";
import { createAuth } from "@moojot/auth";
import { createAppRuntime } from "@moojot/api/runtime";
import { GeminiProvider } from "@moojot/api/features/import/gemini.provider";
import { PlanningService } from "@moojot/api/features/planning/planning.service";
import { createServerApp } from "../src/app";
import { startTestDatabase } from "./mongo";
import { createBudgetActions } from "../../native/features/planning/budget-actions";

// Budgets against the real authenticated routes and MongoDB: status, saving onto a target, delete and restore.

const env = {
  BETTER_AUTH_URL: "https://localhost:3333",
  BETTER_AUTH_SECRET: "test-only-secret-with-at-least-32-characters",
  CORS_ORIGIN: "http://localhost:3001",
  NODE_ENV: "development" as const,
};
const today = "2026-10-02";
const month = "2026-10";

let database: Awaited<ReturnType<typeof startTestDatabase>>;
let runtime: ReturnType<typeof createAppRuntime>;
let app: ReturnType<typeof createServerApp>;

async function signUp(email: string) {
  const response = await app.request(`${env.BETTER_AUTH_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: env.CORS_ORIGIN },
    body: JSON.stringify({ name: "Budgets", email, password: "test-only-password" }),
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
const spend = (client: Client, amountSatang: number, patch: { categoryId?: string; tagIds?: string[] } = {}) =>
  client.ledger.createTransaction({ kind: "expense", amountSatang, occurredOn: today, title: "จ่าย", ...patch });
const statuses = (client: Client) => client.planning.getBudgetStatuses({ periodKey: month, asOf: today });

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

describe("Budget status", () => {
  it("is over only when spending is more than the limit, not when it equals it", async () => {
    const client = await signUp("status@example.test");
    await client.planning.upsertBudget({ periodKey: month, limitSatang: 100_000 });
    await client.planning.upsertBudget({ periodKey: month, categoryId: "expense-food", limitSatang: 30_000 });
    await spend(client, 30_000, { categoryId: "expense-food" });
    await spend(client, 70_000);

    const byTarget = new Map((await statuses(client)).map((status) => [status.budget.categoryId ?? "all", status]));
    expect(byTarget.get("all")).toMatchObject({ spentSatang: 100_000, remainingSatang: 0, isOverLimit: false });
    expect(byTarget.get("expense-food")).toMatchObject({ spentSatang: 30_000, isOverLimit: false });

    await spend(client, 1, { categoryId: "expense-food" });
    const after = new Map((await statuses(client)).map((status) => [status.budget.categoryId ?? "all", status]));
    expect(after.get("all")).toMatchObject({ spentSatang: 100_001, remainingSatang: -1, isOverLimit: true });
    expect(after.get("expense-food")).toMatchObject({ isOverLimit: true });
  });
});

describe("Saving a budget", () => {
  it("replaces the limit of the budget already set for that target, keeping one budget", async () => {
    const client = await signUp("replace@example.test");
    const first = await client.planning.upsertBudget({
      periodKey: month,
      categoryId: "expense-food",
      limitSatang: 300_000,
    });
    const second = await client.planning.upsertBudget({
      periodKey: month,
      categoryId: "expense-food",
      limitSatang: 450_000,
      warningThresholdPercent: 70,
    });
    expect(second).toMatchObject({ id: first.id, limitSatang: 450_000, warningThresholdPercent: 70 });
    expect(await client.planning.listBudgets({ periodKey: month })).toHaveLength(1);
  });

  it("moves an edited budget to a new target in one step, replacing the budget that target had", async () => {
    const client = await signUp("retarget@example.test");
    const food = await client.planning.upsertBudget({
      periodKey: month,
      categoryId: "expense-food",
      limitSatang: 300_000,
    });
    await client.planning.upsertBudget({ periodKey: month, limitSatang: 1_000_000 });

    const moved = await client.planning.upsertBudget({ id: food.id, periodKey: month, limitSatang: 800_000 });
    expect(moved).toMatchObject({ id: food.id, categoryId: null, tagId: null, limitSatang: 800_000 });
    expect(await client.planning.listBudgets({ periodKey: month })).toMatchObject([
      { id: food.id, limitSatang: 800_000 },
    ]);
  });

  it("keeps an edited budget in its own month, refusing a different month", async () => {
    const client = await signUp("edit-month@example.test");
    const food = await client.planning.upsertBudget({
      periodKey: month,
      categoryId: "expense-food",
      limitSatang: 300_000,
    });

    await expect(
      client.planning.upsertBudget({ id: food.id, periodKey: "2026-11", categoryId: "expense-food", limitSatang: 1 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(await client.planning.listBudgets({ periodKey: "2026-11" })).toEqual([]);
    expect(await client.planning.listBudgets({ periodKey: month })).toEqual([food]);
  });

  it("keeps the budget an edit replaced, so it can be brought back", async () => {
    const client = await signUp("edit-replaced@example.test");
    const food = await client.planning.upsertBudget({
      periodKey: month,
      categoryId: "expense-food",
      limitSatang: 300_000,
    });
    const overall = await client.planning.upsertBudget({ periodKey: month, limitSatang: 1_000_000 });
    await client.planning.upsertBudget({ id: food.id, periodKey: month, limitSatang: 800_000 });

    // The replaced budget left an undo like a delete does: asking to delete it again finds that undo.
    const { deletionId } = await client.planning.deleteBudget({ id: overall.id });
    await client.planning.deleteBudget({ id: food.id });
    expect(await client.planning.restoreBudget({ deletionId })).toEqual(overall);
    expect(await client.planning.listBudgets({ periodKey: month })).toEqual([overall]);
  });

  it("changes nothing when the edited budget is gone or belongs to someone else", async () => {
    const owner = await signUp("edit-owner@example.test");
    const other = await signUp("edit-other@example.test");
    const food = await owner.planning.upsertBudget({
      periodKey: month,
      categoryId: "expense-food",
      limitSatang: 300_000,
    });

    await expect(other.planning.upsertBudget({ id: food.id, periodKey: month, limitSatang: 1 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(await other.planning.listBudgets({ periodKey: month })).toEqual([]);
    expect(await owner.planning.listBudgets({ periodKey: month })).toMatchObject([
      { id: food.id, limitSatang: 300_000 },
    ]);
  });
});

describe("Deleting and restoring a budget", () => {
  it("deletes at once and restores the same budget, counting the entries still there", async () => {
    const client = await signUp("restore@example.test");
    const tag = await client.ledger.createTag({ name: "เที่ยว" });
    const budget = await client.planning.upsertBudget({
      periodKey: month,
      tagId: tag.id,
      limitSatang: 500_000,
      warningThresholdPercent: 70,
    });
    await spend(client, 120_000, { tagIds: [tag.id] });
    const gone = await spend(client, 80_000, { tagIds: [tag.id] });

    const deletion = await client.planning.deleteBudget({ id: budget.id });
    expect(await client.planning.listBudgets({ periodKey: month })).toEqual([]);
    await client.ledger.deleteTransaction({ id: gone.id }); // while the budget is away, one entry goes

    const restored = await client.planning.restoreBudget({ deletionId: deletion.deletionId });
    expect(restored).toEqual(budget);
    expect(await statuses(client)).toMatchObject([
      { budget: { id: budget.id }, spentSatang: 120_000, remainingSatang: 380_000 },
    ]);
  });

  it("answers a repeated delete or restore with the same result and never makes a copy", async () => {
    const client = await signUp("repeat@example.test");
    const budget = await client.planning.upsertBudget({ periodKey: month, limitSatang: 900_000 });

    const first = await client.planning.deleteBudget({ id: budget.id });
    expect(await client.planning.deleteBudget({ id: budget.id })).toEqual(first);

    expect(await client.planning.restoreBudget({ deletionId: first.deletionId })).toEqual(budget);
    expect(await client.planning.restoreBudget({ deletionId: first.deletionId })).toEqual(budget);
    expect(await client.planning.listBudgets({ periodKey: month })).toEqual([budget]);

    // Deleted again after the restore: the old undo cannot bring it back a second time.
    const second = await client.planning.deleteBudget({ id: budget.id });
    expect(second.deletionId).not.toBe(first.deletionId);
    await expect(client.planning.restoreBudget({ deletionId: first.deletionId })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(await client.planning.listBudgets({ periodKey: month })).toEqual([]);
  });

  it("answers two deletes sent at once with the same undo", async () => {
    const client = await signUp("together@example.test");
    // A few rounds, so the two requests really do meet inside their transactions at least once.
    for (let round = 0; round < 5; round += 1) {
      const budget = await client.planning.upsertBudget({ periodKey: month, limitSatang: 100_000 });
      const [first, second] = await Promise.all([
        client.planning.deleteBudget({ id: budget.id }),
        client.planning.deleteBudget({ id: budget.id }),
      ]);
      expect(second).toEqual(first);
      expect(await client.planning.restoreBudget(first)).toEqual(budget);
      await client.planning.deleteBudget({ id: budget.id });
    }
  });

  it("reports a delete as done even when clearing out old undos fails afterwards", async () => {
    const client = await signUp("prune@example.test");
    const budget = await client.planning.upsertBudget({ periodKey: month, limitSatang: 100_000 });
    const { id: userId } = await database.db.user.findFirstOrThrow({ where: { email: "prune@example.test" } });
    // The same database, except that removing old deletions (the clean-up after a delete commits) always fails.
    const failingCleanUp = new Proxy(database.db, {
      get(target, property) {
        if (property === "financeDeletion") {
          return { deleteMany: () => Promise.reject(new Error("clean-up failed")) };
        }
        const value: unknown = Reflect.get(target, property);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const flakyRuntime = createAppRuntime(
      failingCleanUp,
      Layer.succeed(GeminiProvider, { extract: () => Effect.die("Unused test provider") })
    );
    try {
      const deletion = await flakyRuntime.runPromise(
        Effect.gen(function* () {
          const planning = yield* PlanningService;
          return yield* planning.deleteBudget(userId, { id: budget.id });
        })
      );
      expect(await client.planning.listBudgets({ periodKey: month })).toEqual([]);
      expect(await client.planning.restoreBudget(deletion)).toEqual(budget);
    } finally {
      await flakyRuntime.dispose();
    }
  });

  it("refuses a restore when a new budget took the target, keeping the new one", async () => {
    const client = await signUp("conflict@example.test");
    const old = await client.planning.upsertBudget({
      periodKey: month,
      categoryId: "expense-food",
      limitSatang: 300_000,
    });
    const { deletionId } = await client.planning.deleteBudget({ id: old.id });
    const fresh = await client.planning.upsertBudget({
      periodKey: month,
      categoryId: "expense-food",
      limitSatang: 200_000,
    });

    await expect(client.planning.restoreBudget({ deletionId })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await client.planning.listBudgets({ periodKey: month })).toEqual([fresh]);

    // Once the new budget is gone, the same undo works: the failed restore claimed nothing.
    await client.planning.deleteBudget({ id: fresh.id });
    expect(await client.planning.restoreBudget({ deletionId })).toEqual(old);
  });

  it("refuses a restore when the budget's tag is gone, instead of bringing back a budget for nothing", async () => {
    const client = await signUp("tag-gone@example.test");
    const tag = await client.ledger.createTag({ name: "ทริป" });
    const budget = await client.planning.upsertBudget({ periodKey: month, tagId: tag.id, limitSatang: 50_000 });
    const { deletionId } = await client.planning.deleteBudget({ id: budget.id });
    await client.ledger.deleteTag({ id: tag.id });

    await expect(client.planning.restoreBudget({ deletionId })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await client.planning.listBudgets({ periodKey: month })).toEqual([]);
  });

  it("refuses a restore when the budget's category is gone, instead of bringing back a budget for nothing", async () => {
    const client = await signUp("category-gone@example.test");
    const pets = await client.ledger.createCategory({ name: "สัตว์เลี้ยง", kind: "expense" });
    const budget = await client.planning.upsertBudget({ periodKey: month, categoryId: pets.id, limitSatang: 50_000 });
    const { deletionId } = await client.planning.deleteBudget({ id: budget.id });
    await client.ledger.deleteCategory({ id: pets.id });

    await expect(client.planning.restoreBudget({ deletionId })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await client.planning.listBudgets({ periodKey: month })).toEqual([]);
  });

  it("gives the app's toast and form a reason in Thai when a restore or save cannot happen", async () => {
    const client = await signUp("actions@example.test");
    const actions = createBudgetActions(client.planning);
    const old = await actions.save({ periodKey: month, categoryId: "expense-food", limitSatang: 300_000 });
    const deletionId = await actions.remove(old.id);
    await actions.save({ periodKey: month, categoryId: "expense-food", limitSatang: 200_000 });

    await expect(actions.restore(deletionId)).rejects.toThrow(
      "เอากลับคืนไม่ได้ เดือนนี้ตั้งงบของเป้าหมายนี้ใหม่แล้ว หรือหมวดหรือแท็กของงบถูกลบไป"
    );
    await expect(actions.save({ id: old.id, periodKey: month, limitSatang: 1 })).rejects.toThrow(
      "ไม่พบงบนี้แล้ว อาจถูกลบไปแล้ว"
    );
    await expect(actions.remove(old.id)).resolves.toBe(deletionId); // a repeated delete is not an error
  });

  it("keeps another user's budget and undo out of reach", async () => {
    const owner = await signUp("delete-owner@example.test");
    const other = await signUp("delete-other@example.test");
    const budget = await owner.planning.upsertBudget({ periodKey: month, limitSatang: 100_000 });

    await expect(other.planning.deleteBudget({ id: budget.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await owner.planning.listBudgets({ periodKey: month })).toEqual([budget]);

    const { deletionId } = await owner.planning.deleteBudget({ id: budget.id });
    await expect(other.planning.restoreBudget({ deletionId })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await other.planning.listBudgets({ periodKey: month })).toEqual([]);
    expect(await owner.planning.restoreBudget({ deletionId })).toEqual(budget);
  });
});

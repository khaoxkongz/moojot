import { afterAll, beforeAll, expect, it } from "vite-plus/test";
import { Effect, Layer } from "effect";
import { GeminiProvider } from "@moojot/api/features/import/gemini.provider";
import { createAppRuntime } from "@moojot/api/runtime";
import { LedgerService } from "@moojot/api/features/ledger/ledger.service";
import { startTestDatabase } from "./mongo";

let database: Awaited<ReturnType<typeof startTestDatabase>>;
let runtime: ReturnType<typeof createAppRuntime>;
beforeAll(async () => {
  database = await startTestDatabase();
  runtime = createAppRuntime(
    database.db,
    Layer.succeed(GeminiProvider, { extract: () => Effect.die("Unused test provider") })
  );
}, 120_000);
afterAll(async () => {
  await runtime?.dispose();
  await database?.close();
});

it("keeps an exact per-user import identity after soft deletion", async () => {
  await runtime.runPromise(
    Effect.gen(function* () {
      const ledger = yield* LedgerService;
      const transaction = yield* ledger.createTransaction("alice", {
        kind: "expense",
        amountSatang: 12500,
        occurredOn: "2026-09-28",
        title: "อาหาร",
        source: "slip",
        dedupeKey: "slip:asset-1",
      });
      yield* ledger.deleteTransaction("alice", { id: transaction.id });
      expect(yield* ledger.findTransactionIdentity("alice", "slip:asset-1")).toEqual({ id: transaction.id });
      expect(yield* ledger.findTransactionIdentity("bob", "slip:asset-1")).toBeNull();
      expect(yield* ledger.findTransactionIdentity("alice", "slip:asset-2")).toBeNull();
    })
  );
});

it("uses MongoDB's unique identity index to settle concurrent writes", async () => {
  const input = {
    kind: "expense" as const,
    amountSatang: 5000,
    occurredOn: "2026-09-28",
    title: "รถไฟ",
    source: "slip" as const,
    dedupeKey: "slip:race",
  };
  await runtime.runPromise(LedgerService.use((ledger) => ledger.initializeDatabase("race-user")));
  const results = await Promise.all(
    [1, 2].map(() =>
      runtime.runPromise(
        LedgerService.use((ledger) => ledger.createTransaction("race-user", input)).pipe(Effect.result)
      )
    )
  );
  expect(results.map((result) => result._tag).sort()).toEqual(["Failure", "Success"]);
  const otherUser = await runtime.runPromise(
    LedgerService.use((ledger) => ledger.createTransaction("other-user", input))
  );
  expect(otherUser.dedupeKey).toBe("slip:race");
});

import { Clock, Context, Effect, Layer } from "effect";
import { LedgerService } from "../ledger/ledger.service";
import { GeminiProvider } from "./gemini.provider";
import { ImportError } from "./import.error";
import { ImportOutcome } from "./import.schema";
import { validateImage } from "./image.validation";
import { qualifyResponse } from "./candidate";
import { persistenceFailure } from "./persistence.error";
import { FinanceConflictError } from "../../shared/finance/error";
import { makeModelWork } from "./model-work";

const disconnect = Effect.fnUntraced(function* (signal?: AbortSignal) {
  return yield* Effect.callback<never>((resume) => {
    if (!signal) return;
    const abort = () => resume(Effect.interrupt);
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    return Effect.sync(() => signal.removeEventListener("abort", abort));
  });
});

const makeImportService = Effect.gen(function* () {
  const ledger = yield* LedgerService;
  const gemini = yield* GeminiProvider;
  const extract = yield* makeModelWork(gemini);
  const prepare = Effect.fn("ImportService.prepare")(function* (userId: string, raw: unknown) {
    const input = yield* validateImage(raw);
    const dedupeKey = `slip:${input.assetId}`;
    const duplicate = yield* ledger.findTransactionIdentity(userId, dedupeKey).pipe(Effect.catch(persistenceFailure));
    if (duplicate) return { status: "skipped", reason: "duplicate", reasons: [], warnings: [] } as const;
    const response = yield* extract(input);
    const qualified = yield* qualifyResponse(response);
    if (qualified.status === "skipped") return qualified;
    return { ...qualified, dedupeKey };
  });

  const autoImportSlip = Effect.fn("ImportService.autoImportSlip")(function* (
    userId: string,
    raw: unknown,
    signal?: AbortSignal
  ): Effect.fn.Return<ImportOutcome, ImportError> {
    const started = yield* Clock.monotonicTimeNanos;
    const qualified = yield* prepare(userId, raw).pipe(
      Effect.timeoutOrElse({
        duration: 140_000,
        orElse: () => Effect.fail(new ImportError({ code: "IMPORT_TIMEOUT" })),
      }),
      Effect.raceFirst(disconnect(signal)),
      Effect.interruptible
    );
    if (qualified.status === "skipped") return qualified;
    if (signal?.aborted) return yield* Effect.interrupt;
    if ((yield* Clock.monotonicTimeNanos) - started >= 140_000_000_000n) {
      return yield* new ImportError({ code: "IMPORT_TIMEOUT" });
    }
    const dedupeKey = qualified.dedupeKey;
    // From this point creation (including conflict resolution) must report its real result.
    return yield* ledger
      .createTransaction(userId, { ...qualified.candidate, source: "slip", categoryId: null, dedupeKey })
      .pipe(
        Effect.map((transaction): ImportOutcome => ({
          status: "created",
          transactionId: transaction.id,
          warnings: qualified.warnings,
        })),
        Effect.catch(
          Effect.fnUntraced(function* (error) {
            if (error instanceof FinanceConflictError) {
              const existing = yield* ledger
                .findTransactionIdentity(userId, dedupeKey)
                .pipe(Effect.catch(persistenceFailure));
              if (existing)
                return {
                  status: "skipped",
                  reason: "duplicate",
                  reasons: [],
                  warnings: qualified.warnings,
                } satisfies ImportOutcome;
            }
            return yield* persistenceFailure(error);
          })
        )
      );
  }, Effect.uninterruptible);
  return { autoImportSlip };
});

export class ImportService extends Context.Service<ImportService, Effect.Success<typeof makeImportService>>()(
  "@moojot/api/import/ImportService"
) {
  static readonly layer = Layer.effect(ImportService, makeImportService);
}

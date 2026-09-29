import { Effect, Result, Schema } from "effect";
import { FinanceOperationError, FinanceReadError } from "../../shared/finance/error";
import { ImportError } from "./import.error";

const DatabaseFailure = Schema.Struct({ code: Schema.optional(Schema.String), name: Schema.optional(Schema.String) });
const unavailableCodes = new Set(["P1001", "P1002", "P1008", "P1017", "P2024", "P2037"]);

export const persistenceFailure = Effect.fnUntraced(function* (error: unknown) {
  const cause = error instanceof FinanceReadError || error instanceof FinanceOperationError ? error.cause : error;
  const decoded = yield* Schema.decodeUnknownEffect(DatabaseFailure)(cause).pipe(Effect.result);
  const unavailable =
    Result.isSuccess(decoded) &&
    (unavailableCodes.has(decoded.success.code ?? "") || decoded.success.name === "PrismaClientInitializationError");
  return yield* new ImportError({ code: unavailable ? "PERSISTENCE_UNAVAILABLE" : "PERSISTENCE_FAILED" });
});

import { Effect, Schema } from "effect";

export class FinanceReadError extends Schema.TaggedError<FinanceReadError>()("FinanceReadError", {
  cause: Schema.Defect(),
}) {}

export class FinanceOperationError extends Schema.TaggedError<FinanceOperationError>()("FinanceOperationError", {
  operation: Schema.String,
  cause: Schema.Defect(),
}) {}

export class FinanceBadRequestError extends Schema.TaggedError<FinanceBadRequestError>()("FinanceBadRequestError", {
  message: Schema.String,
}) {}

export class FinanceNotFoundError extends Schema.TaggedError<FinanceNotFoundError>()("FinanceNotFoundError", {
  message: Schema.String,
}) {}

export class FinanceConflictError extends Schema.TaggedError<FinanceConflictError>()("FinanceConflictError", {
  message: Schema.String,
}) {}

export class FinanceInternalError extends Schema.TaggedError<FinanceInternalError>()("FinanceInternalError", {
  message: Schema.String,
}) {}

export function financeOperation<A>(operation: string, run: () => Promise<A>) {
  return Effect.tryPromise({
    try: run,
    catch: (cause) => {
      if (
        cause instanceof FinanceBadRequestError ||
        cause instanceof FinanceNotFoundError ||
        cause instanceof FinanceConflictError ||
        cause instanceof FinanceInternalError
      ) {
        return cause;
      }
      return new FinanceOperationError({ operation, cause });
    },
  });
}

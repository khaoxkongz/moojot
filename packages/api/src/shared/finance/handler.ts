import { ORPCError } from "@orpc/server";
import { Context as EffectContext, Effect, Result } from "effect";
import type * as ManagedRuntime from "effect/ManagedRuntime";

import type { Context } from "../../context";
import { FinanceBadRequestError, FinanceConflictError, FinanceInternalError, FinanceNotFoundError } from "./error";

type RuntimeServices = ManagedRuntime.ManagedRuntime.Services<Context["runtime"]>;

export async function runFinance<A, E, I extends RuntimeServices, S>(
  context: Context,
  key: EffectContext.Key<I, S>,
  operation: (service: S) => Effect.Effect<A, E>
): Promise<A> {
  const result = await context.runtime.runPromise(
    Effect.gen(function* () {
      const service = yield* key;
      return yield* operation(service);
    }).pipe(Effect.result)
  );

  if (Result.isFailure(result)) {
    const cause = result.failure;
    if (cause instanceof FinanceBadRequestError) {
      throw new ORPCError("BAD_REQUEST", { message: cause.message });
    }
    if (cause instanceof FinanceNotFoundError) {
      throw new ORPCError("NOT_FOUND", { message: cause.message });
    }
    if (cause instanceof FinanceConflictError) {
      throw new ORPCError("CONFLICT", { message: cause.message });
    }
    if (cause instanceof FinanceInternalError) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: cause.message });
    }
    throw new ORPCError("INTERNAL_SERVER_ERROR", { cause });
  }

  return result.success;
}

import { Effect, Ref, Semaphore } from "effect";
import type { GeminiProvider } from "./gemini.provider";
import { ImportError } from "./import.error";
import type { AutoImportInput } from "./import.schema";

export const makeModelWork = Effect.fnUntraced(function* (gemini: GeminiProvider["Service"]) {
  const permits = yield* Semaphore.make(2);
  const admitted = yield* Ref.make(0);
  const enter = Ref.modify(admitted, (count) => [count < 4, count < 4 ? count + 1 : count]).pipe(
    Effect.flatMap((accepted) =>
      accepted ? Effect.void : Effect.fail(new ImportError({ code: "BUSY", retryAfter: 30 }))
    )
  );
  return Effect.fn("ImportService.extract")((input: AutoImportInput) =>
    Effect.acquireUseRelease(
      enter,
      () =>
        Effect.uninterruptibleMask((restore) =>
          Effect.acquireUseRelease(
            restore(
              permits.take(1).pipe(
                Effect.timeoutOrElse({
                  duration: 10_000,
                  orElse: () => Effect.fail(new ImportError({ code: "BUSY", retryAfter: 30 })),
                })
              )
            ),
            () =>
              restore(
                gemini.extract(input).pipe(
                  Effect.timeoutOrElse({
                    duration: 110_000,
                    orElse: () => Effect.fail(new ImportError({ code: "AI_TIMEOUT" })),
                  })
                )
              ),
            () => permits.release(1)
          )
        ),
      () => Ref.update(admitted, (count) => count - 1)
    )
  );
});

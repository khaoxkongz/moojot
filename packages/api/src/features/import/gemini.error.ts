import { Clock, DateTime, Effect, Option, Result, Schema } from "effect";
import { ImportError } from "./import.error";

const UpstreamFailure = Schema.Struct({
  status: Schema.optional(Schema.Number),
  statusCode: Schema.optional(Schema.Number),
  name: Schema.optional(Schema.String),
  headers: Schema.optional(Schema.instanceOf(Headers)),
});
const RetrySeconds = Schema.NumberFromString.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0));

const retryAfterSeconds = Effect.fnUntraced(function* (value: string | null) {
  if (value === null) return 30;
  const seconds = yield* Schema.decodeUnknownEffect(RetrySeconds)(value).pipe(Effect.result);
  if (Result.isSuccess(seconds)) return Math.max(30, seconds.success);
  const date = DateTime.make(value);
  if (Option.isNone(date)) return 30;
  return Math.max(30, Math.ceil((DateTime.toEpochMillis(date.value) - (yield* Clock.currentTimeMillis)) / 1000));
});

export const geminiFailure = Effect.fnUntraced(function* (cause: unknown) {
  const decoded = yield* Schema.decodeUnknownEffect(UpstreamFailure)(cause).pipe(Effect.result);
  if (Result.isFailure(decoded)) return yield* new ImportError({ code: "AI_UPSTREAM_ERROR" });
  const { status, statusCode, name, headers } = decoded.success;
  const code = status ?? statusCode;
  if (code === 429)
    return yield* new ImportError({
      code: "AI_RATE_LIMITED",
      retryAfter: yield* retryAfterSeconds(headers?.get("retry-after") ?? null),
    });
  if (
    code === 408 ||
    code === 504 ||
    name === "RequestTimeoutError" ||
    name === "APIConnectionTimeoutError" ||
    name === "TimeoutError"
  ) {
    return yield* new ImportError({ code: "AI_TIMEOUT" });
  }
  if ((code !== undefined && code >= 500) || name === "ConnectionError" || name === "APIConnectionError") {
    return yield* new ImportError({ code: "AI_UNAVAILABLE" });
  }
  return yield* new ImportError({ code: "AI_UPSTREAM_ERROR" });
});

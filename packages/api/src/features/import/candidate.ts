import { Effect, Result, Schema } from "effect";
import { ImportError } from "./import.error";
import { ImportOutcome, ModelResponse, ReadyCandidate } from "./import.schema";

export const qualifyResponse = Effect.fn("qualifyResponse")(function* (response: unknown) {
  const model = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(ModelResponse))(response, {
    onExcessProperty: "error",
  }).pipe(Effect.mapError(() => new ImportError({ code: "AI_INVALID_RESPONSE" })));
  const candidate = model.candidates[0];
  if (!candidate)
    return { status: "skipped", reason: "no_candidate", reasons: [], warnings: model.warnings } satisfies ImportOutcome;
  const warnings = [...model.warnings, ...candidate.issues];
  const amount = yield* Schema.decodeUnknownEffect(ReadyCandidate.fields.amountSatang)(candidate.amountSatang).pipe(
    Effect.result
  );
  const date = yield* Schema.decodeUnknownEffect(ReadyCandidate.fields.occurredOn)(candidate.occurredOn).pipe(
    Effect.result
  );
  if (Result.isFailure(amount) || Result.isFailure(date)) {
    return {
      status: "skipped",
      reason: "incomplete_candidate",
      reasons: [
        ...(Result.isFailure(amount) ? [{ field: "amountSatang" as const, code: "required_or_invalid" as const }] : []),
        ...(Result.isFailure(date) ? [{ field: "occurredOn" as const, code: "required_or_invalid" as const }] : []),
      ],
      warnings,
    } satisfies ImportOutcome;
  }
  const title = candidate.title.trim() || "รายการจากสลิป";
  if (!candidate.title.trim()) warnings.push("ไม่พบชื่อรายการ ใช้ชื่อรายการจากสลิป");
  return {
    status: "ready" as const,
    candidate: {
      kind: candidate.kind,
      title,
      amountSatang: amount.success,
      occurredOn: date.success,
    } satisfies typeof ReadyCandidate.Type,
    warnings,
  };
});

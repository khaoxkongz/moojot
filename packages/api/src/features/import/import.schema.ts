import { Schema as S } from "effect";
import { amountSatangSchema, isoDateSchema } from "../../shared/finance/common";

export const AssetId = S.String.check(
  S.makeFilter(
    (value) =>
      value.length > 0 &&
      value.trim() === value &&
      !/\p{Cc}/u.test(value) &&
      value.isWellFormed() &&
      Buffer.byteLength(value, "utf8") <= 256
  )
);

export const AutoImportInput = S.Struct({
  assetId: AssetId,
  fileBase64: S.String,
  mimeType: S.Literals(["image/jpeg", "image/png"]),
});
export type AutoImportInput = typeof AutoImportInput.Type;

export const InputFields = S.Struct({
  assetId: S.optional(S.Unknown),
  fileBase64: S.optional(S.Unknown),
  mimeType: S.optional(S.Unknown),
});

export const SlipCandidate = S.Struct({
  kind: S.Literals(["expense", "income", "transfer"]),
  amountSatang: S.optional(S.Unknown),
  occurredOn: S.optional(S.Unknown),
  title: S.String,
  issues: S.Array(S.String),
});
export const ReadyCandidate = S.Struct({
  kind: SlipCandidate.fields.kind,
  amountSatang: amountSatangSchema,
  occurredOn: isoDateSchema,
  title: S.NonEmptyString,
});
export const ModelResponse = S.Struct({
  candidates: S.Array(SlipCandidate).check(S.isMaxLength(1)),
  warnings: S.Array(S.String),
});

export const ImportOutcome = S.Union([
  S.Struct({ status: S.Literal("created"), transactionId: S.String, warnings: S.Array(S.String) }),
  S.Struct({
    status: S.Literal("skipped"),
    reason: S.Literals(["duplicate", "no_candidate", "incomplete_candidate"]),
    reasons: S.Array(
      S.Struct({ field: S.Literals(["amountSatang", "occurredOn"]), code: S.Literal("required_or_invalid") })
    ),
    warnings: S.Array(S.String),
  }),
]);
export type ImportOutcome = typeof ImportOutcome.Type;

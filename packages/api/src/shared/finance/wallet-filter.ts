import { SchemaGetter } from "effect";
import * as S from "effect/Schema";

const walletSources = {
  banks: S.mutable(S.Array(S.String)),
  cards: S.mutable(S.Array(S.Struct({ cardName: S.String, cardLast4: S.optional(S.NullOr(S.String)) }))),
};

/** The banks, cards and รายการไม่ระบุบัญชี (no bank and no card) chosen in the wallet sheet. */
const currentWalletFilterSchema = S.Struct({ ...walletSources, includeUnspecified: S.Boolean });

/**
 * App builds from before ticket 05's review send ไม่ระบุ as `includeOther` (and a reserved `includeDeletedCards`); read
 * it as `includeUnspecified`.
 */
const legacyWalletFilterSchema = S.Struct({ ...walletSources, includeOther: S.Boolean }).pipe(
  S.decodeTo(currentWalletFilterSchema, {
    decode: SchemaGetter.transform(({ includeOther, ...sources }) => ({
      ...sources,
      includeUnspecified: includeOther,
    })),
    encode: SchemaGetter.transform(({ includeUnspecified, ...sources }) => ({
      ...sources,
      includeOther: includeUnspecified,
    })),
  })
);

export const walletFilterSchema = S.Union([currentWalletFilterSchema, legacyWalletFilterSchema]);
export type WalletFilter = typeof walletFilterSchema.Type;

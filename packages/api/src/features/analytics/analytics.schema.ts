import * as S from "effect/Schema";

import { isoDateSchema } from "../../shared/finance/dates";
import { walletFilterSchema } from "../../shared/finance/wallet-filter";

const periodInput = S.Struct({
  from: isoDateSchema,
  to: isoDateSchema,
  walletFilter: S.optional(walletFilterSchema),
});

const breakdownInput = S.Struct({
  from: isoDateSchema,
  to: isoDateSchema,
  kind: S.optional(S.Literals(["income", "expense"])),
  walletFilter: S.optional(walletFilterSchema),
});

export const analyticsInputs = {
  feedCarrotForDate: S.toStandardSchemaV1(
    S.Struct({
      date: isoDateSchema,
      // JavaScript Date#getTimezoneOffset: minutes west of UTC on the device.
      timezoneOffsetMinutes: S.optional(S.Int.check(S.isBetween({ minimum: -840, maximum: 720 }))),
    })
  ),
  getPeriodSummary: S.toStandardSchemaV1(periodInput),
  getCategoryBreakdown: S.toStandardSchemaV1(breakdownInput),
  getTagBreakdown: S.toStandardSchemaV1(breakdownInput),
  getMonthlyTrend: S.toStandardSchemaV1(
    S.Struct({
      count: S.optional(S.Int.check(S.isBetween({ minimum: 1, maximum: 36 }))),
      asOf: S.optional(isoDateSchema),
      walletFilter: S.optional(walletFilterSchema),
    })
  ),
};

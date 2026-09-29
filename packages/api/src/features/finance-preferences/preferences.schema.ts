import * as S from "effect/Schema";

import { isoDateSchema } from "../../shared/finance/dates";

const settingKeySchema = S.Trim.check(S.isNonEmpty(), S.isMaxLength(128));
const termInput = S.Struct({ term: S.String });
const optionalAsOf = S.UndefinedOr(S.Struct({ asOf: S.optional(isoDateSchema) }));

export const preferencesInputs = {
  getSetting: S.toStandardSchemaV1(S.Struct({ key: settingKeySchema })),
  setSetting: S.toStandardSchemaV1(S.Struct({ key: settingKeySchema, value: S.String })),
  addRecentSearch: S.toStandardSchemaV1(termInput),
  removeRecentSearch: S.toStandardSchemaV1(termInput),
  setStreakCountMode: S.toStandardSchemaV1(S.Struct({ mode: S.Literals(["recorded", "categorized"]) })),
  setStreakEnabled: S.toStandardSchemaV1(S.Struct({ enabled: S.Boolean })),
  resetStreakProgress: S.toStandardSchemaV1(optionalAsOf),
  setMonthStartDay: S.toStandardSchemaV1(S.Struct({ day: S.Int.check(S.isBetween({ minimum: 1, maximum: 31 })) })),
  getCurrentPeriod: S.toStandardSchemaV1(optionalAsOf),
};

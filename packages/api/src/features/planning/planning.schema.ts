import * as S from "effect/Schema";

import { amountSatangSchema } from "../../shared/finance/common";
import { isoDateSchema, periodKeySchema } from "../../shared/finance/dates";

const kindSchema = S.Literals(["income", "expense", "transfer"]);
const nonEmptyText = S.Trim.check(S.isNonEmpty());
const optionalId = S.optional(S.NullOr(nonEmptyText));

const budgetInput = S.Struct({
  /** The budget being edited. It keeps this ID even when it moves to another target. */
  id: S.optional(nonEmptyText),
  periodKey: periodKeySchema,
  limitSatang: amountSatangSchema,
  categoryId: optionalId,
  tagId: optionalId,
  warningThresholdPercent: S.optional(S.Int.check(S.isBetween({ minimum: 1, maximum: 100 }))),
});

export const recurringInput = S.Struct({
  kind: kindSchema,
  amountSatang: amountSatangSchema,
  title: nonEmptyText,
  dayOfMonth: S.Int.check(S.isBetween({ minimum: 1, maximum: 31 })),
  startsOn: isoDateSchema,
  note: S.optional(S.String),
  bank: S.optional(S.NullOr(S.String)),
  categoryId: optionalId,
  tagIds: S.optional(S.mutable(S.Array(nonEmptyText))),
  endsOn: S.optional(S.NullOr(isoDateSchema)),
  isActive: S.optional(S.Boolean),
});

const recurringPatch = S.Struct({
  kind: S.optional(kindSchema),
  amountSatang: S.optional(amountSatangSchema),
  title: S.optional(nonEmptyText),
  dayOfMonth: S.optional(S.Int.check(S.isBetween({ minimum: 1, maximum: 31 }))),
  startsOn: S.optional(isoDateSchema),
  note: S.optional(S.String),
  bank: S.optional(S.NullOr(S.String)),
  categoryId: optionalId,
  tagIds: S.optional(S.mutable(S.Array(nonEmptyText))),
  endsOn: S.optional(S.NullOr(isoDateSchema)),
  isActive: S.optional(S.Boolean),
});

const periodQuery = S.UndefinedOr(
  S.Struct({ periodKey: S.optional(periodKeySchema), asOf: S.optional(isoDateSchema) })
);
const optionalAsOf = S.UndefinedOr(S.Struct({ asOf: S.optional(isoDateSchema) }));
const idInput = S.Struct({ id: nonEmptyText });

export const planningInputs = {
  listBudgets: S.toStandardSchemaV1(periodQuery),
  upsertBudget: S.toStandardSchemaV1(budgetInput),
  deleteBudget: S.toStandardSchemaV1(idInput),
  restoreBudget: S.toStandardSchemaV1(S.Struct({ deletionId: nonEmptyText })),
  getBudgetStatuses: S.toStandardSchemaV1(periodQuery),
  createRecurringRule: S.toStandardSchemaV1(recurringInput),
  updateRecurringRule: S.toStandardSchemaV1(S.Struct({ id: nonEmptyText, patch: recurringPatch })),
  deleteRecurringRule: S.toStandardSchemaV1(idInput),
  generateDueRecurringTransactions: S.toStandardSchemaV1(optionalAsOf),
};

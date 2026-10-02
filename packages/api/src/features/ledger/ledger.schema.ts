import * as S from "effect/Schema";

import { amountSatangSchema, isoDateSchema } from "../../shared/finance/common";
import { walletFilterSchema } from "../../shared/finance/wallet-filter";

const transactionKindSchema = S.Literals(["income", "expense", "transfer"]);
const transactionSourceSchema = S.Literals(["manual", "slip", "statement", "recurring"]);
const categoryKindSchema = S.Literals(["income", "expense"]);
const idSchema = S.Trim.check(S.isNonEmpty());
const idsSchema = S.mutable(S.Array(idSchema));

const transactionInputSchema = S.Struct({
  kind: transactionKindSchema,
  amountSatang: amountSatangSchema,
  occurredOn: isoDateSchema,
  title: S.String,
  note: S.optional(S.NullOr(S.String)),
  bank: S.optional(S.NullOr(S.String)),
  cardName: S.optional(S.NullOr(S.String)),
  cardLast4: S.optional(S.NullOr(S.String)),
  slipImageUri: S.optional(S.NullOr(S.String)),
  source: S.optional(transactionSourceSchema),
  categoryId: S.optional(S.NullOr(S.String)),
  tagIds: S.optional(idsSchema),
  dedupeKey: S.optional(S.NullOr(S.String)),
});

const transactionPatchSchema = S.Struct({
  kind: S.optional(transactionKindSchema),
  amountSatang: S.optional(amountSatangSchema),
  occurredOn: S.optional(isoDateSchema),
  title: S.optional(S.String),
  note: S.optional(S.NullOr(S.String)),
  bank: S.optional(S.NullOr(S.String)),
  cardName: S.optional(S.NullOr(S.String)),
  cardLast4: S.optional(S.NullOr(S.String)),
  slipImageUri: S.optional(S.NullOr(S.String)),
  source: S.optional(transactionSourceSchema),
  categoryId: S.optional(S.NullOr(S.String)),
  tagIds: S.optional(idsSchema),
  dedupeKey: S.optional(S.NullOr(S.String)),
});

export const transactionFiltersSchema = S.Struct({
  from: S.optional(isoDateSchema),
  to: S.optional(isoDateSchema),
  kind: S.optional(transactionKindSchema),
  bank: S.optional(S.String),
  cardName: S.optional(S.String),
  cardLast4: S.optional(S.String),
  categoryId: S.optional(S.String),
  tagId: S.optional(S.String),
  source: S.optional(transactionSourceSchema),
  search: S.optional(S.String),
  walletFilter: S.optional(walletFilterSchema),
  /** "occurred" (default): newest day first. "recorded": the entry recorded last first, whatever its day. */
  sort: S.optional(S.Literals(["occurred", "recorded"])),
  limit: S.optional(S.Int.check(S.isBetween({ minimum: 1, maximum: 1000 }))),
  offset: S.optional(S.Int.check(S.isGreaterThanOrEqualTo(0))),
});

const categoryInputSchema = S.Struct({
  name: S.String,
  kind: categoryKindSchema,
  icon: S.optional(S.String),
  color: S.optional(S.String),
  sortOrder: S.optional(S.Int),
});

const categoryPatchSchema = S.Struct({
  name: S.optional(S.String),
  kind: S.optional(categoryKindSchema),
  icon: S.optional(S.String),
  color: S.optional(S.String),
  sortOrder: S.optional(S.Int),
});

const tagInputSchema = S.Struct({
  name: S.String,
  color: S.optional(S.String),
});

const tagPatchSchema = S.Struct({
  name: S.optional(S.String),
  color: S.optional(S.String),
});

const idInputSchema = S.Struct({ id: idSchema });
const optionalFiltersSchema = S.UndefinedOr(transactionFiltersSchema);

export const ledgerInputs = {
  listTransactions: S.toStandardSchemaV1(optionalFiltersSchema),
  createTransaction: S.toStandardSchemaV1(transactionInputSchema),
  updateTransaction: S.toStandardSchemaV1(S.Struct({ id: idSchema, patch: transactionPatchSchema })),
  deleteTransaction: S.toStandardSchemaV1(idInputSchema),
  restoreTransaction: S.toStandardSchemaV1(idInputSchema),
  detectDuplicates: S.toStandardSchemaV1(transactionInputSchema),
  listCategories: S.toStandardSchemaV1(S.UndefinedOr(S.Struct({ kind: S.optional(categoryKindSchema) }))),
  createCategory: S.toStandardSchemaV1(categoryInputSchema),
  updateCategory: S.toStandardSchemaV1(S.Struct({ id: idSchema, patch: categoryPatchSchema })),
  deleteCategory: S.toStandardSchemaV1(idInputSchema),
  createTag: S.toStandardSchemaV1(tagInputSchema),
  updateTag: S.toStandardSchemaV1(S.Struct({ id: idSchema, patch: tagPatchSchema })),
  deleteTag: S.toStandardSchemaV1(idInputSchema),
  exportTransactionsCsv: S.toStandardSchemaV1(optionalFiltersSchema),
  seedDemoData: S.toStandardSchemaV1(S.UndefinedOr(S.Struct({ asOf: S.optional(isoDateSchema) }))),
};

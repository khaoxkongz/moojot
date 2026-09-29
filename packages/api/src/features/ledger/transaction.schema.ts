import * as S from "effect/Schema";

import { satangToNumber } from "../../shared/finance/common";

export const GetTransactionInputSchema = S.Struct({
  id: S.Trim.check(S.isNonEmpty()),
});
export const GetTransactionInputSchemaStd = S.toStandardSchemaV1(GetTransactionInputSchema);

export const FinanceTransactionSchema = S.Struct({
  id: S.String,
  kind: S.Literals(["income", "expense", "transfer"]),
  amountSatang: S.Int,
  occurredOn: S.String,
  title: S.String,
  note: S.String,
  bank: S.NullOr(S.String),
  cardName: S.NullOr(S.String),
  cardLast4: S.NullOr(S.String),
  slipImageUri: S.NullOr(S.String),
  source: S.Literals(["manual", "slip", "statement", "recurring"]),
  categoryId: S.NullOr(S.String),
  tagIds: S.mutable(S.Array(S.String)),
  recurringRuleId: S.NullOr(S.String),
  dedupeKey: S.NullOr(S.String),
  createdAt: S.String,
  updatedAt: S.String,
});
export const GetTransactionOutputSchemaStd = S.toStandardSchemaV1(S.NullOr(FinanceTransactionSchema));

type TransactionRecord = {
  id: string;
  kind: string;
  amountSatang: bigint;
  occurredOn: string;
  title: string;
  note: string;
  bank: string | null;
  cardName: string | null;
  cardLast4: string | null;
  slipImageUri: string | null;
  source: string;
  categoryId: string | null;
  tagIds: string[];
  recurringRuleId: string | null;
  dedupeKey: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function mapTransaction(row: TransactionRecord) {
  return {
    id: row.id,
    kind: row.kind as "income" | "expense" | "transfer",
    amountSatang: satangToNumber(row.amountSatang),
    occurredOn: row.occurredOn,
    title: row.title,
    note: row.note,
    bank: row.bank,
    cardName: row.cardName,
    cardLast4: row.cardLast4,
    slipImageUri: row.slipImageUri,
    source: row.source as "manual" | "slip" | "statement" | "recurring",
    categoryId: row.categoryId,
    tagIds: row.tagIds,
    recurringRuleId: row.recurringRuleId,
    dedupeKey: row.dedupeKey,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

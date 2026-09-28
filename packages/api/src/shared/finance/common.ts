import type { Prisma } from "@moojot/db";
import * as S from "effect/Schema";

import { FinanceBadRequestError, FinanceInternalError } from "./error";

// Older MongoDB transactions omitted deletedAt. Prisma treats an unset optional
// field differently from an explicit null in filters, even though both read as null.
export const activeTransactionWhere = {
  OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
} satisfies Prisma.FinanceTransactionWhereInput;

export const amountSatangSchema = S.Int.check(S.isGreaterThan(0));

export const isoDateSchema = S.String.check(
  S.isPattern(/^\d{4}-\d{2}-\d{2}$/),
  S.makeFilter((value: string) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value ? undefined : "Invalid ISO date";
  })
);

export function satangToNumber(value: bigint): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) {
    throw new FinanceInternalError({
      message: "Amount exceeds the supported satang range",
    });
  }
  return result;
}

export function requiredText(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new FinanceBadRequestError({ message: `${field} is required` });
  return trimmed;
}

export function nullableText(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

export function nullableSlipImageUri(value: string | null | undefined): string | null {
  const uri = nullableText(value);
  if (uri?.toLowerCase().startsWith("data:")) {
    throw new FinanceBadRequestError({
      message: "Slip image must be a URI reference, not embedded image data",
    });
  }
  return uri;
}

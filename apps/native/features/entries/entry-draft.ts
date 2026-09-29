import type { FinanceTransaction, TransactionInput, TransactionKind } from "@/types/finance";
import { formatBaht, isValidISODate, kindLabel, todayISO, toSatang } from "@/utils/format";
import { z } from "zod";

export type EntryDraft = {
  kind: TransactionKind;
  amount: string;
  title: string;
  occurredOn: string;
  categoryId: string | null;
  tagIds: string[];
  note: string;
  bank: string;
  cardName: string;
  cardLast4: string;
};

export const entryDraftSchema = z.object({
  kind: z.enum(["expense", "income", "transfer"]),
  amount: z.string().refine((value) => Boolean(toSatang(value)), "กรุณาใส่จำนวนเงินที่มากกว่า 0 บาท"),
  title: z.string(),
  occurredOn: z.string().refine(isValidISODate, "กรุณาเลือกวันที่ที่ถูกต้อง"),
  categoryId: z.string().nullable(),
  tagIds: z.array(z.string()),
  note: z.string(),
  bank: z.string(),
  cardName: z.string(),
  cardLast4: z.string(),
});

export function entryDraftError(draft: EntryDraft): string | undefined {
  const result = entryDraftSchema.safeParse(draft);
  return result.success ? undefined : (result.error.issues[0]?.message ?? "ตรวจสอบข้อมูลอีกครั้ง");
}

export function hasEntryChanges(current: EntryDraft, initial: EntryDraft): boolean {
  return JSON.stringify(current) !== JSON.stringify(initial);
}

export function blankEntryDraft(): EntryDraft {
  return {
    kind: "expense",
    amount: "",
    title: "",
    occurredOn: todayISO(),
    categoryId: null,
    tagIds: [],
    note: "",
    bank: "",
    cardName: "",
    cardLast4: "",
  };
}

export function draftFromTransaction(transaction: FinanceTransaction): EntryDraft {
  return {
    kind: transaction.kind,
    amount: formatBaht(transaction.amountSatang),
    title: transaction.title,
    occurredOn: transaction.occurredOn,
    categoryId: transaction.categoryId,
    tagIds: transaction.tagIds,
    note: transaction.note,
    bank: transaction.bank ?? "",
    cardName: transaction.cardName ?? "",
    cardLast4: transaction.cardLast4 ?? "",
  };
}

export function entryInputFromDraft(draft: EntryDraft, categoryName?: string): TransactionInput {
  const amountSatang = toSatang(draft.amount);
  if (!amountSatang) throw new Error("กรุณาใส่จำนวนเงินที่มากกว่า 0 บาท");
  if (!isValidISODate(draft.occurredOn)) throw new Error("กรุณาเลือกวันที่ที่ถูกต้อง");

  return {
    kind: draft.kind,
    amountSatang,
    occurredOn: draft.occurredOn,
    title: draft.title.trim() || draft.note.trim() || categoryName || kindLabel(draft.kind),
    note: draft.note.trim(),
    bank: draft.bank.trim() || null,
    cardName: draft.cardName.trim() || null,
    cardLast4: draft.cardLast4.trim() || null,
    categoryId: draft.kind === "transfer" ? null : draft.categoryId,
    tagIds: draft.kind === "transfer" ? [] : draft.tagIds,
  };
}

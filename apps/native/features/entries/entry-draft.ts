import { z } from "zod";

import type { FinanceTransaction, TransactionInput, TransactionKind, WalletCard } from "../../types/finance";
import { formatBaht, isValidISODate, kindLabel, todayISO, toSatang } from "../../utils/format";
import { bankDisplayName, bankId, commonBanks } from "../wallets/banks";
import { walletCardKey } from "../wallets/cards";

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

const AMOUNT_REQUIRED = "กรุณาใส่จำนวนเงินที่มากกว่า 0 บาท";
const DATE_INVALID = "กรุณาเลือกวันที่ที่ถูกต้อง";
const DATE_IN_FUTURE = "เลือกวันที่ในอนาคตไม่ได้";

const entryDraftSchema = (today: string) =>
  z.object({
    amount: z.string().refine((value) => Boolean(toSatang(value)), AMOUNT_REQUIRED),
    occurredOn: z
      .string()
      .refine(isValidISODate, DATE_INVALID)
      .refine((value) => value <= today, DATE_IN_FUTURE),
  });

/** A draft that can be saved, as the input to save, or the first field to fix and why. */
export type EntryDraftCheck =
  | { ok: true; input: TransactionInput }
  | { ok: false; field: "amount" | "occurredOn"; message: string };

export function hasEntryChanges(current: EntryDraft, initial: EntryDraft): boolean {
  return JSON.stringify(current) !== JSON.stringify(initial);
}

export function blankEntryDraft(today = todayISO()): EntryDraft {
  return {
    kind: "expense",
    amount: "",
    title: "",
    occurredOn: today,
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
    amount: formatBaht(transaction.amountSatang).replace(/,/g, "").replace(/\.00$/, ""),
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

/** A new type clears the category, which belongs to one type; a transfer also drops tags. */
export function changeEntryKind(draft: EntryDraft, kind: TransactionKind): EntryDraft {
  if (draft.kind === kind) return draft;
  return { ...draft, kind, categoryId: null, tagIds: kind === "transfer" ? [] : draft.tagIds };
}

function fallbackTitle(draft: EntryDraft, categoryName?: string) {
  return draft.note.trim() || (draft.kind === "transfer" ? "" : categoryName) || kindLabel(draft.kind);
}

/** What Home shows for an entry saved without a title. */
export function entryTitlePlaceholder(draft: EntryDraft, categoryName?: string) {
  return `ถ้าไม่ใส่ จะใช้ “${fallbackTitle(draft, categoryName)}”`;
}

/** Checks the draft once and, when it can be saved, turns it into what the Ledger saves. */
export function checkEntryDraft(
  draft: EntryDraft,
  { today = todayISO(), categoryName }: { today?: string; categoryName?: string } = {}
): EntryDraftCheck {
  const result = entryDraftSchema(today).safeParse(draft);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue?.path[0] === "occurredOn" ? "occurredOn" : "amount";
    return { ok: false, field, message: issue?.message ?? AMOUNT_REQUIRED };
  }
  return { ok: true, input: entryInput(draft, toSatang(draft.amount)!, categoryName) };
}

/** What the save button says: what to fix first, or that the entry will wait for a category. */
export function entrySaveLabel(draft: EntryDraft, check: EntryDraftCheck): string {
  if (!check.ok) {
    if (check.field === "amount") return "ใส่จำนวนเงินก่อนบันทึก";
    return check.message === DATE_IN_FUTURE ? "เลือกวันที่ที่ยังไม่เลยวันนี้" : "เลือกวันที่ก่อนบันทึก";
  }
  return draft.kind !== "transfer" && !draft.categoryId ? "บันทึก · ยังไม่เลือกหมวด" : "บันทึก";
}

function entryInput(draft: EntryDraft, amountSatang: number, categoryName?: string): TransactionInput {
  return {
    kind: draft.kind,
    amountSatang,
    occurredOn: draft.occurredOn,
    title: draft.title.trim() || fallbackTitle(draft, categoryName),
    note: draft.note.trim(),
    bank: draft.bank.trim() ? bankId(draft.bank) : null,
    cardName: draft.cardName.trim() || null,
    cardLast4: draft.cardLast4.trim() || null,
    categoryId: draft.kind === "transfer" ? null : draft.categoryId,
    tagIds: draft.kind === "transfer" ? [] : draft.tagIds,
  };
}

/** Where the money of a manual entry came from or went to: a bank, one card (name and last four digits), or none. */
export type EntrySourceChoice =
  | { key: string; label: string; type: "bank"; bank: string }
  | { key: string; label: string; type: "card"; cardName: string; cardLast4: string | null }
  | { key: "none"; label: string; type: "none" };

const cardChoice = (card: WalletCard): EntrySourceChoice => {
  const cardName = card.cardName.trim();
  const cardLast4 = card.cardLast4?.trim() || null;
  return {
    key: "card:" + walletCardKey(card),
    label: cardLast4 ? `${cardName} •• ${cardLast4}` : cardName,
    type: "card",
    cardName,
    cardLast4,
  };
};

const bankChoice = (bank: string): EntrySourceChoice => {
  const id = bankId(bank);
  return { key: "bank:" + id, label: bankDisplayName(bank), type: "bank", bank: id };
};

function draftChoice(draft: EntryDraft): EntrySourceChoice | null {
  if (draft.cardName.trim()) return cardChoice({ cardName: draft.cardName, cardLast4: draft.cardLast4 || null });
  if (draft.bank.trim()) return bankChoice(draft.bank);
  return null;
}

/** Common banks, the user's own banks and cards, the source already on the draft, then “ไม่ระบุ”. */
export function entrySourceChoices(
  known: { banks: readonly string[]; cards: readonly WalletCard[] },
  draft: EntryDraft
): EntrySourceChoice[] {
  const choices = new Map<string, EntrySourceChoice>();
  const add = (choice: EntrySourceChoice) => {
    if (!choices.has(choice.key)) choices.set(choice.key, choice);
  };
  for (const bank of [...commonBanks, ...known.banks]) if (bank.trim()) add(bankChoice(bank));
  for (const card of known.cards) if (card.cardName.trim()) add(cardChoice(card));
  const current = draftChoice(draft);
  if (current) add(current);
  return [...choices.values(), { key: "none", label: "ไม่ระบุ", type: "none" }];
}

export function selectedEntrySource(choices: EntrySourceChoice[], draft: EntryDraft) {
  const key = draftChoice(draft)?.key ?? "none";
  return choices.find((choice) => choice.key === key) ?? null;
}

export function selectEntrySource(draft: EntryDraft, choice: EntrySourceChoice): EntryDraft {
  if (choice.type === "bank") return { ...draft, bank: choice.bank, cardName: "", cardLast4: "" };
  if (choice.type === "card")
    return { ...draft, bank: "", cardName: choice.cardName, cardLast4: choice.cardLast4 ?? "" };
  return { ...draft, bank: "", cardName: "", cardLast4: "" };
}

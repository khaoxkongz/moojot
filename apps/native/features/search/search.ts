import { matchesAmountSearch } from "@moojot/api/shared/finance/search-terms";

import type { Category, FinanceTransaction, TransactionFilters, WalletCard } from "../../types/finance";
import { formatBaht, kindLabel } from "../../utils/format";
import { needsCategory } from "../entries/category-queue";
import { dayLabel } from "../home/home-days";
import { entryWalletLabel } from "../wallets/entry-wallet";

/**
 * The Ledger filters for a search: every month at once. A card scope (opened from a card's “ดูทั้งหมด”) keeps to that
 * card by name and last four, so another card with the same name stays out.
 */
export function searchFilters(term: string, card?: WalletCard | null): Omit<TransactionFilters, "limit" | "offset"> {
  const search = term.trim();
  return card ? { search, walletFilter: { banks: [], cards: [card], includeUnspecified: false } } : { search };
}

export type TextPart = { text: string; hit: boolean };

/** The text cut into the parts that match the term (any case) and the parts between them. */
export function splitHits(value: string, term: string): TextPart[] {
  const needle = term.trim().toLocaleLowerCase();
  if (!needle) return [{ text: value, hit: false }];
  const lower = value.toLocaleLowerCase();
  const parts: TextPart[] = [];
  let cursor = 0;
  let at = lower.indexOf(needle);
  while (at >= 0) {
    if (at > cursor) parts.push({ text: value.slice(cursor, at), hit: false });
    parts.push({ text: value.slice(at, at + needle.length), hit: true });
    cursor = at + needle.length;
    at = lower.indexOf(needle, cursor);
  }
  if (cursor < value.length || !parts.length) parts.push({ text: value.slice(cursor), hit: false });
  return parts;
}

export type SearchRow = {
  id: string;
  /** Waiting for a category: tapping opens the queue for it instead of the editor. */
  pending: boolean;
  /** The category's emoji, ⇄ for a transfer, empty while pending. */
  icon: string;
  title: TextPart[];
  meta: TextPart[];
  amount: string;
  amountHit: boolean;
  income: boolean;
};

export type SearchDay = { date: string; isToday: boolean; label: string; count: string; rows: SearchRow[] };

const amountLabel = (satang: number) => formatBaht(satang, satang % 100 === 0 ? 0 : 2);
const countLabel = (count: number) => `${count.toLocaleString("en-US")} รายการ`;

function searchRow(entry: FinanceTransaction, term: string, categories: Map<string, Category>): SearchRow {
  const needle = term.trim().toLocaleLowerCase();
  const pending = needsCategory(entry);
  const category = entry.categoryId ? categories.get(entry.categoryId) : undefined;
  const noteOnly =
    Boolean(entry.note) &&
    entry.note.toLocaleLowerCase().includes(needle) &&
    !entry.title.toLocaleLowerCase().includes(needle);
  const group = pending
    ? "รอเลือกหมวด"
    : entry.kind === "transfer"
      ? kindLabel("transfer")
      : (category?.name ?? "ไม่มีหมวดหมู่");
  const meta = noteOnly ? `โน้ต: ${entry.note}` : `${group} · ${entryWalletLabel(entry)}`;
  return {
    id: entry.id,
    pending,
    icon: pending ? "" : entry.kind === "transfer" ? "⇄" : (category?.icon ?? ""),
    title: splitHits(entry.title, term),
    meta: splitHits(meta, term),
    amount: `${entry.kind === "income" ? "+" : ""}${amountLabel(entry.amountSatang)}`,
    amountHit: matchesAmountSearch(term, entry.amountSatang),
    income: entry.kind === "income",
  };
}

/** Results grouped by day in the order given (newest first from the Ledger), with the line above them. */
export function searchResults(
  entries: FinanceTransaction[],
  { term, today, categories }: { term: string; today: string; categories: Category[] }
): { summary: string; days: SearchDay[] } {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const byDate = new Map<string, FinanceTransaction[]>();
  for (const entry of entries) byDate.set(entry.occurredOn, [...(byDate.get(entry.occurredOn) ?? []), entry]);
  const year = today.slice(0, 4);
  const days = [...byDate].map(([date, rows]) => ({
    date,
    isToday: date === today,
    label: date.startsWith(year)
      ? dayLabel(date)
      : `${dayLabel(date)} ${String(Number(date.slice(0, 4)) + 543).slice(-2)}`,
    count: countLabel(rows.length),
    rows: rows.map((row) => searchRow(row, term, categoryById)),
  }));
  const expense = entries
    .filter((entry) => entry.kind === "expense")
    .reduce((sum, entry) => sum + entry.amountSatang, 0);
  return {
    summary: `พบ ${countLabel(entries.length)}${expense ? ` · รายจ่ายรวม ${amountLabel(expense)} ฿` : ""}`,
    days,
  };
}

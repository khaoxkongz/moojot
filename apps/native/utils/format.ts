import type { FinanceTransaction, TransactionKind } from "../types/finance";

export function formatBaht(amountSatang: number, digits = 2) {
  return (amountSatang / 100).toLocaleString("th-TH", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatMoney(amountSatang: number, digits = 2) {
  return `฿${formatBaht(amountSatang, digits)}`;
}

export function toSatang(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 999999999) return null;
  return Math.round(amount * 100);
}

export function todayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isValidISODate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y = 0, m = 0, d = 0] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() + 1 === m && date.getDate() === d;
}

export function thaiDate(iso: string, options?: Intl.DateTimeFormatOptions) {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(
    "th-TH",
    options ?? { day: "numeric", month: "short", year: "numeric" }
  );
}

export function monthLabel(date: Date) {
  return date.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
}

export function periodBoundsForMonth(date: Date, startDay = 1) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const periodStart =
    date.getDate() >= startDay ? new Date(year, month, startDay) : new Date(year, month - 1, startDay);
  const nextStart = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, startDay);
  const end = new Date(nextStart.getTime() - 86400000);
  return {
    from: `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, "0")}-${String(periodStart.getDate()).padStart(2, "0")}`,
    to: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`,
    label: monthLabel(periodStart),
  };
}

export function kindLabel(kind: TransactionKind) {
  return kind === "expense" ? "รายจ่าย" : kind === "income" ? "รายรับ" : "ย้ายเงิน";
}

export function sourceLabel(source: FinanceTransaction["source"]) {
  return { manual: "จดเอง", slip: "สลิป", statement: "ใบแจ้งยอด", recurring: "จดซ้ำ" }[source];
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

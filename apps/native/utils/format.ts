import type { FinanceTransaction, TransactionKind } from "../types/finance";

export function formatBaht(amountSatang: number, digits = 2) {
  return (amountSatang / 100).toLocaleString("th-TH", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Baht with satang only when there are some, as the prototype writes amounts: "750.50", "240". */
export const amountLabel = (satang: number) => formatBaht(satang, satang % 100 === 0 ? 0 : 2);

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

/** Thai short month names as the prototype writes them; fixed so labels do not depend on the device's Intl data. */
const SHORT_THAI_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

/** "ก.ย." for month 9. */
export const shortThaiMonth = (month: number) => SHORT_THAI_MONTHS[month - 1]!;

/** Thai full month names, fixed for the same reason. */
const LONG_THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

/** "กันยายน" for month 9. */
export const longThaiMonth = (month: number) => LONG_THAI_MONTHS[month - 1]!;

/** "30 ก.ย." from "2026-09-30". */
export function shortThaiDate(iso: string) {
  const [, month = 1, day = 1] = iso.split("-").map(Number);
  return `${day} ${shortThaiMonth(month)}`;
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

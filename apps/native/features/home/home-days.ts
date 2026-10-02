import type { Category, FinanceTransaction } from "../../types/finance";
import { kindLabel, shortThaiDate, sourceLabel } from "../../utils/format";
import { needsCategory } from "../entries/category-queue";

const WEEKDAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

const pad = (value: number) => String(value).padStart(2, "0");
/** The device's calendar day of an instant (an entry's recorded time). */
export function localDay(instant: string) {
  const date = new Date(instant);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "พ. 30 ก.ย." */
export function dayLabel(iso: string) {
  const [year, month, day] = iso.split("-").map(Number) as [number, number, number];
  return `${WEEKDAYS[new Date(year, month - 1, day).getDay()]} ${shortThaiDate(iso)}`;
}

export type HomeRow = {
  entry: FinanceTransaction;
  id: string;
  title: string;
  /** Waiting for a category: tapping opens the queue for this one entry instead of the editor. */
  pending: boolean;
  /** The category's emoji, ⇄ for a transfer, empty while pending. */
  icon: string;
  meta: string;
  /** Recorded today (by the user, a slip or a recurring rule), whichever day it is for. */
  isNew: boolean;
};

export type HomeDay = {
  date: string;
  isToday: boolean;
  label: string;
  rows: HomeRow[];
  totalLabel: "รายจ่าย" | "รายรับ" | "ย้ายเงิน";
  /** The day's expense total; without expenses its income, and without either its transfers. */
  totalSatang: number;
};

/** The total of the entries of one kind, or of all of them. */
export const sumOf = (rows: FinanceTransaction[], kind?: FinanceTransaction["kind"]) =>
  rows.filter((row) => !kind || row.kind === kind).reduce((total, row) => total + row.amountSatang, 0);

function homeRow(entry: FinanceTransaction, today: string, categories: Map<string, Category>): HomeRow {
  const pending = needsCategory(entry);
  const category = entry.categoryId ? categories.get(entry.categoryId) : undefined;
  const source = sourceLabel(entry.source);
  return {
    entry,
    id: entry.id,
    title: entry.title,
    pending,
    icon: pending ? "" : entry.kind === "transfer" ? "⇄" : (category?.icon ?? ""),
    meta: pending
      ? `รอเลือกหมวด · ${source}`
      : `${entry.kind === "transfer" ? kindLabel("transfer") : (category?.name ?? "ไม่มีหมวดหมู่")} · ${source}`,
    isNew: localDay(entry.createdAt) === today,
  };
}

/** Entries grouped by day in the order given (newest day first from the server). */
export function homeDays(
  entries: FinanceTransaction[],
  { today, categories }: { today: string; categories: Category[] }
): HomeDay[] {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const byDate = new Map<string, FinanceTransaction[]>();
  for (const entry of entries) byDate.set(entry.occurredOn, [...(byDate.get(entry.occurredOn) ?? []), entry]);
  return [...byDate].map(([date, rows]) => {
    const expense = sumOf(rows, "expense");
    const income = sumOf(rows, "income");
    return {
      date,
      isToday: date === today,
      label: dayLabel(date),
      rows: rows.map((row) => homeRow(row, today, categoryById)),
      totalLabel: expense ? "รายจ่าย" : income ? "รายรับ" : "ย้ายเงิน",
      totalSatang: expense || income || sumOf(rows),
    };
  });
}

/** "จดล่าสุดวันนี้ 12:41" from the latest recorded time (not the entry's day), or that nothing is recorded yet. */
export function latestJotLabel(latestCreatedAt: string | null, today: string) {
  if (!latestCreatedAt) return "ยังไม่มีรายการที่จด";
  const date = new Date(latestCreatedAt);
  const day = localDay(latestCreatedAt);
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return `จดล่าสุด${day === today ? "วันนี้" : ` ${shortThaiDate(day)}`} ${time}`;
}

export type HomeSpeechInput = {
  reading: boolean;
  /** The photo-access prompt's message while access is missing. */
  photoMessage: string | null;
  /** Today's entries the app recorded from slips or statements. */
  autoToday: number;
  /** Entries waiting for a category in the period and filter Home shows: the count its link names. */
  pendingInView: number;
  /** Today's entries waiting for a category, whatever Home shows. */
  pendingToday: number;
  todayCount: number;
  /** False where slips cannot be read at all (web). */
  canRead: boolean;
};

/** The pig's bubble on Home. While entries wait for a category the link below says so, so there is no body. */
export function homeSpeech(input: HomeSpeechInput): { title: string; body: string | null } {
  if (input.reading) return { title: "หมูกำลังอ่านสลิป", body: "เปิดแอปไว้ก่อนน้า" };
  const title = input.autoToday > 0 ? `วันนี้หมูจดให้ ${input.autoToday} รายการ` : "วันนี้หมูพร้อมช่วยจด";
  if (input.photoMessage) return { title, body: input.photoMessage };
  if (input.pendingInView > 0) return { title, body: null };
  if (input.todayCount > 0 && input.pendingToday === 0) return { title, body: "วันนี้เลือกหมวดครบแล้ว" };
  return { title, body: input.canRead ? "หมูอ่านสลิปใหม่ให้อัตโนมัติ" : "แตะ “จดเพิ่ม” เพื่อจดรายการเอง" };
}

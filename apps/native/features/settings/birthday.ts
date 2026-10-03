import type { ISODate } from "../../types/finance";
import { buddhistYear, daysInMonth, isoDateParts, isoFromParts, isoYear } from "../../utils/dates";
import { isValidISODate, longThaiMonth } from "../../utils/format";

/** A birthday being picked in the three-column sheet. `year` is the Gregorian year; the sheet shows it in พ.ศ. */
export type BirthdayDraft = { day: number; month: number; year: number };

export const BIRTHDAY_INVALID = "วันเกิดไม่ถูกต้อง";
const EARLIEST_YEAR = 1900;
const range = (from: number, to: number) =>
  Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => (from <= to ? from + i : from - i));

/** The saved birthday (YYYY-MM-DD), or null when the day does not exist or is after today. */
export function checkBirthday({ day, month, year }: BirthdayDraft, today: ISODate): ISODate | null {
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  const iso = isoFromParts(year, month, day);
  return iso <= today ? iso : null;
}

/** Day, month and Buddhist-year columns. Years run from this year back to 1900. */
export function birthdayColumns(today: ISODate) {
  const thisYear = isoYear(today);
  return [
    { key: "day", label: "วัน", options: range(1, 31).map((value) => ({ value, label: String(value) })) },
    { key: "month", label: "เดือน", options: range(1, 12).map((value) => ({ value, label: longThaiMonth(value) })) },
    {
      key: "year",
      label: "ปี พ.ศ.",
      options: range(thisYear, EARLIEST_YEAR).map((value) => ({ value, label: String(buddhistYear(value)) })),
    },
  ] as const;
}

/** A valid saved birthday's parts, or null. */
export function birthdayParts(iso: string | null | undefined): BirthdayDraft | null {
  return iso && isValidISODate(iso) ? isoDateParts(iso) : null;
}

/** "12 มีนาคม 2543" for 2000-03-12. */
export function birthdayLabel(iso: ISODate): string {
  const parts = birthdayParts(iso);
  return parts ? `${parts.day} ${longThaiMonth(parts.month)} ${buddhistYear(parts.year)}` : "";
}

/** Where the sheet opens: the saved birthday, or 1 January 2000. */
export function birthdayDraft(saved: string | null): BirthdayDraft {
  return birthdayParts(saved) ?? { day: 1, month: 1, year: 2000 };
}

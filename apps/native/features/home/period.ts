import { getPeriodBounds, getPeriodForDate, shiftPeriodKey } from "../../utils/dates";

export type CalendarPeriod = "month" | "fortnight" | "week";

/** The calendar settings that decide Home's periods (ตั้งค่าปฏิทิน). */
export type HomeCalendar = { monthStartDay: number; weekStart: number; fortnightAnchor: string };

export type HomePeriod = {
  from: string;
  to: string;
  /** Between the arrows: "ก.ย. 69" for a month, "28 ก.ย. – 4 ต.ค. 69" for a week or fortnight. */
  label: string;
  /** Above the hero amount; a month that does not start on the 1st shows its days. */
  caption: string;
  previousLabel: string;
  nextLabel: string;
  /** The period holding today: there is nothing later to step to. */
  isCurrent: boolean;
};

/** Thai short month names as the prototype writes them; fixed so labels do not depend on the device's Intl data. */
const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

const parts = (iso: string) => iso.split("-").map(Number) as [number, number, number];
/** Two-digit Buddhist year: 2026 → "69". */
const thaiYear = (year: number) => String(year + 543).slice(-2);
export const shortThaiDate = (iso: string) => {
  const [, month, day] = parts(iso);
  return `${day} ${MONTHS[month - 1]}`;
};

function utcDate(value: string) {
  const [year, month, day] = parts(value);
  return new Date(Date.UTC(year, month - 1, day));
}

function addCalendarDays(value: string, count: number) {
  const date = utcDate(value);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string) {
  return Math.round((utcDate(to).getTime() - utcDate(from).getTime()) / 86_400_000);
}

export function weekStartForDate(date: string, weekday: number) {
  return addCalendarDays(date, -((utcDate(date).getUTCDay() - weekday + 7) % 7));
}

function rangeLabel(from: string, to: string) {
  const fromYear = parts(from)[0];
  const toYear = parts(to)[0];
  return `${shortThaiDate(from)}${fromYear !== toYear ? ` ${thaiYear(fromYear)}` : ""} – ${shortThaiDate(to)} ${thaiYear(toYear)}`;
}

/** The period `offset` steps before (negative) the one holding `date`, in the calendar mode the user set. */
export function selectedHomePeriod(
  date: string,
  offset: number,
  mode: CalendarPeriod,
  calendar: HomeCalendar
): HomePeriod {
  const isCurrent = offset >= 0;
  if (mode === "month") {
    const current = getPeriodForDate(date, calendar.monthStartDay);
    const { from, to } = getPeriodBounds(shiftPeriodKey(current.periodKey, offset), calendar.monthStartDay);
    const [year, month] = parts(from);
    return {
      from,
      to,
      label: `${MONTHS[month - 1]} ${thaiYear(year)}`,
      caption: calendar.monthStartDay === 1 ? "ยอดใช้จ่าย" : `ยอดใช้จ่าย · ${shortThaiDate(from)} – ${shortThaiDate(to)}`,
      previousLabel: "เดือนก่อน",
      nextLabel: "เดือนถัดไป",
      isCurrent,
    };
  }
  const length = mode === "week" ? 7 : 14;
  const base =
    mode === "week"
      ? weekStartForDate(date, calendar.weekStart)
      : addCalendarDays(calendar.fortnightAnchor, 14 * Math.floor(daysBetween(calendar.fortnightAnchor, date) / 14));
  const from = addCalendarDays(base, offset * length);
  const to = addCalendarDays(from, length - 1);
  return {
    from,
    to,
    label: rangeLabel(from, to),
    caption: "ยอดใช้จ่าย",
    previousLabel: "รอบก่อน",
    nextLabel: "รอบถัดไป",
    isCurrent,
  };
}

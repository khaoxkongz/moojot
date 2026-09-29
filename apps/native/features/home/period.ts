import { getPeriodBounds, getPeriodForDate, shiftPeriodKey } from "@/utils/dates";
import { thaiDate } from "@/utils/format";

export type CalendarPeriod = "month" | "fortnight" | "week";
type HomePeriod = { from: string; to: string; label: string };

function utcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
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
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  const start = thaiDate(from, {
    day: "numeric",
    month: "short",
    ...(!sameYear && { year: "2-digit" as const }),
  });
  const end = thaiDate(to, { day: "numeric", month: "short", year: "2-digit" });
  return `${start} – ${end}`;
}

export function selectedHomePeriod(
  date: string,
  offset: number,
  mode: CalendarPeriod,
  monthStartDay: number,
  weekStart: number,
  fortnightAnchor: string
): HomePeriod {
  if (mode === "month") {
    const current = getPeriodForDate(date, monthStartDay);
    const period = getPeriodBounds(shiftPeriodKey(current.periodKey, offset), monthStartDay);
    return {
      from: period.from,
      to: period.to,
      label: thaiDate(period.from, { month: "short", year: "2-digit" }),
    };
  }
  const length = mode === "week" ? 7 : 14;
  const base =
    mode === "week"
      ? weekStartForDate(date, weekStart)
      : addCalendarDays(fortnightAnchor, 14 * Math.floor(daysBetween(fortnightAnchor, date) / 14));
  const from = addCalendarDays(base, offset * length);
  const to = addCalendarDays(from, length - 1);
  return { from, to, label: rangeLabel(from, to) };
}

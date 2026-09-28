import type { ISODate, PeriodBounds, PeriodKey } from "../types/finance";

export function assertISODate(value: string): asserts value is ISODate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid date: ${value}`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new Error(`Invalid date: ${value}`);
  }
}

export function assertPeriodKey(value: string): asserts value is PeriodKey {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new Error(`Invalid period key: ${value}`);
  }
}

export function todayISO(): ISODate {
  const now = new Date();
  return isoFromParts(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function isoFromParts(year: number, month: number, day: number): ISODate {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function shiftPeriodKey(key: PeriodKey, months: number): PeriodKey {
  assertPeriodKey(key);
  if (!Number.isInteger(months)) throw new Error("Month offset must be an integer");
  const [year, month] = key.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function dateInMonth(key: PeriodKey, dayOfMonth: number): ISODate {
  assertPeriodKey(key);
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
    throw new Error("Day of month must be between 1 and 31");
  }
  const [year, month] = key.split("-").map(Number);
  return isoFromParts(year, month, Math.min(dayOfMonth, daysInMonth(year, month)));
}

export function previousDate(isoDate: ISODate): ISODate {
  assertISODate(isoDate);
  const [year, month, day] = isoDate.split("-").map(Number);
  return isoFromParts(year, month, day - 1);
}

export function getPeriodBounds(periodKey: PeriodKey, monthStartDay = 1): PeriodBounds {
  const from = dateInMonth(periodKey, monthStartDay);
  const endExclusive = dateInMonth(shiftPeriodKey(periodKey, 1), monthStartDay);
  return { periodKey, from, to: previousDate(endExclusive), endExclusive };
}

export function getPeriodForDate(date: ISODate, monthStartDay = 1): PeriodBounds {
  assertISODate(date);
  const currentKey = date.slice(0, 7);
  const currentStart = dateInMonth(currentKey, monthStartDay);
  return getPeriodBounds(date >= currentStart ? currentKey : shiftPeriodKey(currentKey, -1), monthStartDay);
}

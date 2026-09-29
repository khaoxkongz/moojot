import * as S from "effect/Schema";

import { isoDateSchema } from "./common";

export { isoDateSchema };
export const periodKeySchema = S.String.check(S.isPattern(/^\d{4}-(0[1-9]|1[0-2])$/));

export function todayISO(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function isoFromParts(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

export function shiftPeriodKey(key: string, months: number): string {
  S.decodeUnknownSync(periodKeySchema)(key);
  const [year, month] = key.split("-").map(Number) as [number, number];
  const shifted = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function dateInMonth(key: string, dayOfMonth: number): string {
  S.decodeUnknownSync(periodKeySchema)(key);
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
    throw new Error("Day of month must be between 1 and 31");
  }
  const [year, month] = key.split("-").map(Number) as [number, number];
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return isoFromParts(year, month, Math.min(dayOfMonth, days));
}

export function previousDate(date: string): string {
  S.decodeUnknownSync(isoDateSchema)(date);
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  return isoFromParts(year, month, day - 1);
}

export function getPeriodBounds(periodKey: string, monthStartDay = 1) {
  const from = dateInMonth(periodKey, monthStartDay);
  const endExclusive = dateInMonth(shiftPeriodKey(periodKey, 1), monthStartDay);
  return { periodKey, from, to: previousDate(endExclusive), endExclusive };
}

export function getPeriodForDate(date: string, monthStartDay = 1) {
  S.decodeUnknownSync(isoDateSchema)(date);
  const currentKey = date.slice(0, 7);
  const currentStart = dateInMonth(currentKey, monthStartDay);
  return getPeriodBounds(date >= currentStart ? currentKey : shiftPeriodKey(currentKey, -1), monthStartDay);
}

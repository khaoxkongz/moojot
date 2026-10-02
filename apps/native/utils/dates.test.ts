import { describe, expect, it } from "vite-plus/test";

import { buddhistYear, isoYear, nextMonthOffset, periodKeyOffset, shortBuddhistYear } from "./dates";

describe("Years", () => {
  it("writes a year in the Buddhist era", () => {
    expect(buddhistYear(2026)).toBe(2569);
  });

  it("writes a date's Buddhist-era year in two digits", () => {
    expect(shortBuddhistYear(isoYear("2025-12-31"))).toBe("68");
    expect(shortBuddhistYear(isoYear("2057-01-01"))).toBe("00");
    expect(shortBuddhistYear(isoYear("2066-01-01"))).toBe("09");
  });
});

describe("Month offsets", () => {
  it("opens on the month asked for, never after the current one", () => {
    expect(periodKeyOffset("2026-10", "2026-08")).toBe(-2);
    expect(periodKeyOffset("2026-01", "2025-12")).toBe(-1);
    expect(periodKeyOffset("2026-10", "2026-10")).toBe(0);
    expect(periodKeyOffset("2026-10", "2026-12")).toBe(0);
    expect(periodKeyOffset("2026-10", "nonsense")).toBe(0);
  });

  it("steps one month later, but not past the current month", () => {
    expect(nextMonthOffset(-2)).toBe(-1);
    expect(nextMonthOffset(0)).toBe(0);
  });
});

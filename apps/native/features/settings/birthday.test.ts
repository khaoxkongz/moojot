import { describe, expect, it } from "vite-plus/test";

import { birthdayColumns, birthdayDraft, birthdayLabel, checkBirthday } from "./birthday";

const today = "2026-10-04";

describe("birthday", () => {
  it("accepts a real day up to today and refuses one that does not exist or has not come yet", () => {
    expect(checkBirthday({ day: 29, month: 2, year: 2000 }, today)).toBe("2000-02-29");
    expect(checkBirthday({ day: 4, month: 10, year: 2026 }, today)).toBe("2026-10-04");
    expect(checkBirthday({ day: 29, month: 2, year: 2001 }, today)).toBeNull();
    expect(checkBirthday({ day: 31, month: 4, year: 1990 }, today)).toBeNull();
    expect(checkBirthday({ day: 5, month: 10, year: 2026 }, today)).toBeNull();
  });

  it("offers day, month and Buddhist-year columns, newest year first", () => {
    const [days, months, years] = birthdayColumns(today);
    expect(days.label).toBe("วัน");
    expect(days.options).toHaveLength(31);
    expect(months.label).toBe("เดือน");
    expect(months.options[0]).toEqual({ value: 1, label: "มกราคม" });
    expect(years.label).toBe("ปี พ.ศ.");
    expect(years.options[0]).toEqual({ value: 2026, label: "2569" });
    expect(years.options.at(-1)).toEqual({ value: 1900, label: "2443" });
  });

  it("names the day in Thai with the Buddhist year", () => {
    expect(birthdayLabel("2000-03-12")).toBe("12 มีนาคม 2543");
  });

  it("opens on the saved birthday, or on 1 January 2000 when there is none", () => {
    expect(birthdayDraft("1995-11-07")).toEqual({ day: 7, month: 11, year: 1995 });
    expect(birthdayDraft(null)).toEqual({ day: 1, month: 1, year: 2000 });
  });
});

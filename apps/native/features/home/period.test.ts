import { describe, expect, it } from "vite-plus/test";

import { selectedHomePeriod } from "./period";

const calendar = { monthStartDay: 1, weekStart: 0, fortnightAnchor: "2026-09-27" };

describe("Home period", () => {
  it("is the calendar month by default, captioned without dates", () => {
    expect(selectedHomePeriod("2026-09-30", 0, "month", calendar)).toMatchObject({
      from: "2026-09-01",
      to: "2026-09-30",
      label: "ก.ย. 69",
      caption: "ยอดใช้จ่าย",
      previousLabel: "เดือนก่อน",
      nextLabel: "เดือนถัดไป",
      isCurrent: true,
    });
  });

  it("uses a custom month start for its bounds and shows them in the caption", () => {
    const period = selectedHomePeriod("2026-09-30", 0, "month", { ...calendar, monthStartDay: 25 });
    expect(period).toMatchObject({
      from: "2026-09-25",
      to: "2026-10-24",
      label: "ก.ย. 69",
      caption: "ยอดใช้จ่าย · 25 ก.ย. – 24 ต.ค.",
    });
    // Before the 25th the open period is the one that started last month.
    expect(selectedHomePeriod("2026-09-10", 0, "month", { ...calendar, monthStartDay: 25 })).toMatchObject({
      from: "2026-08-25",
      to: "2026-09-24",
      label: "ส.ค. 69",
    });
  });

  it("caps a month start past the end of a short month", () => {
    expect(selectedHomePeriod("2026-03-01", 0, "month", { ...calendar, monthStartDay: 31 })).toMatchObject({
      from: "2026-02-28",
      to: "2026-03-30",
      caption: "ยอดใช้จ่าย · 28 ก.พ. – 30 มี.ค.",
    });
  });

  it("steps back by whole periods and is current only at offset 0", () => {
    expect(selectedHomePeriod("2026-09-30", -1, "month", calendar)).toMatchObject({
      from: "2026-08-01",
      to: "2026-08-31",
      label: "ส.ค. 69",
      isCurrent: false,
    });
    expect(selectedHomePeriod("2026-01-15", -1, "month", calendar).label).toBe("ธ.ค. 68");
  });

  it("starts a week on the chosen weekday and names it by its days", () => {
    expect(selectedHomePeriod("2026-09-30", 0, "week", { ...calendar, weekStart: 1 })).toMatchObject({
      from: "2026-09-28",
      to: "2026-10-04",
      label: "28 ก.ย. – 4 ต.ค. 69",
      caption: "ยอดใช้จ่าย",
      previousLabel: "รอบก่อน",
      nextLabel: "รอบถัดไป",
    });
    expect(selectedHomePeriod("2026-12-30", 0, "week", calendar).label).toBe("27 ธ.ค. 69 – 2 ม.ค. 70");
  });

  it("counts fortnights from the anchor, before it as well as after", () => {
    expect(selectedHomePeriod("2026-09-30", 0, "fortnight", calendar)).toMatchObject({
      from: "2026-09-27",
      to: "2026-10-10",
    });
    expect(selectedHomePeriod("2026-09-26", 0, "fortnight", calendar)).toMatchObject({
      from: "2026-09-13",
      to: "2026-09-26",
    });
  });
});

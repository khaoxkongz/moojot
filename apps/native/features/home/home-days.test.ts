import { describe, expect, it } from "vite-plus/test";

import type { Category, FinanceTransaction } from "../../types/finance";
import { homeDays, homeSpeech, latestJotLabel } from "./home-days";

const food: Category = {
  id: "expense-food",
  name: "อาหาร",
  kind: "expense",
  icon: "🍜",
  color: "#000",
  isSystem: true,
  sortOrder: 0,
};

let next = 0;
const entry = (patch: Partial<FinanceTransaction>): FinanceTransaction => ({
  id: `t${++next}`,
  kind: "expense",
  amountSatang: 100,
  occurredOn: "2026-09-30",
  title: "รายการ",
  note: "",
  bank: null,
  cardName: null,
  cardLast4: null,
  slipImageUri: null,
  source: "manual",
  categoryId: null,
  tagIds: [],
  recurringRuleId: null,
  dedupeKey: null,
  // Midday UTC is the same calendar day from UTC−12 to UTC+11.
  createdAt: "2026-09-20T12:00:00.000Z",
  updatedAt: "2026-09-20T12:00:00.000Z",
  ...patch,
});

const context = { today: "2026-09-30", categories: [food] };

describe("Home day list", () => {
  it("labels today and earlier days the way the prototype does", () => {
    const days = homeDays([entry({}), entry({ occurredOn: "2026-09-29" })], context);
    expect(days.map(({ isToday, label }) => ({ isToday, label }))).toEqual([
      { isToday: true, label: "พ. 30 ก.ย." },
      { isToday: false, label: "อ. 29 ก.ย." },
    ]);
  });

  it("totals a day's expenses, else its income, else its transfers", () => {
    const days = homeDays(
      [
        entry({ amountSatang: 6500 }),
        entry({ kind: "income", amountSatang: 100000 }),
        entry({ occurredOn: "2026-09-29", kind: "income", amountSatang: 2000 }),
        entry({ occurredOn: "2026-09-28", kind: "transfer", amountSatang: 300 }),
      ],
      context
    );
    expect(days.map(({ totalLabel, totalSatang }) => [totalLabel, totalSatang])).toEqual([
      ["รายจ่าย", 6500],
      ["รายรับ", 2000],
      ["ย้ายเงิน", 300],
    ]);
  });

  it("describes each row by its category, or as waiting for one, and where it came from", () => {
    const [day] = homeDays(
      [
        entry({ title: "Café Amazon", source: "slip", categoryId: "expense-food" }),
        entry({ title: "7-Eleven", source: "slip" }),
        entry({ title: "ย้ายไปออม", kind: "transfer" }),
        entry({ title: "เงินเดือน", kind: "income", source: "recurring" }),
      ],
      context
    );
    expect(day!.rows.map(({ title, pending, icon, meta }) => ({ title, pending, icon, meta }))).toEqual([
      { title: "Café Amazon", pending: false, icon: "🍜", meta: "อาหาร · สลิป" },
      { title: "7-Eleven", pending: true, icon: "", meta: "รอเลือกหมวด · สลิป" },
      { title: "ย้ายไปออม", pending: false, icon: "⇄", meta: "ย้ายเงิน · จดเอง" },
      { title: "เงินเดือน", pending: true, icon: "", meta: "รอเลือกหมวด · จดซ้ำ" },
    ]);
  });

  it("marks entries recorded today as new, whatever day they are for", () => {
    const [day] = homeDays(
      [entry({ createdAt: "2026-09-30T12:00:00.000Z" }), entry({ createdAt: "2026-09-29T12:00:00.000Z" })],
      context
    );
    expect(day!.rows.map((row) => row.isNew)).toEqual([true, false]);
  });
});

describe("latest jot", () => {
  const at = (month: number, day: number, hour: number, minute: number) =>
    new Date(2026, month - 1, day, hour, minute).toISOString();

  it("uses the time the entry was recorded", () => {
    expect(latestJotLabel(at(9, 30, 12, 41), "2026-09-30")).toBe("จดล่าสุดวันนี้ 12:41");
    expect(latestJotLabel(at(9, 29, 9, 5), "2026-09-30")).toBe("จดล่าสุด 29 ก.ย. 09:05");
    expect(latestJotLabel(null, "2026-09-30")).toBe("ยังไม่มีรายการที่จด");
  });
});

describe("Home speech", () => {
  const base = {
    reading: false,
    photoMessage: null,
    autoToday: 0,
    pendingInView: 0,
    pendingToday: 0,
    todayCount: 0,
    canRead: true,
  };

  it("says what the pig did today and what is left", () => {
    expect(homeSpeech(base)).toEqual({ title: "วันนี้หมูพร้อมช่วยจด", body: "หมูอ่านสลิปใหม่ให้อัตโนมัติ" });
    expect(homeSpeech({ ...base, autoToday: 2, todayCount: 3 })).toEqual({
      title: "วันนี้หมูจดให้ 2 รายการ",
      body: "วันนี้เลือกหมวดครบแล้ว",
    });
    // The pending link says it; no body.
    expect(homeSpeech({ ...base, todayCount: 3, pendingInView: 2, pendingToday: 2 })).toEqual({
      title: "วันนี้หมูพร้อมช่วยจด",
      body: null,
    });
  });

  it("leaves the pending count to the link for the period being viewed, even when today is done", () => {
    // An earlier day of the month waits; today's entries all have categories.
    expect(homeSpeech({ ...base, todayCount: 3, pendingInView: 1 }).body).toBeNull();
    // Viewing last month, which is done, while today still waits: the pig does not say today is done.
    expect(homeSpeech({ ...base, todayCount: 3, pendingToday: 1 }).body).toBe("หมูอ่านสลิปใหม่ให้อัตโนมัติ");
  });

  it("puts reading and photo access first", () => {
    expect(homeSpeech({ ...base, reading: true, pendingInView: 2 })).toEqual({
      title: "หมูกำลังอ่านสลิป",
      body: "เปิดแอปไว้ก่อนน้า",
    });
    expect(homeSpeech({ ...base, photoMessage: "ขอสิทธิ์รูป", pendingInView: 2 }).body).toBe("ขอสิทธิ์รูป");
    expect(homeSpeech({ ...base, canRead: false }).body).toBe("แตะ “จดเพิ่ม” เพื่อจดรายการเอง");
  });
});

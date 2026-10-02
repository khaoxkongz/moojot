import { describe, expect, it } from "vite-plus/test";

import type { Category, FinanceTransaction } from "../../types/finance";
import { searchResults, splitHits } from "./search";

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
  createdAt: "2026-09-30T05:00:00.000Z",
  updatedAt: "2026-09-30T05:00:00.000Z",
  ...patch,
});

const today = "2026-09-30";
const hits = (parts: { text: string; hit: boolean }[]) => parts.filter((part) => part.hit).map((part) => part.text);

describe("splitHits", () => {
  it("marks every match, whatever its case, and keeps the text as written", () => {
    expect(splitHits("Grab grab GRAB!", "grab")).toEqual([
      { text: "Grab", hit: true },
      { text: " ", hit: false },
      { text: "grab", hit: true },
      { text: " ", hit: false },
      { text: "GRAB", hit: true },
      { text: "!", hit: false },
    ]);
    expect(splitHits("ค่าไฟ", "  ")).toEqual([{ text: "ค่าไฟ", hit: false }]);
  });
});

describe("searchResults", () => {
  it("groups by day as given, counts each day and totals only expenses", () => {
    const results = searchResults(
      [
        entry({ title: "Grab ไปทำงาน", amountSatang: 12000, categoryId: "expense-food" }),
        entry({ title: "Grab คืนเงิน", kind: "income", amountSatang: 5000, categoryId: null }),
        entry({ title: "Grab", occurredOn: "2025-12-31", amountSatang: 7550, categoryId: "expense-food" }),
      ],
      { term: "grab", today, categories: [food] }
    );
    expect(results.summary).toBe("พบ 3 รายการ · รายจ่ายรวม 195.50 ฿");
    expect(results.days.map((day) => [day.label, day.isToday, day.countLabel, day.rows.length])).toEqual([
      ["พ. 30 ก.ย.", true, "2 รายการ", 2],
      // Another year says which one, since search covers every month.
      ["พ. 31 ธ.ค. 68", false, "1 รายการ", 1],
    ]);
  });

  it("leaves the total out when no result is an expense", () => {
    const results = searchResults([entry({ title: "เงินเดือน", kind: "income", amountSatang: 3000000 })], {
      term: "เงินเดือน",
      today,
      categories: [],
    });
    expect(results.summary).toBe("พบ 1 รายการ");
  });

  it("describes each row by category and wallet, or by the note when only the note matched", () => {
    const [day] = searchResults(
      [
        entry({ title: "ข้าวมันไก่", categoryId: "expense-food", bank: "KBank" }),
        entry({ title: "ร้านป้า", note: "ข้าวมันไก่เจ้าเก่า", categoryId: "expense-food" }),
        entry({ title: "ข้าวมันไก่ ร้านใหม่", cardName: "KTC", cardLast4: "4821" }),
        entry({ title: "ข้าวมันไก่ ฝากเพื่อน", kind: "transfer" }),
      ],
      { term: "ข้าวมันไก่", today, categories: [food] }
    ).days;
    expect(day!.rows.map((row) => [row.icon, row.pending, row.meta.map((part) => part.text).join("")])).toEqual([
      ["🍜", false, "อาหาร · กสิกรไทย"],
      ["🍜", false, "โน้ต: ข้าวมันไก่เจ้าเก่า"],
      ["", true, "รอเลือกหมวด · บัตร KTC •• 4821"],
      ["⇄", false, "ย้ายเงิน · ไม่ระบุบัญชี"],
    ]);
    expect(hits(day!.rows[1]!.meta)).toEqual(["ข้าวมันไก่"]);
    expect(hits(day!.rows[0]!.title)).toEqual(["ข้าวมันไก่"]);
  });

  it("highlights the amount when the term matched it, and writes income with a plus", () => {
    const [day] = searchResults(
      [
        entry({ title: "Netflix", amountSatang: 41900 }),
        entry({ title: "ค่าเช่า", amountSatang: 1419000 }),
        entry({ title: "คืนเงิน 419", kind: "income", amountSatang: 125050 }),
      ],
      { term: "419", today, categories: [] }
    ).days;
    expect(day!.rows.map((row) => [row.amount, row.amountHit, row.income])).toEqual([
      ["419", true, false],
      ["14,190", true, false],
      ["+1,250.50", false, true],
    ]);
  });
});

import { describe, expect, it } from "vite-plus/test";

import { budgetPeriodLine, planBudgets, replaceNote, warningLine } from "./plan";

const names = {
  categories: [{ id: "expense-food", name: "อาหาร", icon: "🍜" }],
  tags: [{ id: "tag-trip", name: "เที่ยว" }],
};
const status = (patch: {
  id: string;
  categoryId?: string | null;
  tagId?: string | null;
  limitSatang: number;
  spentSatang: number;
  warningThresholdPercent?: number;
}) => {
  const percentUsed = (patch.spentSatang / patch.limitSatang) * 100;
  const warn = patch.warningThresholdPercent ?? 80;
  return {
    budget: {
      id: patch.id,
      periodKey: "2026-10",
      categoryId: patch.categoryId ?? null,
      tagId: patch.tagId ?? null,
      limitSatang: patch.limitSatang,
      warningThresholdPercent: warn,
      createdAt: "",
      updatedAt: "",
    },
    spentSatang: patch.spentSatang,
    remainingSatang: patch.limitSatang - patch.spentSatang,
    percentUsed,
    isNearLimit: percentUsed >= warn,
    isOverLimit: patch.spentSatang > patch.limitSatang,
  };
};

describe("Plan budgets", () => {
  it("puts the all-category budget in the card and the others in rows, with status in words", () => {
    const plan = planBudgets(
      [
        status({ id: "all", limitSatang: 1_000_000, spentSatang: 1_000_000 }),
        status({ id: "food", categoryId: "expense-food", limitSatang: 300_000, spentSatang: 312_050 }),
        status({
          id: "trip",
          tagId: "tag-trip",
          limitSatang: 100_000,
          spentSatang: 70_000,
          warningThresholdPercent: 70,
        }),
        status({ id: "gone", tagId: "tag-deleted", limitSatang: 50_000, spentSatang: 0 }),
      ],
      names
    );
    // Spending exactly the limit is near (past the warning), never over, with nothing left; spending more is over.
    expect(plan.overall).toMatchObject({
      name: "งบรวมทุกหมวด",
      statusLabel: "ใกล้ครบงบ",
      statusIcon: "alert-outline",
      spent: "10,000",
      limit: "10,000",
      leftLabel: "เหลือ 0 ฿",
      bar: 100,
    });
    expect(plan.rows.map((row) => [row.icon, row.name, row.statusLabel, row.leftLabel, row.tone])).toEqual([
      ["🍜", "อาหาร", "เกินงบ", "เกิน 120.50 ฿", "over"],
      ["#", "เที่ยว", "ใกล้ครบงบ", "เหลือ 300 ฿", "near"],
      ["#", "แท็กที่ลบไปแล้ว", "ตามแผน", "เหลือ 500 ฿", "ok"],
    ]);
    expect(plan.rows[0]!.bar).toBe(100);
    expect(plan.rows[2]!.bar).toBe(0);
    expect(plan.countLabel).toBe("3 งบ · เกิน 1");
  });

  it("shows a sliver of bar for a little spending, and counts near budgets when none is over", () => {
    const plan = planBudgets(
      [
        status({ id: "food", categoryId: "expense-food", limitSatang: 1_000_000, spentSatang: 500 }),
        status({ id: "trip", tagId: "tag-trip", limitSatang: 100_000, spentSatang: 90_000 }),
      ],
      names
    );
    expect(plan.overall).toBeNull();
    expect(plan.rows[0]!.bar).toBe(2);
    expect(plan.countLabel).toBe("2 งบ · ใกล้ครบ 1");
    expect(planBudgets([], names)).toEqual({ overall: null, rows: [], countLabel: "" });
  });
});

describe("Budget form", () => {
  it("names the month and its days", () => {
    expect(budgetPeriodLine("2026-10", 1)).toBe("สำหรับเดือนตุลาคม 2569 · 1 ต.ค. – 31 ต.ค.");
    expect(budgetPeriodLine("2026-12", 25)).toBe("สำหรับเดือนธันวาคม 2569 · 25 ธ.ค. – 24 ม.ค.");
  });

  it("says in baht when the warning comes", () => {
    expect(warningLine(500_000, 80)).toBe("ใช้ไปถึง 4,000 ฿ หมูจะเตือนว่าใกล้ครบงบ");
    expect(warningLine(12_345, 50)).toBe("ใช้ไปถึง 61.73 ฿ หมูจะเตือนว่าใกล้ครบงบ");
    expect(warningLine(null, 70)).toBe("เช่น ตั้งงบ 1,000 ฿ หมูจะเตือนเมื่อใช้ไป 700 ฿");
  });

  it("warns that saving onto a target that has a budget replaces its limit", () => {
    const budgets = [
      { id: "food", categoryId: "expense-food", tagId: null, limitSatang: 300_000 },
      { id: "all", categoryId: null, tagId: null, limitSatang: 1_000_050 },
    ];
    const note = "มีงบนี้อยู่แล้ว 3,000 ฿ บันทึกแล้วจะใช้วงเงินใหม่แทน";
    expect(replaceNote(budgets, { target: "category", categoryId: "expense-food", tagId: null })).toBe(note);
    expect(replaceNote(budgets, { id: "trip", target: "all", categoryId: null, tagId: null })).toBe(
      "มีงบนี้อยู่แล้ว 10,000.50 ฿ บันทึกแล้วจะใช้วงเงินใหม่แทน"
    );
    // Editing a budget on its own target, a target with no budget, or no pick yet: nothing to replace.
    expect(replaceNote(budgets, { id: "food", target: "category", categoryId: "expense-food", tagId: null })).toBe(
      null
    );
    expect(replaceNote(budgets, { target: "category", categoryId: "expense-shopping", tagId: null })).toBe(null);
    expect(replaceNote(budgets, { target: "category", categoryId: null, tagId: null })).toBe(null);
    // A tag budget never matches the all-category one, though both have no category.
    expect(replaceNote(budgets, { target: "tag", categoryId: null, tagId: "tag-trip" })).toBe(null);
  });
});

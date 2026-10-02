import { describe, expect, it } from "vite-plus/test";

import { planRowSubtitle, summaryEmpty, summaryMonth, summaryOverview, summaryRows, summaryTrend } from "./summary";

const period = { from: "2026-09-01", to: "2026-09-30", transactionCount: 0, transferCount: 0 };
/** A category group as the server sends it: `percentage` is its share of the kind's (filtered) total. */
const category = (patch: {
  categoryId: string | null;
  totalSatang: number;
  transactionCount: number;
  percentage: number;
}) => ({
  categoryName: patch.categoryId ? `หมวด ${patch.categoryId}` : "ไม่มีหมวดหมู่",
  icon: "🍜",
  color: "#000",
  pendingIds: [],
  ...patch,
});

describe("Summary month", () => {
  it("is this calendar month with its full Thai name", () => {
    expect(summaryMonth("2026-09-30", 0, 1)).toEqual({
      periodKey: "2026-09",
      from: "2026-09-01",
      to: "2026-09-30",
      title: "กันยายน 2569",
      overviewTitle: "ภาพรวมเดือนนี้",
      isCurrent: true,
    });
  });

  it("names an earlier month in the overview", () => {
    expect(summaryMonth("2026-09-30", -1, 1)).toMatchObject({
      from: "2026-08-01",
      to: "2026-08-31",
      title: "สิงหาคม 2569",
      overviewTitle: "ภาพรวมสิงหาคม",
      isCurrent: false,
    });
  });

  it("uses a custom month start for its bounds and shows them after the name", () => {
    // 25 ก.ย. – 24 ต.ค. is the month that started in กันยายน.
    expect(summaryMonth("2026-10-02", 0, 25)).toMatchObject({
      periodKey: "2026-09",
      from: "2026-09-25",
      to: "2026-10-24",
      title: "กันยายน 2569 · 25 ก.ย. – 24 ต.ค.",
    });
    expect(summaryMonth("2026-10-02", -1, 25)).toMatchObject({ from: "2026-08-25", to: "2026-09-24" });
  });

  it("crosses the year with a Buddhist year", () => {
    expect(summaryMonth("2026-01-15", -1, 1)).toMatchObject({ title: "ธันวาคม 2568", from: "2025-12-01" });
  });
});

describe("Summary overview", () => {
  it("shows what is left of the income", () => {
    expect(
      summaryOverview({
        ...period,
        incomeSatang: 5_000_000,
        expenseSatang: 1_234_550,
        transferSatang: 99,
        netSatang: 3_765_450,
      })
    ).toEqual({ income: "50,000.00", expense: "12,345.50", net: "37,654.50", netLabel: "เหลือ" });
  });

  it("says when spending went past the income, with the amount over", () => {
    expect(
      summaryOverview({ ...period, incomeSatang: 0, expenseSatang: 10_000, transferSatang: 0, netSatang: -10_000 })
    ).toMatchObject({ net: "100.00", netLabel: "ใช้เกินรายรับ" });
  });
});

describe("Summary rows", () => {
  it("bars each category by its share of the kind's total, and opens the pending group's entries", () => {
    const rows = summaryRows({
      kind: "expense",
      mode: "category",
      kindTotalSatang: 100_001,
      transferCount: 0,
      categories: [
        category({ categoryId: "food", totalSatang: 75_050, transactionCount: 3, percentage: 75.05 }),
        {
          ...category({ categoryId: null, totalSatang: 24_950, transactionCount: 2, percentage: 24.95 }),
          pendingIds: ["b", "a"],
        },
        category({ categoryId: "tiny", totalSatang: 1, transactionCount: 1, percentage: 0.001 }),
      ],
      tags: [],
    });
    expect(rows.slice(0, 2)).toEqual([
      {
        key: "food",
        pending: false,
        icon: "🍜",
        name: "หมวด food",
        amount: "750.50",
        bar: 75.05,
        meta: "3 รายการ · 75%",
      },
      {
        key: "pending",
        pending: true,
        icon: "",
        name: "ยังไม่เลือกหมวด",
        amount: "249.50",
        bar: 24.95,
        meta: "2 รายการ · แตะเพื่อเลือกหมวด",
        pendingIds: ["b", "a"],
      },
    ]);
    expect(rows[2]).toMatchObject({ key: "tiny", amount: "0.01", meta: "1 รายการ · 0%" });
    // A sliver stays visible.
    expect(rows[2]!.bar).toBeGreaterThan(0.001);
  });

  it("lists only tagged groups by tag, each a share of the kind's total so they may pass 100% together", () => {
    const tag = (tagId: string | null, tagName: string, totalSatang: number, count: number, percentage: number) => ({
      tagId,
      tagName,
      color: "#000",
      totalSatang,
      transactionCount: count,
      percentage,
    });
    const rows = summaryRows({
      kind: "expense",
      mode: "tag",
      kindTotalSatang: 100_000,
      transferCount: 0,
      categories: [],
      tags: [tag(null, "ไม่มีแท็ก", 60_000, 1, 60), tag("trip", "เที่ยว", 40_000, 2, 40), tag("work", "งาน", 30_000, 1, 30)],
    });
    expect(rows.map((row) => [row.icon, row.name, row.bar, row.meta])).toEqual([
      ["#", "เที่ยว", 40, "2 รายการ"],
      ["#", "งาน", 30, "1 รายการ"],
    ]);
  });

  it("shows transfers as one total, apart from income and expense", () => {
    const transfers = (kindTotalSatang: number, transferCount: number) =>
      summaryRows({ kind: "transfer", mode: "category", kindTotalSatang, transferCount, categories: [], tags: [] });
    expect(transfers(700_000, 2)).toEqual([
      { key: "transfer", pending: false, icon: "⇄", name: "ยอดย้ายเงินรวม", amount: "7,000", bar: 100, meta: "2 รายการ" },
    ]);
    expect(transfers(0, 0)).toEqual([]);
  });

  it("says why there are no bars", () => {
    expect(summaryEmpty("expense", 0)).toEqual({
      title: "ยังไม่มีรายจ่ายในช่วงนี้",
      body: "จดรายการในช่วงนี้ แล้วหมูจะสรุปให้",
    });
    expect(summaryEmpty("transfer", 0)).toEqual({
      title: "ยังไม่มีย้ายเงินในช่วงนี้",
      body: "ยอดย้ายเงินไม่รวมในรายรับและรายจ่าย",
    });
    // Money came in, but no entry of it has a tag.
    expect(summaryEmpty("income", 5_000)).toEqual({
      title: "ยังไม่มีแท็ก",
      body: "เพิ่มแท็กให้รายการ แล้วหมูจะช่วยรวมยอดให้",
    });
  });
});

describe("Summary trend", () => {
  const month = (periodKey: string, expenseSatang: number, incomeSatang = 0) => ({
    periodKey,
    label: "server label",
    from: `${periodKey}-01`,
    to: `${periodKey}-28`,
    incomeSatang,
    expenseSatang,
    transferSatang: 0,
    transferCount: 0,
    netSatang: incomeSatang - expenseSatang,
    transactionCount: 0,
  });
  const sixMonths = [
    month("2026-04", 0),
    month("2026-05", 1_000_000),
    month("2026-06", 250_049),
    month("2026-07", 0),
    month("2026-08", 400_000, 900_000),
    month("2026-09", 500_000),
  ];

  it("draws six bars ending at the month on screen, tallest at 100", () => {
    const trend = summaryTrend(sixMonths, "expense");
    expect(trend.title).toBe("รายจ่าย 6 เดือนล่าสุด");
    expect(trend.bars.map(({ key, label, value, current }) => [key, label, value, current])).toEqual([
      ["2026-04", "เม.ย.", "–", false],
      ["2026-05", "พ.ค.", "10,000", false],
      ["2026-06", "มิ.ย.", "2,500", false],
      ["2026-07", "ก.ค.", "–", false],
      ["2026-08", "ส.ค.", "4,000", false],
      ["2026-09", "ก.ย.", "5,000", true],
    ]);
    const [april, may, june, july, august, september] = trend.bars.map((bar) => bar.height);
    expect([may, june, august, september]).toEqual([100, 25, 40, 50]);
    // An empty month still shows a stub.
    expect(april).toBeGreaterThan(0);
    expect(july).toBeGreaterThan(0);
  });

  it("compares the month with the one before", () => {
    expect(summaryTrend(sixMonths, "expense").compare).toEqual({
      icon: "arrow-up",
      text: "ใช้มากกว่าเดือนก่อน 1,000 ฿ (25%)",
    });
    const income = [month("2026-07", 0, 450_000), month("2026-08", 0, 900_000)];
    expect(summaryTrend(income, "income").compare).toEqual({
      icon: "arrow-up",
      text: "ได้รับมากกว่าเดือนก่อน 4,500 ฿ (100%)",
    });
    const fewer = [...sixMonths.slice(0, 5), month("2026-09", 300_050)];
    expect(summaryTrend(fewer, "expense").compare).toEqual({
      icon: "arrow-down",
      text: "ใช้น้อยกว่าเดือนก่อน 999.50 ฿ (25%)",
    });
    const same = [...sixMonths.slice(0, 5), month("2026-09", 400_000)];
    expect(summaryTrend(same, "expense").compare).toEqual({ icon: "equal", text: "ใช้เท่ากับเดือนก่อน" });
    expect(summaryTrend(sixMonths.slice(0, 2), "expense").compare).toEqual({
      icon: "information-outline",
      text: "เดือนก่อนยังไม่มีรายจ่ายให้เปรียบเทียบ",
    });
  });

  it("names the kind missing from the month before, which may have had entries of another kind", () => {
    // สิงหาคม had income but no transfer.
    expect(summaryTrend(sixMonths, "transfer").compare.text).toBe("เดือนก่อนยังไม่มีย้ายเงินให้เปรียบเทียบ");
    // มิถุนายน had spending but no income.
    expect(summaryTrend(sixMonths.slice(2, 4), "income").compare.text).toBe("เดือนก่อนยังไม่มีรายรับให้เปรียบเทียบ");
  });

  it("keeps empty bars visible when nothing was recorded", () => {
    const empty = summaryTrend(
      sixMonths.map((item) => ({ ...item, expenseSatang: 0 })),
      "expense"
    );
    expect(empty.bars.map((bar) => bar.value)).toEqual(Array(6).fill("–"));
    expect(empty.bars.every((bar) => bar.height > 0)).toBe(true);
    expect(empty.compare.icon).toBe("information-outline");
  });
});

describe("Summary plan row", () => {
  const status = (spentSatang: number, limitSatang: number, warningThresholdPercent = 80) => ({
    spentSatang,
    budget: { limitSatang, warningThresholdPercent },
  });

  it("invites to plan when the month has no budget", () => {
    expect(planRowSubtitle([])).toBe("กำหนดว่าแต่ละเดือนจะใช้ได้เท่าไหร่");
  });

  it("counts budgets over first, then near, and spending exactly the budget is not over", () => {
    expect(planRowSubtitle([status(100, 100), status(50, 100)])).toBe("ตั้งไว้ 2 งบ · ใกล้ครบ 1");
    expect(planRowSubtitle([status(101, 100), status(80, 100), status(10, 100)])).toBe("ตั้งไว้ 3 งบ · เกินงบ 1");
    expect(planRowSubtitle([status(10, 100)])).toBe("ตั้งไว้ 1 งบ · ตามแผนทั้งหมด");
  });

  it("says budgets count every wallet while Summary is narrowed to some", () => {
    expect(planRowSubtitle([status(101, 100)], { walletFiltered: true })).toBe("ตั้งไว้ 1 งบ · เกินงบ 1 · นับทุกบัญชี");
    expect(planRowSubtitle([], { walletFiltered: true })).toBe("กำหนดว่าแต่ละเดือนจะใช้ได้เท่าไหร่");
  });
});

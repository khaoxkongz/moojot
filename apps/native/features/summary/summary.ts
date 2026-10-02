import type { CategoryBreakdownItem, PeriodSummary, TagBreakdownItem, TransactionKind } from "../../types/finance";
import { getPeriodBounds, getPeriodForDate, shiftPeriodKey } from "../../utils/dates";
import { formatBaht, longThaiMonth, shortThaiDate, shortThaiMonth } from "../../utils/format";

export type SummaryMode = "category" | "tag";

/** Whole baht without decimals, as the prototype writes bar amounts: "750.50", "240". */
const amountLabel = (satang: number) => formatBaht(satang, satang % 100 === 0 ? 0 : 2);

/** One Summary month: Summary always counts by month, from the user's month start day. */
export type SummaryMonth = {
  periodKey: string;
  from: string;
  to: string;
  /** Between the arrows: "กันยายน 2569", plus " · 25 ก.ย. – 24 ต.ค." when the month does not start on the 1st. */
  title: string;
  /** Above the totals: "ภาพรวมเดือนนี้" or "ภาพรวมสิงหาคม". */
  overviewTitle: string;
  /** The month holding today: there is nothing later to step to. */
  isCurrent: boolean;
};

const parts = (iso: string) => iso.split("-").map(Number) as [number, number, number];

/** The month `offset` steps before (negative) the one holding `today`. */
export function summaryMonth(today: string, offset: number, monthStartDay: number): SummaryMonth {
  const current = getPeriodForDate(today, monthStartDay).periodKey;
  const { periodKey, from, to } = getPeriodBounds(shiftPeriodKey(current, offset), monthStartDay);
  const [year, month] = parts(periodKey);
  const name = longThaiMonth(month);
  return {
    periodKey,
    from,
    to,
    title: `${name} ${year + 543}${monthStartDay === 1 ? "" : ` · ${shortThaiDate(from)} – ${shortThaiDate(to)}`}`,
    overviewTitle: offset >= 0 ? "ภาพรวมเดือนนี้" : `ภาพรวม${name}`,
    isCurrent: offset >= 0,
  };
}

/** The accent card: ได้รับ, ใช้ไป and what is left of the income (or how far spending went past it). */
export function summaryOverview(summary: PeriodSummary) {
  return {
    income: formatBaht(summary.incomeSatang),
    expense: formatBaht(summary.expenseSatang),
    net: formatBaht(Math.abs(summary.netSatang)),
    netLabel: summary.netSatang >= 0 ? "เหลือ" : "ใช้เกินรายรับ",
  };
}

export type SummaryRow = {
  key: string;
  /** The ยังไม่เลือกหมวด group: tapping it opens the pending-category queue with `pendingIds`. */
  pending: boolean;
  /** Category emoji, "#" for a tag, "⇄" for transfers; empty for the pending group (it shows a pencil). */
  icon: string;
  name: string;
  amount: string;
  /** Bar width in percent of the kind's total, at least 2 so a small group stays visible. */
  bar: number;
  meta: string;
  pendingIds?: string[];
};

const barWidth = (share: number) => Math.max(2, share);

const kindLabels: Record<TransactionKind, string> = { expense: "รายจ่าย", income: "รายรับ", transfer: "ย้ายเงิน" };

/** The total of one kind in a month's (or trend month's) totals. */
export function kindTotal(
  summary: Pick<PeriodSummary, "incomeSatang" | "expenseSatang" | "transferSatang">,
  kind: TransactionKind
) {
  return kind === "income" ? summary.incomeSatang : kind === "expense" ? summary.expenseSatang : summary.transferSatang;
}

/** The question above the bars, under the kind tabs. */
export const summaryQuestion = (kind: TransactionKind) =>
  ({ expense: "ใช้ไปกับอะไรบ้าง", income: "ได้มาจากไหนบ้าง", transfer: "ย้ายเงินไปเท่าไหร่" })[kind];

/** What shows in place of the bars when there are none. */
export function summaryEmpty(kind: TransactionKind, kindTotalSatang: number) {
  if (kindTotalSatang === 0) {
    return {
      title: `ยังไม่มี${kindLabels[kind]}ในช่วงนี้`,
      body: kind === "transfer" ? "ยอดย้ายเงินไม่รวมในรายรับและรายจ่าย" : "จดรายการในช่วงนี้ แล้วหมูจะสรุปให้",
    };
  }
  return { title: "ยังไม่มีแท็ก", body: "เพิ่มแท็กให้รายการ แล้วหมูจะช่วยรวมยอดให้" };
}

export type TrendBar = { key: string; label: string; value: string; height: number; current: boolean };

/**
 * The months ending at the one on screen (the last), for one kind: bars up to 100 tall (4 at least, so an empty month
 * still shows) and how the month compares with the one before.
 */
export function summaryTrend(
  months: Array<Pick<PeriodSummary, "incomeSatang" | "expenseSatang" | "transferSatang"> & { periodKey: string }>,
  kind: TransactionKind
) {
  const totals = months.map((month) => kindTotal(month, kind));
  const max = Math.max(1, ...totals);
  const bars: TrendBar[] = months.map((month, index) => {
    const total = totals[index]!;
    return {
      key: month.periodKey,
      label: shortThaiMonth(Number(month.periodKey.slice(5, 7))),
      value: total ? Math.round(total / 100).toLocaleString("en-US") : "–",
      height: Math.max(4, Math.round((total / max) * 100)),
      current: index === months.length - 1,
    };
  });
  const current = totals.at(-1) ?? 0;
  const previous = totals.at(-2) ?? 0;
  const difference = current - previous;
  const verb = { expense: "ใช้", income: "ได้รับ", transfer: "ย้ายเงิน" }[kind];
  const compare =
    previous === 0
      ? { icon: "information-outline" as const, text: "เดือนก่อนยังไม่มีรายการให้เปรียบเทียบ" }
      : difference === 0
        ? { icon: "equal" as const, text: `${verb}เท่ากับเดือนก่อน` }
        : {
            icon: difference > 0 ? ("arrow-up" as const) : ("arrow-down" as const),
            text: `${verb}${difference > 0 ? "มากกว่า" : "น้อยกว่า"}เดือนก่อน ${amountLabel(Math.abs(difference))} ฿ (${Math.round((Math.abs(difference) / previous) * 100)}%)`,
          };
  return { title: `${kindLabels[kind]} 6 เดือนล่าสุด`, bars, compare };
}

type BudgetStatusLike = { spentSatang: number; budget: { limitSatang: number; warningThresholdPercent: number } };

/**
 * Under วางแผนงบ: the month's budgets by their own scope (never the wallet filter). Spending exactly the budget is not
 * over it; spending more is.
 */
export function planRowSubtitle(statuses: BudgetStatusLike[]) {
  if (!statuses.length) return "กำหนดว่าแต่ละเดือนจะใช้ได้เท่าไหร่";
  const over = statuses.filter((item) => item.spentSatang > item.budget.limitSatang).length;
  const near = statuses.filter(
    (item) =>
      item.spentSatang <= item.budget.limitSatang &&
      (item.spentSatang / item.budget.limitSatang) * 100 >= item.budget.warningThresholdPercent
  ).length;
  return `ตั้งไว้ ${statuses.length} งบ · ${over ? `เกินงบ ${over}` : near ? `ใกล้ครบ ${near}` : "ตามแผนทั้งหมด"}`;
}

/** The bars under the kind tabs: by category or tag for income and expense, one total for transfers. */
export function summaryRows(input: {
  kind: TransactionKind;
  mode: SummaryMode;
  kindTotalSatang: number;
  transferCount: number;
  categories: CategoryBreakdownItem[];
  tags: TagBreakdownItem[];
}): SummaryRow[] {
  const share = (satang: number) => (input.kindTotalSatang ? (satang / input.kindTotalSatang) * 100 : 0);
  if (input.kind === "transfer") {
    if (!input.transferCount) return [];
    return [
      {
        key: "transfer",
        pending: false,
        icon: "⇄",
        name: "ยอดย้ายเงินรวม",
        amount: amountLabel(input.kindTotalSatang),
        bar: 100,
        meta: `${input.transferCount} รายการ`,
      },
    ];
  }
  if (input.mode === "tag") {
    // Untagged entries count in the base but get no bar of their own.
    return input.tags
      .filter((tag) => tag.tagId)
      .map((tag) => ({
        key: tag.tagId!,
        pending: false,
        icon: "#",
        name: tag.tagName,
        amount: amountLabel(tag.totalSatang),
        bar: barWidth(tag.percentage),
        meta: `${tag.transactionCount} รายการ`,
      }));
  }
  return input.categories.map((group) => {
    const percent = share(group.totalSatang);
    if (!group.categoryId) {
      return {
        key: "pending",
        pending: true,
        icon: "",
        name: "ยังไม่เลือกหมวด",
        amount: amountLabel(group.totalSatang),
        bar: barWidth(percent),
        meta: `${group.transactionCount} รายการ · แตะเพื่อเลือกหมวด`,
        pendingIds: group.pendingIds,
      };
    }
    return {
      key: group.categoryId,
      pending: false,
      icon: group.icon,
      name: group.categoryName,
      amount: amountLabel(group.totalSatang),
      bar: barWidth(percent),
      meta: `${group.transactionCount} รายการ · ${Math.round(percent)}%`,
    };
  });
}

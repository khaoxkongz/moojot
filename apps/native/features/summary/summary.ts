import type { CategoryBreakdownItem, PeriodSummary, TagBreakdownItem, TransactionKind } from "../../types/finance";
import { getPeriodBounds, getPeriodForDate, periodKeyParts, shiftPeriodKey } from "../../utils/dates";
import { formatBaht, kindLabel, longThaiMonth, shortThaiDate, shortThaiMonth } from "../../utils/format";

export type SummaryMode = "category" | "tag";

/** Baht with satang only when there are some, as the prototype writes amounts: "750.50", "240". */
export const amountLabel = (satang: number) => formatBaht(satang, satang % 100 === 0 ? 0 : 2);

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

/** The month `offset` steps before (negative) the one holding `today`. */
export function summaryMonth(today: string, offset: number, monthStartDay: number): SummaryMonth {
  const current = getPeriodForDate(today, monthStartDay).periodKey;
  const { periodKey, from, to } = getPeriodBounds(shiftPeriodKey(current, offset), monthStartDay);
  const { year, month } = periodKeyParts(periodKey);
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

/** A month's (or trend month's) total of each kind. */
export type KindTotals = Pick<PeriodSummary, "incomeSatang" | "expenseSatang" | "transferSatang">;

/** What Summary says and counts for each kind. */
const kinds: Record<TransactionKind, { question: string; verb: string; total: (totals: KindTotals) => number }> = {
  expense: { question: "ใช้ไปกับอะไรบ้าง", verb: "ใช้", total: (totals) => totals.expenseSatang },
  income: { question: "ได้มาจากไหนบ้าง", verb: "ได้รับ", total: (totals) => totals.incomeSatang },
  transfer: { question: "ย้ายเงินไปเท่าไหร่", verb: "ย้ายเงิน", total: (totals) => totals.transferSatang },
};

/** The total of one kind in a month's (or trend month's) totals. */
export const kindTotal = (totals: KindTotals, kind: TransactionKind) => kinds[kind].total(totals);

/** The question above the bars, under the kind tabs. */
export const summaryQuestion = (kind: TransactionKind) => kinds[kind].question;

/** What shows in place of the bars when there are none. */
export function summaryEmpty(kind: TransactionKind, kindTotalSatang: number) {
  if (kindTotalSatang === 0) {
    return {
      title: `ยังไม่มี${kindLabel(kind)}ในช่วงนี้`,
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
export function summaryTrend(months: Array<KindTotals & { periodKey: string }>, kind: TransactionKind) {
  const totals = months.map((month) => kindTotal(month, kind));
  const max = Math.max(1, ...totals);
  const bars: TrendBar[] = months.map((month, index) => {
    const total = totals[index]!;
    return {
      key: month.periodKey,
      label: shortThaiMonth(periodKeyParts(month.periodKey).month),
      // Whole baht.
      value: total ? formatBaht(total, 0) : "–",
      height: Math.max(4, Math.round((total / max) * 100)),
      current: index === months.length - 1,
    };
  });
  const current = totals.at(-1) ?? 0;
  const previous = totals.at(-2) ?? 0;
  const difference = current - previous;
  const { verb } = kinds[kind];
  const compare =
    previous === 0
      ? { icon: "information-outline" as const, text: `เดือนก่อนยังไม่มี${kindLabel(kind)}ให้เปรียบเทียบ` }
      : difference === 0
        ? { icon: "equal" as const, text: `${verb}เท่ากับเดือนก่อน` }
        : {
            icon: difference > 0 ? ("arrow-up" as const) : ("arrow-down" as const),
            text: `${verb}${difference > 0 ? "มากกว่า" : "น้อยกว่า"}เดือนก่อน ${amountLabel(Math.abs(difference))} ฿ (${Math.round((Math.abs(difference) / previous) * 100)}%)`,
          };
  return { title: `${kindLabel(kind)} 6 เดือนล่าสุด`, bars, compare };
}

type BudgetStatusLike = { spentSatang: number; budget: { limitSatang: number; warningThresholdPercent: number } };

/**
 * Under วางแผนงบ: the month's budgets by their own scope (never the wallet filter, so it says so while one is on).
 * Spending exactly the budget is not over it; spending more is.
 */
export function planRowSubtitle(statuses: BudgetStatusLike[], { walletFiltered = false } = {}) {
  if (!statuses.length) return "กำหนดว่าแต่ละเดือนจะใช้ได้เท่าไหร่";
  const over = statuses.filter((item) => item.spentSatang > item.budget.limitSatang).length;
  const near = statuses.filter(
    (item) =>
      item.spentSatang <= item.budget.limitSatang &&
      (item.spentSatang / item.budget.limitSatang) * 100 >= item.budget.warningThresholdPercent
  ).length;
  const state = over ? `เกินงบ ${over}` : near ? `ใกล้ครบ ${near}` : "ตามแผนทั้งหมด";
  return `ตั้งไว้ ${statuses.length} งบ · ${state}${walletFiltered ? " · นับทุกบัญชี" : ""}`;
}

/**
 * The bars under the kind tabs: by category or tag for income and expense, one total for transfers. Each group's share
 * is the server's `percentage` of the kind's (filtered) total.
 */
export function summaryRows(input: {
  kind: TransactionKind;
  mode: SummaryMode;
  kindTotalSatang: number;
  transferCount: number;
  categories: CategoryBreakdownItem[];
  tags: TagBreakdownItem[];
}): SummaryRow[] {
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
    if (!group.categoryId) {
      return {
        key: "pending",
        pending: true,
        icon: "",
        name: "ยังไม่เลือกหมวด",
        amount: amountLabel(group.totalSatang),
        bar: barWidth(group.percentage),
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
      bar: barWidth(group.percentage),
      meta: `${group.transactionCount} รายการ · ${Math.round(group.percentage)}%`,
    };
  });
}

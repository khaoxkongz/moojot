import type { IconName } from "../../components/ui/controls";
import type { Budget, BudgetStatus } from "../../types/finance";
import { buddhistYear, getPeriodBounds, periodKeyParts } from "../../utils/dates";
import { amountLabel, longThaiMonth, shortThaiDate } from "../../utils/format";

/** What a budget counts: every expense, one category, or one tag. */
export type BudgetTarget = "all" | "category" | "tag";

/** The prototype's warning chips. */
export const WARNING_OPTIONS = [50, 70, 80, 90] as const;

export type BudgetNames = {
  categories: ReadonlyArray<{ id: string; name: string; icon: string }>;
  tags: ReadonlyArray<{ id: string; name: string }>;
};

export type BudgetRow = {
  id: string;
  icon: string;
  name: string;
  tone: "over" | "near" | "ok";
  statusLabel: string;
  statusIcon: IconName;
  /** Bar width in percent: 0 with no spending, at least 2 with some, at most 100. */
  bar: number;
  spent: string;
  limit: string;
  leftLabel: string;
};

const tones = {
  over: { statusLabel: "เกินงบ", statusIcon: "alert-circle-outline" },
  near: { statusLabel: "ใกล้ครบงบ", statusIcon: "alert-outline" },
  ok: { statusLabel: "ตามแผน", statusIcon: "check-circle-outline" },
} as const satisfies Record<BudgetRow["tone"], { statusLabel: string; statusIcon: IconName }>;

export const budgetTarget = (budget: Pick<Budget, "categoryId" | "tagId">): BudgetTarget =>
  budget.categoryId ? "category" : budget.tagId ? "tag" : "all";

/** One budget as the plan shows it. Over only when spending is more than the limit; near at the warning percent. */
export function budgetRow(status: BudgetStatus, names: BudgetNames): BudgetRow {
  const { budget, spentSatang } = status;
  const over = spentSatang > budget.limitSatang;
  const percent = (spentSatang / budget.limitSatang) * 100;
  const tone = over ? "over" : percent >= budget.warningThresholdPercent ? "near" : "ok";
  const category = names.categories.find((item) => item.id === budget.categoryId);
  const tag = names.tags.find((item) => item.id === budget.tagId);
  const target = budgetTarget(budget);
  return {
    id: budget.id,
    icon: target === "all" ? "💰" : category ? category.icon : "#",
    name:
      target === "all"
        ? "งบรวมทุกหมวด"
        : target === "category"
          ? (category?.name ?? "หมวดที่ลบไปแล้ว")
          : (tag?.name ?? "แท็กที่ลบไปแล้ว"),
    tone,
    ...tones[tone],
    bar: Math.min(100, percent > 0 ? Math.max(2, percent) : 0),
    spent: amountLabel(spentSatang),
    limit: amountLabel(budget.limitSatang),
    leftLabel: over
      ? `เกิน ${amountLabel(spentSatang - budget.limitSatang)} ฿`
      : `เหลือ ${amountLabel(budget.limitSatang - spentSatang)} ฿`,
  };
}

/** The month's plan: the all-category budget for the accent card, the others as rows, and the rows' count line. */
export function planBudgets(statuses: readonly BudgetStatus[], names: BudgetNames) {
  const overallStatus = statuses.find((status) => budgetTarget(status.budget) === "all");
  const rows = statuses.filter((status) => status !== overallStatus).map((status) => budgetRow(status, names));
  const over = rows.filter((row) => row.tone === "over").length;
  const near = rows.filter((row) => row.tone === "near").length;
  return {
    overall: overallStatus ? budgetRow(overallStatus, names) : null,
    rows,
    countLabel: rows.length ? `${rows.length} งบ${over ? ` · เกิน ${over}` : near ? ` · ใกล้ครบ ${near}` : ""}` : "",
  };
}

/** Under the form's title: the month and its first and last day. */
export function budgetPeriodLine(periodKey: string, monthStartDay: number) {
  const { year, month } = periodKeyParts(periodKey);
  const { from, to } = getPeriodBounds(periodKey, monthStartDay);
  return `สำหรับเดือน${longThaiMonth(month)} ${buddhistYear(year)} · ${shortThaiDate(from)} – ${shortThaiDate(to)}`;
}

/** Under the warning chips: the amount in baht at which the warning comes. */
export function warningLine(limitSatang: number | null, percent: number) {
  return limitSatang
    ? `ใช้ไปถึง ${amountLabel(Math.round((limitSatang * percent) / 100))} ฿ หมูจะเตือนว่าใกล้ครบงบ`
    : `เช่น ตั้งงบ 1,000 ฿ หมูจะเตือนเมื่อใช้ไป ${amountLabel(percent * 1000)} ฿`;
}

type Draft = { id?: string | null; target: BudgetTarget; categoryId: string | null; tagId: string | null };

/** The budget saving this draft would replace: another budget of the month set for the same target. */
export function replacedBudget<B extends Pick<Budget, "id" | "categoryId" | "tagId">>(
  budgets: readonly B[],
  draft: Draft
) {
  const categoryId = draft.target === "category" ? draft.categoryId : null;
  const tagId = draft.target === "tag" ? draft.tagId : null;
  if (draft.target !== "all" && !categoryId && !tagId) return null;
  return (
    budgets.find((budget) => budget.id !== draft.id && budget.categoryId === categoryId && budget.tagId === tagId) ??
    null
  );
}

/** Under the amount: saving onto a target that has a budget replaces its limit, so the user does not add one twice. */
export function replaceNote(
  budgets: ReadonlyArray<Pick<Budget, "id" | "categoryId" | "tagId" | "limitSatang">>,
  draft: Draft
) {
  const replaced = replacedBudget(budgets, draft);
  return replaced ? `มีงบนี้อยู่แล้ว ${amountLabel(replaced.limitSatang)} ฿ บันทึกแล้วจะใช้วงเงินใหม่แทน` : null;
}

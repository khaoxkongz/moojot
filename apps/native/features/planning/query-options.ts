import { todayISO } from "@/utils/dates";
import { orpc } from "@/utils/orpc";

export const planningQueryOptions = {
  monthStartDay: () => orpc.financePreferences.getMonthStartDay.queryOptions(),
  currentPeriod: (asOf = todayISO()) => orpc.financePreferences.getCurrentPeriod.queryOptions({ input: { asOf } }),
  budgets: (periodKey?: string, asOf = todayISO()) =>
    orpc.planning.listBudgets.queryOptions({ input: { periodKey, asOf } }),
  budgetStatuses: (periodKey?: string, asOf = todayISO()) =>
    orpc.planning.getBudgetStatuses.queryOptions({ input: { periodKey, asOf } }),
  recurringRules: () => orpc.planning.listRecurringRules.queryOptions(),
};

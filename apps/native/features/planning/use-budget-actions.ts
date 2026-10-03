import { useMemo } from "react";

import { createBudgetActions, type BudgetActions } from "@/features/planning/budget-actions";
import { client, orpc, queryClient } from "@/utils/orpc";

/** Everything that reads budgets: the plan, the budget form and Summary's วางแผนงบ row. */
export function refreshBudgetReaders() {
  return queryClient.invalidateQueries({ queryKey: orpc.planning.key() });
}

/** Runs one action, then refreshes the budget readers before its success reports. */
const thenRefresh =
  <Args extends unknown[], R>(action: (...args: Args) => Promise<R>) =>
  async (...args: Args): Promise<R> => {
    const result = await action(...args);
    await refreshBudgetReaders();
    return result;
  };

/** The budget form's save, delete and restore; every success refreshes the budget readers before it reports. */
export function useBudgetActions(): BudgetActions {
  return useMemo(() => {
    const actions = createBudgetActions(client.planning);
    return {
      save: thenRefresh(actions.save),
      remove: thenRefresh(actions.remove),
      restore: thenRefresh(actions.restore),
    };
  }, []);
}

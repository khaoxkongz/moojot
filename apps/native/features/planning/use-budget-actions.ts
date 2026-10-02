import { useMemo } from "react";

import { createBudgetActions, type BudgetActions } from "@/features/planning/budget-actions";
import { client, orpc, queryClient } from "@/utils/orpc";

/** Everything that reads budgets: the plan, the budget form and Summary's วางแผนงบ row. */
export function refreshBudgetReaders() {
  return queryClient.invalidateQueries({ queryKey: orpc.planning.key() });
}

/** The budget form's save, delete and restore; every success refreshes the budget readers before it reports. */
export function useBudgetActions(): BudgetActions {
  return useMemo(() => {
    const actions = createBudgetActions(client.planning);
    return {
      save: async (input) => {
        const saved = await actions.save(input);
        await refreshBudgetReaders();
        return saved;
      },
      remove: async (id) => {
        const deletionId = await actions.remove(id);
        await refreshBudgetReaders();
        return deletionId;
      },
      restore: async (deletionId) => {
        await actions.restore(deletionId);
        await refreshBudgetReaders();
      },
    };
  }, []);
}

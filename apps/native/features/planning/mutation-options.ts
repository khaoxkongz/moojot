import { orpc, queryClient } from "@/utils/orpc";

export const planningMutationOptions = {
  setMonthStartDay: () =>
    orpc.financePreferences.setMonthStartDay.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.ledger.listTransactions.queryKey() }),
    }),
  createRecurringRule: () =>
    orpc.planning.createRecurringRule.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.ledger.listTransactions.queryKey() }),
    }),
  updateRecurringRule: () =>
    orpc.planning.updateRecurringRule.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.ledger.listTransactions.queryKey() }),
    }),
  deleteRecurringRule: () =>
    orpc.planning.deleteRecurringRule.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.ledger.listTransactions.queryKey() }),
    }),
  generateDueRecurringTransactions: () =>
    orpc.planning.generateDueRecurringTransactions.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.ledger.listTransactions.queryKey() }),
    }),
};

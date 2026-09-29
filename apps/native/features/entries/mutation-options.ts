import { orpc, queryClient } from "@/utils/orpc";

export const entriesMutationOptions = {
  create: () => orpc.ledger.createTransaction.mutationOptions(),
  update: () =>
    orpc.ledger.updateTransaction.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.ledger.listTransactions.queryKey() });
      },
    }),
  delete: () => orpc.ledger.deleteTransaction.mutationOptions(),
  restore: () => orpc.ledger.restoreTransaction.mutationOptions(),
  addRecentSearch: () =>
    orpc.financePreferences.addRecentSearch.mutationOptions({
      onSuccess: async (terms) => {
        await queryClient.cancelQueries({ queryKey: orpc.financePreferences.getRecentSearches.queryKey() });
        queryClient.setQueryData(orpc.financePreferences.getRecentSearches.queryKey(), terms);
      },
    }),
  removeRecentSearch: () =>
    orpc.financePreferences.removeRecentSearch.mutationOptions({
      onSuccess: async (terms) => {
        await queryClient.cancelQueries({ queryKey: orpc.financePreferences.getRecentSearches.queryKey() });
        queryClient.setQueryData(orpc.financePreferences.getRecentSearches.queryKey(), terms);
      },
    }),
  exportCsv: () => orpc.ledger.exportTransactionsCsv.mutationOptions(),
};

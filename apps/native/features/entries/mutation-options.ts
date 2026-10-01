import { orpc, queryClient } from "@/utils/orpc";

// Saving, deleting and restoring entries go through `useEntryActions`, which refreshes every reader.
export const entriesMutationOptions = {
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

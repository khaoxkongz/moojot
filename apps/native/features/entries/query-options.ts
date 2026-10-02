import { queryOptions } from "@tanstack/react-query";

import { loadAllEntries, needsCategory } from "@/features/home/home-days";
import type { TransactionFilters, TransactionInput } from "@/types/finance";
import { client, orpc } from "@/utils/orpc";

type AllFilters = Omit<TransactionFilters, "limit" | "offset">;

export const entriesQueryOptions = {
  detail: (id: string) => orpc.ledger.getTransaction.queryOptions({ input: { id } }),
  list: (filters: TransactionFilters = {}) => orpc.ledger.listTransactions.queryOptions({ input: filters }),
  /** Every matching entry, all pages. Keyed under the Ledger, so refreshing entry readers refreshes it too. */
  all: (filters: AllFilters) =>
    queryOptions({
      queryKey: [...orpc.ledger.listTransactions.queryKey({ input: filters }), "all-pages"] as const,
      queryFn: () => loadAllEntries((page) => client.ledger.listTransactions(page), filters),
    }),
  /** Every entry waiting for a category, newest first. */
  pendingCategories: () =>
    queryOptions({
      queryKey: ["finance", "entries", "pending-categories"],
      queryFn: async () =>
        (await loadAllEntries((page) => client.ledger.listTransactions(page), {})).filter(needsCategory),
    }),
  duplicates: (input: TransactionInput) => orpc.ledger.detectDuplicates.queryOptions({ input }),
  recentSearches: () => orpc.financePreferences.getRecentSearches.queryOptions(),
};

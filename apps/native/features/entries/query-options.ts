import { queryOptions } from "@tanstack/react-query";

import { listTransactions } from "@/features/entries/data";
import { loadPendingCategories } from "@/features/entries/pending-categories";
import type { TransactionFilters, TransactionInput } from "@/types/finance";
import { orpc } from "@/utils/orpc";

export const entriesQueryOptions = {
  detail: (id: string) => orpc.ledger.getTransaction.queryOptions({ input: { id } }),
  list: (filters: TransactionFilters = {}) => orpc.ledger.listTransactions.queryOptions({ input: filters }),
  pendingCategories: () =>
    queryOptions({
      queryKey: ["finance", "entries", "pending-categories"],
      queryFn: () => loadPendingCategories(listTransactions),
    }),
  duplicates: (input: TransactionInput) => orpc.ledger.detectDuplicates.queryOptions({ input }),
  recentSearches: () => orpc.financePreferences.getRecentSearches.queryOptions(),
};

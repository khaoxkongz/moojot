import { queryOptions } from "@tanstack/react-query";

import { loadPendingCategories } from "@/features/entries/pending-categories";
import type { TransactionFilters, TransactionInput } from "@/types/finance";
import { client, orpc } from "@/utils/orpc";

export const entriesQueryOptions = {
  detail: (id: string) => orpc.ledger.getTransaction.queryOptions({ input: { id } }),
  list: (filters: TransactionFilters = {}) => orpc.ledger.listTransactions.queryOptions({ input: filters }),
  pendingCategories: () =>
    queryOptions({
      queryKey: ["finance", "entries", "pending-categories"],
      // Only kinds and categories are needed, so no local slip images are attached.
      queryFn: () => loadPendingCategories((filters) => client.ledger.listTransactions(filters)),
    }),
  duplicates: (input: TransactionInput) => orpc.ledger.detectDuplicates.queryOptions({ input }),
  recentSearches: () => orpc.financePreferences.getRecentSearches.queryOptions(),
};

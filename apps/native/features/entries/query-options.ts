import { queryOptions } from "@tanstack/react-query";

import { loadAllEntries } from "@/features/entries/all-entries";
import { needsCategory } from "@/features/entries/category-queue";
import { searchFilters } from "@/features/search/search";
import type { TransactionFilters, TransactionInput, WalletCard } from "@/types/finance";
import { client, orpc } from "@/utils/orpc";

type AllFilters = Omit<TransactionFilters, "limit" | "offset">;

/** Every matching entry, all pages. Keyed under the Ledger, so refreshing entry readers refreshes it too. */
const allEntries = (filters: AllFilters) =>
  queryOptions({
    queryKey: [...orpc.ledger.listTransactions.queryKey({ input: filters }), "all-pages"] as const,
    queryFn: () => loadAllEntries((page) => client.ledger.listTransactions(page), filters),
  });

export const entriesQueryOptions = {
  detail: (id: string) => orpc.ledger.getTransaction.queryOptions({ input: { id } }),
  list: (filters: TransactionFilters = {}) => orpc.ledger.listTransactions.queryOptions({ input: filters }),
  all: allEntries,
  /**
   * Every entry the term finds in any month, all pages, so the count and total are never cut at one page. Each term has
   * its own key: a slower answer for an older term lands under that term and never replaces the latest one's results.
   */
  search: (term: string, card?: WalletCard | null) => allEntries(searchFilters(term, card)),
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

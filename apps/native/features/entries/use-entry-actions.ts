import { useMemo } from "react";

import { createEntryActions, type EntryActions } from "@/features/entries/entry-actions";
import { entriesQueryOptions } from "@/features/entries/query-options";
import { client, orpc, queryClient } from "@/utils/orpc";

/** Everything that reads entries: lists, details, totals, budgets' spending and the pending-category queue. */
export function refreshEntryReaders() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: orpc.ledger.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.analytics.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.planning.key() }),
    queryClient.invalidateQueries({ queryKey: entriesQueryOptions.pendingCategories().queryKey }),
  ]);
}

/** The editor's save, delete and restore; every success refreshes the screens that show entries. */
export function useEntryActions(): EntryActions {
  return useMemo(() => {
    const actions = createEntryActions(client.ledger);
    return {
      save: async (input) => {
        const saved = await actions.save(input);
        void refreshEntryReaders();
        return saved;
      },
      remove: async (id) => {
        await actions.remove(id);
        void refreshEntryReaders();
      },
      restore: async (id) => {
        await actions.restore(id);
        await refreshEntryReaders();
      },
    };
  }, []);
}

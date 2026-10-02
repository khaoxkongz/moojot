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

/** Runs an action, then refreshes every reader before reporting success, so the next screen already shows the change. */
function thenRefresh<Args extends unknown[], Result>(run: (...args: Args) => Promise<Result>) {
  return async (...args: Args) => {
    const result = await run(...args);
    await refreshEntryReaders();
    return result;
  };
}

/** The editor's save, delete and restore; every success refreshes the screens that show entries. */
export function useEntryActions(): EntryActions {
  return useMemo(() => {
    const actions = createEntryActions(client.ledger);
    return {
      save: thenRefresh(actions.save),
      remove: thenRefresh(actions.remove),
      restore: thenRefresh(actions.restore),
    };
  }, []);
}

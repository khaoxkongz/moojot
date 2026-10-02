import type { UseQueryResult } from "@tanstack/react-query";

type Query = Pick<UseQueryResult, "data" | "error" | "isFetching" | "isEnabled" | "refetch">;

/**
 * Where a screen that reads several queries stands: `ready` once every query has data, `pageError` when one has none
 * and failed (nothing to show), `refreshError` when data is on screen but a refresh failed (hidden while a retry is
 * on its way), and `retry` to fetch every enabled query again.
 */
export function queryState(queries: readonly Query[]) {
  const ready = queries.every((query) => query.data !== undefined);
  return {
    ready,
    pageError: !ready && queries.some((query) => query.data === undefined && Boolean(query.error)),
    refreshError: ready && queries.some((query) => Boolean(query.error) && !query.isFetching),
    retry: () => {
      for (const query of queries) if (query.isEnabled) void query.refetch();
    },
  };
}

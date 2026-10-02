import type { TransactionFilters } from "../../types/finance";

const PAGE = 1000;

/** Every entry matching the filters, read page by page, so a long period is never cut at the server's page size. */
export async function loadAllEntries<T>(
  list: (filters: TransactionFilters) => Promise<T[]>,
  filters: Omit<TransactionFilters, "limit" | "offset">
): Promise<T[]> {
  const rows: T[] = [];
  while (true) {
    const page = await list({ ...filters, limit: PAGE, offset: rows.length });
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

type PendingCandidate = { kind: string; categoryId: string | null };

export async function loadPendingCategories<T extends PendingCandidate>(
  list: (filters: { limit: number; offset: number }) => Promise<T[]>
): Promise<T[]> {
  const pending: T[] = [];
  const limit = 1000;
  let offset = 0;
  while (true) {
    const page = await list({ limit, offset });
    pending.push(...page.filter((item) => item.kind !== "transfer" && !item.categoryId));
    if (page.length < limit) return pending;
    offset += page.length;
  }
}

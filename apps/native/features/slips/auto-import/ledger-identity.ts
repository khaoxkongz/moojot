type ListSlipTransactions = (
  input: { source: "slip"; limit: number; offset: number },
  options: { signal?: AbortSignal }
) => Promise<readonly { id: string; dedupeKey: string | null }[]>;

const PAGE_SIZE = 1000;

/**
 * The exact identity the server saves an auto-imported slip under (see `import.service.ts`). The integration test
 * against the real route fails if the two drift apart.
 */
const slipIdentity = (assetId: string) => `slip:${assetId}`;

/**
 * Find active ledger transactions by the asset identity they were imported under, reading slip transactions page by
 * page until every asset is found. Deleted transactions are not listed, so they are never matched.
 */
export function createImportedTransactionLookup(listTransactions: ListSlipTransactions) {
  return async (assetIds: string[], signal?: AbortSignal): Promise<Map<string, string>> => {
    const wanted = new Map(assetIds.map((assetId) => [slipIdentity(assetId), assetId]));
    const found = new Map<string, string>();
    for (let offset = 0; found.size < wanted.size; offset += PAGE_SIZE) {
      const page = await listTransactions({ source: "slip", limit: PAGE_SIZE, offset }, { signal });
      for (const transaction of page) {
        const assetId = transaction.dedupeKey === null ? undefined : wanted.get(transaction.dedupeKey);
        if (assetId) found.set(assetId, transaction.id);
      }
      if (page.length < PAGE_SIZE) break;
    }
    return found;
  };
}

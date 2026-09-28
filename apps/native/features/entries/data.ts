import { setLocalSlipImage, withLocalSlipImage, withLocalSlipImages } from "@/lib/local-slip-assets";
import type { FinanceTransaction, TransactionFilters, TransactionInput, TransactionPatch } from "@/types/finance";
import { client } from "@/utils/orpc";

export async function getTransaction(id: string): Promise<FinanceTransaction | null> {
  const transaction = await client.ledger.getTransaction({ id });
  return transaction ? withLocalSlipImage("", transaction) : null;
}

export async function listTransactions(filters: TransactionFilters = {}): Promise<FinanceTransaction[]> {
  return withLocalSlipImages("", await client.ledger.listTransactions(filters));
}

export async function updateTransaction(id: string, patch: TransactionPatch): Promise<FinanceTransaction> {
  const updated = await client.ledger.updateTransaction({
    id,
    patch: patch.slipImageUri === undefined ? patch : { ...patch, slipImageUri: null },
  });
  if (updated.source !== "slip") await setLocalSlipImage("", id, null);
  else if (patch.slipImageUri !== undefined) {
    await setLocalSlipImage("", id, patch.slipImageUri);
  }
  return withLocalSlipImage("", updated);
}

export async function detectDuplicates(input: TransactionInput): Promise<FinanceTransaction[]> {
  return withLocalSlipImages("", await client.ledger.detectDuplicates({ ...input, slipImageUri: null }));
}

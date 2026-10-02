import type { FinanceTransaction, WalletCard } from "../../types/finance";
import { bankDisplayName } from "./banks";
import { walletCardLabel } from "./cards";

/**
 * The wallet-sheet row an entry belongs to, by the rule the Ledger and Analytics filters use: a card name makes it a
 * card; a bank alone (no card name, no last four) makes it that bank; anything else is รายการไม่ระบุบัญชี.
 */
export type EntryWallet = { type: "card"; card: WalletCard } | { type: "bank"; bank: string } | { type: "unspecified" };

type WalletFields = Pick<FinanceTransaction, "bank" | "cardName" | "cardLast4">;

export function entryWallet(entry: WalletFields): EntryWallet {
  const cardName = entry.cardName?.trim();
  const cardLast4 = entry.cardLast4?.trim() || null;
  const bank = entry.bank?.trim();
  if (cardName) return { type: "card", card: { cardName, cardLast4 } };
  if (bank && !cardLast4) return { type: "bank", bank };
  return { type: "unspecified" };
}

/** "กสิกรไทย", "บัตร KTC •• 4821" or "ไม่ระบุบัญชี". */
export function entryWalletLabel(entry: WalletFields) {
  const wallet = entryWallet(entry);
  if (wallet.type === "card") return walletCardLabel(wallet.card);
  if (wallet.type === "bank") return bankDisplayName(wallet.bank);
  return "ไม่ระบุบัญชี";
}

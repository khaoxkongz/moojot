import type { WalletCard } from "../../types/finance";

/** One card's identity: its name and last four digits, so two cards with the same name stay apart. */
export function walletCardKey(card: WalletCard) {
  return JSON.stringify([card.cardName.trim(), card.cardLast4?.trim() || null]);
}

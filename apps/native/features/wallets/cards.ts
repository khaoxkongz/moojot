import type { WalletCard } from "../../types/finance";

/** One card's identity: its name and last four digits, so two cards with the same name stay apart. */
export function walletCardKey(card: WalletCard) {
  return JSON.stringify([card.cardName.trim(), card.cardLast4?.trim() || null]);
}

/** "บัตร KTC •• 4821", or "บัตร KTC" when the last four are unknown. */
export function walletCardLabel(card: WalletCard) {
  const last4 = card.cardLast4?.trim();
  return last4 ? `บัตร ${card.cardName.trim()} •• ${last4}` : `บัตร ${card.cardName.trim()}`;
}

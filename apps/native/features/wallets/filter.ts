import type { WalletFilterOptions, WalletFilterSelection } from "@/types/finance";

export const emptyWalletOptions: WalletFilterOptions = {
  banks: [],
  cards: [],
  canIdentifyDeletedCards: false,
};

export function selectAllWalletSources(options: WalletFilterOptions): WalletFilterSelection {
  return {
    banks: [...options.banks],
    cards: options.cards.map((card) => ({ ...card })),
    includeOther: true,
    includeDeletedCards: true,
  };
}

export function isAllWalletSources(value: WalletFilterSelection, options: WalletFilterOptions) {
  const cardKey = (name: string, last4: string | null) => JSON.stringify([name, last4]);
  const selectedCards = new Set(value.cards.map((card) => cardKey(card.cardName, card.cardLast4)));
  return (
    value.includeOther &&
    value.includeDeletedCards &&
    options.banks.every((bank) => value.banks.includes(bank)) &&
    options.cards.every((card) => selectedCards.has(cardKey(card.cardName, card.cardLast4)))
  );
}

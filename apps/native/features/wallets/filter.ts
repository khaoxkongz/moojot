import type { WalletCard, WalletFilterOptions, WalletFilterSelection } from "../../types/finance";
import { bankFilterGroups } from "./banks";
import { walletCardKey, walletCardLabel } from "./cards";

export const emptyWalletOptions: WalletFilterOptions = {
  banks: [],
  cards: [],
  canIdentifyDeletedCards: false,
};

export function selectAllWalletSources(options: WalletFilterOptions): WalletFilterSelection {
  return {
    banks: [...options.banks],
    cards: options.cards.map((card) => ({ ...card })),
    includeUnspecified: true,
  };
}

export function isAllWalletSources(value: WalletFilterSelection, options: WalletFilterOptions) {
  const selectedCards = new Set(value.cards.map(walletCardKey));
  return (
    value.includeUnspecified &&
    options.banks.every((bank) => value.banks.includes(bank)) &&
    options.cards.every((card) => selectedCards.has(walletCardKey(card)))
  );
}

/** Nothing chosen: the sheet says “เลือกอย่างน้อย 1 รายการ” and cannot be applied. */
export const hasNoWalletSource = (value: WalletFilterSelection) =>
  !value.includeUnspecified && value.banks.length === 0 && value.cards.length === 0;

/** “เลือกทั้งหมด”: clears everything when all is chosen, otherwise chooses all. */
export function toggleAllWalletSources(value: WalletFilterSelection, options: WalletFilterOptions) {
  return isAllWalletSources(value, options)
    ? { banks: [], cards: [], includeUnspecified: false }
    : selectAllWalletSources(options);
}

export type WalletFilterRow =
  | { key: string; type: "bank"; label: string; bankId: string; banks: string[]; selected: boolean }
  | { key: string; type: "card"; label: string; card: WalletCard; selected: boolean }
  | { key: "other"; type: "other"; label: string; selected: boolean };

export type WalletFilterSection = { title: string; icon: "bank" | "card" | "other"; rows: WalletFilterRow[] };

/**
 * The sheet's rows from the user's own entries: one row per bank (every stored spelling together), one per card by
 * name and last four, then entries with no bank or card. Groups the user has nothing in are left out.
 */
export function walletFilterSections(
  options: WalletFilterOptions,
  value: WalletFilterSelection
): WalletFilterSection[] {
  const selectedCards = new Set(value.cards.map(walletCardKey));
  const banks: WalletFilterRow[] = bankFilterGroups(options.banks).map((group) => ({
    key: `bank:${group.id}`,
    type: "bank",
    label: group.label,
    bankId: group.id,
    banks: group.banks,
    selected: group.banks.every((bank) => value.banks.includes(bank)),
  }));
  const cards: WalletFilterRow[] = options.cards.map((card) => ({
    key: `card:${walletCardKey(card)}`,
    type: "card",
    label: walletCardLabel(card),
    card,
    selected: selectedCards.has(walletCardKey(card)),
  }));
  const sections: WalletFilterSection[] = [
    { title: "บัญชีธนาคาร", icon: "bank", rows: banks },
    { title: "บัตร", icon: "card", rows: cards },
    {
      title: "อื่น ๆ",
      icon: "other",
      rows: [{ key: "other", type: "other", label: "รายการที่ไม่ระบุบัญชี", selected: value.includeUnspecified }],
    },
  ];
  return sections.filter((section) => section.rows.length > 0);
}

export function toggleWalletRow(value: WalletFilterSelection, row: WalletFilterRow): WalletFilterSelection {
  if (row.type === "bank")
    return {
      ...value,
      banks: row.selected
        ? value.banks.filter((bank) => !row.banks.includes(bank))
        : [...new Set([...value.banks, ...row.banks])],
    };
  if (row.type === "card")
    return {
      ...value,
      cards: row.selected
        ? value.cards.filter((card) => walletCardKey(card) !== walletCardKey(row.card))
        : [...value.cards, { ...row.card }],
    };
  return { ...value, includeUnspecified: !value.includeUnspecified };
}

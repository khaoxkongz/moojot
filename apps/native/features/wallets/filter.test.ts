import { describe, expect, it } from "vite-plus/test";

import type { WalletFilterOptions } from "../../types/finance";
import {
  hasNoWalletSource,
  isAllWalletSources,
  selectAllWalletSources,
  toggleAllWalletSources,
  toggleWalletRow,
  walletFilterSections,
} from "./filter";

const options: WalletFilterOptions = {
  banks: ["KBank", "SCB", "กสิกรไทย"],
  cards: [
    { cardName: "KTC", cardLast4: "1234" },
    { cardName: "KTC", cardLast4: "4821" },
  ],
  canIdentifyDeletedCards: false,
};

const labels = (value = selectAllWalletSources(options)) =>
  walletFilterSections(options, value).map((section) => ({
    title: section.title,
    rows: section.rows.map((row) => `${row.label}${row.selected ? " ✓" : ""}`),
  }));

describe("wallet filter sheet", () => {
  it("lists banks once each by name, cards by name and last four, then unspecified", () => {
    expect(labels()).toEqual([
      { title: "บัญชีธนาคาร", rows: ["กสิกรไทย ✓", "ไทยพาณิชย์ ✓"] },
      { title: "บัตร", rows: ["บัตร KTC •• 1234 ✓", "บัตร KTC •• 4821 ✓"] },
      { title: "อื่น ๆ", rows: ["รายการที่ไม่ระบุบัญชี ✓"] },
    ]);
  });

  it("shows only the user's own banks and cards, and leaves out empty groups", () => {
    const empty = { banks: [], cards: [], canIdentifyDeletedCards: false };
    expect(walletFilterSections(empty, selectAllWalletSources(empty)).map((s) => s.title)).toEqual(["อื่น ๆ"]);
  });

  it("selects or clears every spelling of a bank together", () => {
    const all = selectAllWalletSources(options);
    const [banks] = walletFilterSections(options, all);
    const withoutKBank = toggleWalletRow(all, banks!.rows[0]!);
    expect(withoutKBank.banks).toEqual(["SCB"]);
    const [again] = walletFilterSections(options, withoutKBank);
    expect(toggleWalletRow(withoutKBank, again!.rows[0]!).banks.sort()).toEqual(["KBank", "SCB", "กสิกรไทย"].sort());
  });

  it("keeps two cards of one issuer apart", () => {
    const all = selectAllWalletSources(options);
    const [, cards] = walletFilterSections(options, all);
    const next = toggleWalletRow(all, cards!.rows[1]!);
    expect(next.cards).toEqual([{ cardName: "KTC", cardLast4: "1234" }]);
    expect(labels(next)[1]!.rows).toEqual(["บัตร KTC •• 1234 ✓", "บัตร KTC •• 4821"]);
  });

  it("selects all, clears all, and cannot apply with nothing chosen", () => {
    const all = selectAllWalletSources(options);
    expect(isAllWalletSources(all, options)).toBe(true);
    const none = toggleAllWalletSources(all, options);
    expect(hasNoWalletSource(none)).toBe(true);
    expect(isAllWalletSources(toggleAllWalletSources(none, options), options)).toBe(true);
    // Partly chosen: select all chooses everything.
    const [, , other] = walletFilterSections(options, all);
    const some = toggleWalletRow(all, other!.rows[0]!);
    expect(some.includeOther).toBe(false);
    expect(isAllWalletSources(toggleAllWalletSources(some, options), options)).toBe(true);
  });
});

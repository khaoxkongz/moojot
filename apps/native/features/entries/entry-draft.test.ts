import { describe, expect, it } from "vite-plus/test";

import {
  blankEntryDraft,
  changeEntryKind,
  entryDraftError,
  entryInputFromDraft,
  entrySourceChoices,
  entryTitlePlaceholder,
  hasEntryChanges,
  selectEntrySource,
  selectedEntrySource,
  type EntryDraft,
} from "./entry-draft";

const today = "2026-09-30";
const draft = (patch: Partial<EntryDraft> = {}): EntryDraft => ({ ...blankEntryDraft(today), ...patch });

describe("switching the entry type", () => {
  it("clears a category of the old type but keeps tags", () => {
    const next = changeEntryKind(draft({ categoryId: "expense-food", tagIds: ["tag-cash"] }), "income");
    expect(next.kind).toBe("income");
    expect(next.categoryId).toBeNull();
    expect(next.tagIds).toEqual(["tag-cash"]);
  });

  it("drops category and tags for a transfer, which never counts as income or expense", () => {
    const next = changeEntryKind(draft({ categoryId: "expense-food", tagIds: ["tag-cash"] }), "transfer");
    expect(next.categoryId).toBeNull();
    expect(next.tagIds).toEqual([]);
  });

  it("keeps everything when the same type is chosen again", () => {
    const before = draft({ categoryId: "expense-food" });
    expect(changeEntryKind(before, "expense")).toEqual(before);
  });
});

describe("saving a manual entry", () => {
  it("saves the amount in satang on the chosen day", () => {
    const input = entryInputFromDraft(draft({ amount: "1,250.5", occurredOn: "2026-09-12" }), { today });
    expect(input.amountSatang).toBe(125050);
    expect(input.occurredOn).toBe("2026-09-12");
  });

  it("uses the title, then the note, then the category, then the type as the name", () => {
    expect(entryInputFromDraft(draft({ amount: "5", title: " ข้าวมันไก่ ", note: "เที่ยง" }), { today }).title).toBe(
      "ข้าวมันไก่"
    );
    expect(entryInputFromDraft(draft({ amount: "5", note: "เที่ยง" }), { today, categoryName: "อาหาร" }).title).toBe(
      "เที่ยง"
    );
    expect(entryInputFromDraft(draft({ amount: "5" }), { today, categoryName: "อาหาร" }).title).toBe("อาหาร");
    expect(entryInputFromDraft(draft({ amount: "5", kind: "income" }), { today }).title).toBe("รายรับ");
  });

  it("tells the user which name Home will show when the title is left empty", () => {
    expect(entryTitlePlaceholder(draft(), "อาหาร")).toBe("ถ้าไม่ใส่ จะใช้ “อาหาร”");
    expect(entryTitlePlaceholder(draft({ note: "ค่าน้ำ" }), "อาหาร")).toBe("ถ้าไม่ใส่ จะใช้ “ค่าน้ำ”");
    expect(entryTitlePlaceholder(draft({ kind: "transfer" }))).toBe("ถ้าไม่ใส่ จะใช้ “ย้ายเงิน”");
  });

  it("never saves a category or tags on a transfer", () => {
    const input = entryInputFromDraft(draft({ amount: "5", kind: "transfer", categoryId: "x", tagIds: ["t"] }), {
      today,
    });
    expect(input.categoryId).toBeNull();
    expect(input.tagIds).toEqual([]);
  });

  it("asks for an amount above zero", () => {
    expect(entryDraftError(draft({ amount: "" }), today)).toBe("กรุณาใส่จำนวนเงินที่มากกว่า 0 บาท");
    expect(entryDraftError(draft({ amount: "0" }), today)).toBe("กรุณาใส่จำนวนเงินที่มากกว่า 0 บาท");
    expect(entryDraftError(draft({ amount: "12" }), today)).toBeUndefined();
  });

  it("refuses a day in the future", () => {
    expect(entryDraftError(draft({ amount: "12", occurredOn: "2026-10-01" }), today)).toBe("เลือกวันที่ในอนาคตไม่ได้");
    expect(() => entryInputFromDraft(draft({ amount: "12", occurredOn: "2026-10-01" }), { today })).toThrow();
  });

  it("notices any change to the draft", () => {
    const initial = draft();
    expect(hasEntryChanges(initial, { ...initial })).toBe(false);
    expect(hasEntryChanges({ ...initial, note: "x" }, initial)).toBe(true);
  });
});

describe("choosing the bank or card", () => {
  const cards = [
    { cardName: "KTC", cardLast4: "4821" },
    { cardName: "KTC", cardLast4: "1234" },
  ];

  it("offers common banks, the user's own banks and cards, and no source", () => {
    const labels = entrySourceChoices({ banks: ["ออมสิน"], cards }, draft()).map((choice) => choice.label);
    expect(labels).toContain("กสิกรไทย");
    expect(labels).toContain("ออมสิน");
    expect(labels).toContain("KTC •• 4821");
    expect(labels).toContain("KTC •• 1234");
    expect(labels.at(-1)).toBe("ไม่ระบุ");
  });

  it("lists a bank written another way only once", () => {
    const labels = entrySourceChoices({ banks: ["KBank", "กสิกรไทย"], cards: [] }, draft()).map((c) => c.label);
    expect(labels.filter((label) => label === "กสิกรไทย")).toHaveLength(1);
  });

  it("saves a bank under its Thai name and without a card", () => {
    const bank = entrySourceChoices({ banks: [], cards }, draft()).find((choice) => choice.label === "ไทยพาณิชย์")!;
    const input = entryInputFromDraft(selectEntrySource(draft({ amount: "5" }), bank), { today });
    expect(input).toMatchObject({ bank: "ไทยพาณิชย์", cardName: null, cardLast4: null });
  });

  it("keeps two cards with the same name apart by their last four digits", () => {
    const choices = entrySourceChoices({ banks: [], cards }, draft());
    const second = choices.find((choice) => choice.label === "KTC •• 1234")!;
    const chosen = selectEntrySource(draft({ amount: "5", bank: "กรุงไทย" }), second);
    expect(entryInputFromDraft(chosen, { today })).toMatchObject({ bank: null, cardName: "KTC", cardLast4: "1234" });
    expect(selectedEntrySource(choices, chosen)?.label).toBe("KTC •• 1234");
  });

  it("clears the bank and card for no source", () => {
    const none = entrySourceChoices({ banks: [], cards }, draft()).at(-1)!;
    const input = entryInputFromDraft(
      selectEntrySource(draft({ amount: "5", cardName: "KTC", cardLast4: "4821" }), none),
      {
        today,
      }
    );
    expect(input).toMatchObject({ bank: null, cardName: null, cardLast4: null });
  });

  it("shows the saved source of an entry being edited even when it is no longer listed", () => {
    const editing = draft({ cardName: "UOB", cardLast4: "7777" });
    const choices = entrySourceChoices({ banks: [], cards }, editing);
    expect(selectedEntrySource(choices, editing)?.label).toBe("UOB •• 7777");
    const kbank = draft({ bank: "KBank" });
    expect(selectedEntrySource(entrySourceChoices({ banks: [], cards: [] }, kbank), kbank)?.label).toBe("กสิกรไทย");
  });
});

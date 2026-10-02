import { describe, expect, it } from "vite-plus/test";

import { queueEmptiedMessage, queueEntryMeta } from "./category-queue";

const today = "2026-09-30";

describe("queue card", () => {
  it("says where the money went, how it was recorded and on which day", () => {
    expect(
      queueEntryMeta({ bank: "KBank", cardName: null, cardLast4: null, source: "slip", occurredOn: today }, today)
    ).toBe("กสิกรไทย · สลิป · วันนี้");
    expect(
      queueEntryMeta(
        { bank: null, cardName: "KTC", cardLast4: "4821", source: "manual", occurredOn: "2026-09-29" },
        today
      )
    ).toBe("บัตร KTC •• 4821 · จดเอง · 29 ก.ย.");
    expect(
      queueEntryMeta({ bank: null, cardName: null, cardLast4: null, source: "recurring", occurredOn: today }, today)
    ).toBe("ไม่ระบุบัญชี · จดซ้ำ · วันนี้");
  });

  it("names the same wallet the filter puts the entry in: a last four without a card name is ไม่ระบุ", () => {
    expect(
      queueEntryMeta({ bank: "KBank", cardName: null, cardLast4: "4821", source: "slip", occurredOn: today }, today)
    ).toBe("ไม่ระบุบัญชี · สลิป · วันนี้");
  });
});

describe("queue end", () => {
  it("says it is done when the rest of the queue was categorized elsewhere, as after a last pick", () => {
    const opened = { ids: ["a", "b"], index: 1 };
    expect(queueEmptiedMessage(opened, 0)).toBe("เลือกหมวดครบแล้ว");
    expect(queueEmptiedMessage(opened, 3)).toBe("บันทึกหมวดแล้ว");
    // Opened with nothing waiting.
    expect(queueEmptiedMessage(null, 0)).toBe("ไม่มีรายการรอเลือกหมวด");
  });
});

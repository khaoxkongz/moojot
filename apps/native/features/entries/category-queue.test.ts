import { describe, expect, it } from "vite-plus/test";

import { queueEntryMeta } from "./category-queue";

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
});

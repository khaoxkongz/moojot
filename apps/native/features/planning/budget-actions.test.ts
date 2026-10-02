import { ORPCError } from "@orpc/client";
import { describe, expect, it } from "vite-plus/test";

import { createBudgetActions } from "./budget-actions";

// The server answers CONFLICT when another request changed the same budget at that moment (the API test cannot make
// that race happen on demand), so the planning client here is a stand-in that always answers with that error.
const conflicting = () => {
  const reject = () => Promise.reject(new ORPCError("CONFLICT", { message: "The record changed" }));
  return createBudgetActions({ upsertBudget: reject, deleteBudget: reject, restoreBudget: reject });
};

describe("Budget action errors", () => {
  it("says a save or delete clashed with another change, not that the user's input is wrong", async () => {
    const actions = conflicting();
    await expect(actions.remove("budget-1")).rejects.toThrow("ลบงบไม่สำเร็จ งบนี้เพิ่งถูกเปลี่ยนจากอีกที่ ลองอีกครั้ง");
    await expect(actions.save({ periodKey: "2026-10", limitSatang: 100 })).rejects.toThrow(
      "บันทึกงบไม่สำเร็จ งบนี้เพิ่งถูกเปลี่ยนจากอีกที่ ลองอีกครั้ง"
    );
  });
});

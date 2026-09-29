import { describe, expect, it } from "vite-plus/test";

import { photoAccessPrompt } from "./photo-access";

describe("photo access prompt", () => {
  it("asks in the app while the system can still show its prompt, and sends everything else to Settings", () => {
    expect(photoAccessPrompt("permission-required")?.action).toBe("request");
    expect(photoAccessPrompt("denied")?.action).toBe("settings");
    expect(photoAccessPrompt("limited")?.action).toBe("settings");
  });

  it("explains that reading is paused while manual entry still works", () => {
    for (const access of ["permission-required", "denied", "limited"] as const) {
      expect(photoAccessPrompt(access)?.message).toMatch(/อ่านสลิปอัตโนมัติ.*จดเพิ่ม/);
    }
  });

  it("asks nothing when reading is allowed, not yet known, or not possible on this platform", () => {
    expect(photoAccessPrompt("all")).toBeNull();
    expect(photoAccessPrompt(null)).toBeNull();
    expect(photoAccessPrompt("unsupported")).toBeNull();
  });
});

import { describe, expect, it } from "vite-plus/test";

import { toSatang, typedAmount } from "./format";

describe("Typed amount", () => {
  it("groups the baht as the user types and keeps at most two satang digits", () => {
    expect(typedAmount("5000")).toBe("5,000");
    expect(typedAmount("1234567.891")).toBe("1,234,567.89");
    expect(typedAmount("12.")).toBe("12.");
    expect(typedAmount(".5")).toBe("0.5");
    expect(typedAmount("1.2.3")).toBe("1.23");
    expect(typedAmount("007")).toBe("7");
    expect(typedAmount("฿ 3,0a0")).toBe("300");
    expect(typedAmount("")).toBe("");
  });

  it("stops at nine baht digits, the largest limit a budget takes", () => {
    expect(typedAmount("12345678901")).toBe("123,456,789");
    expect(toSatang(typedAmount("12345678901"))).toBe(12_345_678_900);
  });
});

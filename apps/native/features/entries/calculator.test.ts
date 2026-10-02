import { describe, expect, it } from "vite-plus/test";

import {
  CLIPBOARD_HAS_NO_AMOUNT,
  calculatorKeyForHardware,
  finishCalculator,
  groupAmountDigits,
  openCalculator,
  pasteIntoCalculator,
  pressCalculator,
  type CalculatorKey,
  type CalculatorState,
} from "./calculator";

function press(keys: CalculatorKey[], start: CalculatorState = openCalculator("")) {
  let state = start;
  let amount: string | undefined;
  for (const key of keys) {
    const step = pressCalculator(state, key);
    state = step.state;
    if (step.amount !== undefined) amount = step.amount;
  }
  return { state, amount };
}

describe("amount keypad", () => {
  it("adds two amounts and shows the calculation that was done", () => {
    const { state, amount } = press(["1", "2", "0", "+", "4", "5", "="]);
    expect(amount).toBe("165");
    expect(state.display).toBe("165");
    expect(state.history).toBe("120+45=");
  });

  it("keeps the amount before an operator until the calculation is finished", () => {
    const { state, amount } = press(["5", "0", "×", "3"]);
    expect(amount).toBe("50");
    expect(state.expression).toBe("50×3");
    expect(finishCalculator(state).amount).toBe("150");
  });

  it("chains operators left to right", () => {
    expect(finishCalculator(press(["1", "0", "0", "−", "2", "0", "÷", "4"]).state).amount).toBe("20");
  });

  it("takes a percent of the number on screen", () => {
    expect(press(["2", "5", "0", "%"]).amount).toBe("2.5");
  });

  it("accepts at most two decimals and one decimal point", () => {
    expect(press(["1", ".", "2", "3", "4", "."]).amount).toBe("1.23");
    expect(press([".", "5"]).amount).toBe("0.5");
  });

  it("accepts at most 12 characters", () => {
    expect(press(Array<CalculatorKey>(15).fill("9")).amount).toBe("999999999999");
  });

  it("clears everything with AC and removes the last digit with delete", () => {
    expect(press(["1", "2", "+", "3", "AC"]).state.display).toBe("0");
    expect(press(["1", "2", "AC"]).amount).toBe("0");
    expect(press(["1", "2", "3", "⌫"]).amount).toBe("12");
  });

  it("drops a pending operator when delete is pressed right after it", () => {
    const { state } = press(["1", "2", "+", "⌫"]);
    expect(state.expression).toBe("12");
    expect(finishCalculator(state).amount).toBe("12");
  });

  it("shows an error for a result it cannot use and keeps the keypad open", () => {
    const divided = press(["5", "÷", "0", "="]);
    expect(divided.state.error).toBe("ไม่สามารถคำนวณจำนวนนี้ได้");
    expect(finishCalculator(press(["5", "÷", "0"]).state).amount).toBeNull();
    expect(press(["5", "−", "9", "="]).state.error).toBe("ไม่สามารถคำนวณจำนวนนี้ได้");
  });

  it("starts from the amount already in the entry", () => {
    expect(openCalculator("1,250.5").display).toBe("1250.5");
    expect(press(["+", "1", "0"], openCalculator("1,250.5")).state.expression).toBe("1250.5+10");
  });

  it("finishes to the amount without trailing zeros", () => {
    expect(finishCalculator(press(["1", "2", ".", "5", "0"]).state).amount).toBe("12.5");
  });
});

describe("hardware keys", () => {
  const idle = openCalculator("12");
  const pending = press(["+", "3"], idle).state;

  it("maps digits, operators and editing keys to the keypad", () => {
    expect(
      ["7", "+", "-", "*", "x", "/", "%", ",", ".", "Backspace", "Delete"].map((key) =>
        calculatorKeyForHardware(key, idle)
      )
    ).toEqual(["7", "+", "−", "×", "×", "÷", "%", ".", ".", "⌫", "AC"]);
  });

  it("uses Enter to calculate while an operation is pending and to finish otherwise", () => {
    expect(calculatorKeyForHardware("Enter", pending)).toBe("=");
    expect(calculatorKeyForHardware("Enter", idle)).toBe("done");
    expect(calculatorKeyForHardware("=", idle)).toBe("done");
  });

  it("ignores other keys", () => {
    expect(calculatorKeyForHardware("a", idle)).toBeNull();
    expect(calculatorKeyForHardware("Tab", idle)).toBeNull();
  });
});

describe("showing the amount", () => {
  it("groups thousands in every number of the calculation", () => {
    expect(groupAmountDigits("1250.5+1000")).toBe("1,250.5+1,000");
    expect(groupAmountDigits("1000.")).toBe("1,000.");
    expect(groupAmountDigits("0")).toBe("0");
  });
});

describe("pasting an amount", () => {
  it("puts the pasted amount on screen as the entry amount", () => {
    const { state, amount } = pasteIntoCalculator(openCalculator("12"), "450");
    expect(amount).toBe("450");
    expect(state.expression).toBe("450");
  });

  it("uses a pasted amount as the right side of a pending calculation", () => {
    const { state, amount } = pasteIntoCalculator(press(["+"], openCalculator("12")).state, "45");
    expect(amount).toBeUndefined();
    expect(state.expression).toBe("12+45");
    expect(finishCalculator(state).amount).toBe("57");
  });

  it("reads the first amount in the copied text", () => {
    const { state, amount } = pasteIntoCalculator(openCalculator("12"), "โอนเงิน ฿1,250.50 สำเร็จ");
    expect(amount).toBe("1250.50");
    expect(state.expression).toBe("1250.50");
    expect(pasteIntoCalculator(openCalculator(""), "45").amount).toBe("45");
  });

  it("refuses text without an amount and keeps what was on screen", () => {
    for (const text of ["สวัสดี", "", "0", "1234567890123"]) {
      const { state, amount } = pasteIntoCalculator(openCalculator("12"), text);
      expect(amount).toBeUndefined();
      expect(state.expression).toBe("12");
      expect(state.error).toBe(CLIPBOARD_HAS_NO_AMOUNT);
    }
  });
});

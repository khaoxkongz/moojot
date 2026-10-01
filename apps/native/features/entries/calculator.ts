/**
 * The entry amount keypad: a small calculator with AC, %, + − × ÷, a decimal point and delete. Amounts keep at most
 * two decimals and 12 characters. Ported from the design prototype so the keypad behaves the same in the app.
 */

export type CalculatorOperator = "+" | "−" | "×" | "÷";
export type CalculatorKey =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "."
  | "AC"
  | "⌫"
  | "%"
  | "="
  | CalculatorOperator;

export type CalculatorState = {
  display: string;
  left: number | null;
  leftText: string | null;
  operator: CalculatorOperator | null;
  replaceNext: boolean;
  /** The finished calculation, like “120+45=”, shown above the amount. */
  history: string | null;
  /** What the amount card shows while typing, like “120+45”. */
  expression: string;
  error: string;
};

export const CALCULATOR_ERROR = "ไม่สามารถคำนวณจำนวนนี้ได้";
const MAX_CHARACTERS = 12;

function normalizeAmount(value: string): string {
  const numeric = value.replace(/[,\s฿]/g, "");
  return /^\d+(?:\.\d{0,2})?$/.test(numeric) ? numeric : "0";
}

function formatResult(value: number): string | null {
  if (!Number.isFinite(value) || value < 0 || value > 999999999) return null;
  return (Math.round(value * 100) / 100)
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1");
}

function calculate(left: number, right: number, operator: CalculatorOperator): string | null {
  const result =
    operator === "+"
      ? left + right
      : operator === "−"
        ? left - right
        : operator === "×"
          ? left * right
          : right === 0
            ? Number.NaN
            : left / right;
  return formatResult(result);
}

function withExpression(state: Omit<CalculatorState, "expression">): CalculatorState {
  const expression =
    state.operator && state.leftText !== null
      ? state.leftText + state.operator + (state.replaceNext ? "" : state.display)
      : state.display;
  return { ...state, expression };
}

export function openCalculator(amount: string): CalculatorState {
  return withExpression({
    display: normalizeAmount(amount),
    left: null,
    leftText: null,
    operator: null,
    replaceNext: false,
    history: null,
    error: "",
  });
}

/**
 * One key press. `amount` is the entry amount to keep after the press; it stays undefined while the number on screen
 * is only the right side of a pending calculation.
 */
export function pressCalculator(
  current: CalculatorState,
  key: CalculatorKey
): { state: CalculatorState; amount?: string } {
  const c = { ...current, error: "" };
  let amount: string | undefined;
  if (/^\d$/.test(key) || key === ".") {
    const d = c.display;
    const next =
      c.replaceNext || d === "0"
        ? key === "."
          ? "0."
          : key
        : key === "." && d.includes(".")
          ? d
          : d.includes(".") && d.split(".")[1]!.length >= 2
            ? d
            : d.length >= MAX_CHARACTERS
              ? d
              : d + key;
    Object.assign(c, { display: next, replaceNext: false, history: null });
    if (!c.operator) amount = next;
  } else if (key === "AC") {
    return { state: openCalculator("0"), amount: "0" };
  } else if (key === "⌫") {
    if (c.operator && c.replaceNext) {
      Object.assign(c, { left: null, leftText: null, operator: null, replaceNext: false });
      amount = c.display;
    } else {
      Object.assign(c, {
        display: c.display.length > 1 ? c.display.slice(0, -1) : "0",
        replaceNext: false,
        history: null,
      });
      if (!c.operator) amount = c.display;
    }
  } else if (key === "%") {
    const result = formatResult(Number(c.display) / 100);
    if (result === null) c.error = CALCULATOR_ERROR;
    else if (c.operator && c.replaceNext) {
      Object.assign(c, { display: result, left: Number(result), leftText: null, operator: null, replaceNext: false });
      amount = result;
    } else {
      Object.assign(c, { display: result, replaceNext: false });
      if (!c.operator) amount = result;
    }
  } else if (key === "=") {
    if (c.operator && c.left !== null && !c.replaceNext) {
      const result = calculate(c.left, Number(c.display), c.operator);
      if (result === null) c.error = CALCULATOR_ERROR;
      else {
        Object.assign(c, {
          history: (c.leftText ?? String(c.left)) + c.operator + c.display + "=",
          display: result,
          left: null,
          leftText: null,
          operator: null,
          replaceNext: true,
        });
        amount = result;
      }
    }
  } else {
    const right = Number(c.display);
    let base = c.leftText ?? c.display;
    if (c.operator && c.left !== null && !c.replaceNext) {
      const result = calculate(c.left, right, c.operator);
      if (result === null) return { state: withExpression({ ...c, error: CALCULATOR_ERROR }) };
      Object.assign(c, { display: result, left: Number(result) });
      base = result;
      amount = result;
    } else if (!c.operator || c.left === null) c.left = right;
    Object.assign(c, { leftText: base, operator: key, replaceNext: true, history: null });
  }
  return { state: withExpression(c), amount };
}

/** Finishes any pending calculation. `amount` is null when the result cannot be used; the state then holds the error. */
export function finishCalculator(current: CalculatorState): { state: CalculatorState; amount: string | null } {
  const { state, amount } = pressCalculator(current, "=");
  if (state.error) return { state, amount: null };
  const result = formatResult(Number(amount ?? state.display));
  if (result === null) return { state: { ...state, error: CALCULATOR_ERROR }, amount: null };
  return { state: { ...state, history: null }, amount: result };
}

const hardwareKeys: Record<string, CalculatorKey> = {
  "+": "+",
  "-": "−",
  "*": "×",
  x: "×",
  "/": "÷",
  "%": "%",
  ",": ".",
  ".": ".",
  Backspace: "⌫",
  Delete: "AC",
};

/** The keypad key for a hardware keyboard key; “done” finishes the keypad. */
export function calculatorKeyForHardware(key: string, state: CalculatorState): CalculatorKey | "done" | null {
  if (/^\d$/.test(key)) return key as CalculatorKey;
  if (key === "Enter" || key === "=") return state.operator && !state.replaceNext ? "=" : "done";
  return hardwareKeys[key] ?? null;
}

/** Puts a pasted amount on screen; during a pending calculation it becomes the right side, not the entry amount. */
export function pasteIntoCalculator(
  current: CalculatorState,
  pasted: string
): { state: CalculatorState; amount?: string } {
  const state = withExpression({ ...current, display: pasted, replaceNext: false, history: null, error: "" });
  return { state, amount: current.operator ? undefined : pasted };
}

/** “1250.5+1000” → “1,250.5+1,000”. */
export function groupAmountDigits(text: string): string {
  return text.replace(/\d+(\.\d*)?/g, (number) => {
    const [whole, fraction] = number.split(".");
    return Number(whole).toLocaleString("en-US") + (fraction !== undefined ? "." + fraction : "");
  });
}

/** The first amount in copied text, or null when there is none the keypad can take. */
export function amountFromClipboard(text: string): string | null {
  const match = text.match(/\d[\d,]*(?:\.\d{1,2})?/);
  if (!match) return null;
  const amount = normalizeAmount(match[0]);
  if (amount.length > MAX_CHARACTERS) return null;
  return amount;
}

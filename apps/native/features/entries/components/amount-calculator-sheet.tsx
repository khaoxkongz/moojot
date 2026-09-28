import { useAppTheme } from "@/lib/use-app-theme";
import { Text } from "@/components/ui/typography";
import { useState } from "react";
import { Modal, Pressable, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";

type Operator = "+" | "−" | "×" | "÷";

export type AmountCalculatorSheetProps = {
  visible: boolean;
  value: string;
  onChange: (value: string) => void;
  /** The amount card can show the calculation as it is entered. */
  onExpressionChange?: (expression: string, history: string | null, active: boolean) => void;
  onDone: () => void;
  onClose?: () => void;
  readClipboard?: () => Promise<string>;
};

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

function calculate(left: number, right: number, operator: Operator): string | null {
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

function PasteIcon() {
  const theme = useAppTheme();
  return (
    <Svg width={23} height={25} viewBox="0 0 24 26" fill="none">
      <Rect x={3} y={4} width={16} height={19} rx={2} stroke={theme.accentText} strokeWidth={1.7} />
      <Path
        d="M8 4.5V3a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M10 10h11v13H10z"
        fill={theme.raised}
        stroke={theme.accentText}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <Path d="M13 14h5m-5 4h5" stroke={theme.accentText} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function BackspaceIcon() {
  const theme = useAppTheme();
  return (
    <Svg width={28} height={25} viewBox="0 0 30 26" fill="none">
      <Path d="M11 3h16v20H11L2 13l9-10Z" stroke={theme.text} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="m17 9 6 8m0-8-6 8" stroke={theme.text} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function CheckIcon() {
  const theme = useAppTheme();
  return (
    <Svg width={30} height={25} viewBox="0 0 32 27" fill="none">
      <Path d="m3 14 8 8L29 3" stroke={theme.onAccent} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function AmountCalculatorSheet(props: AmountCalculatorSheetProps) {
  return props.visible ? <CalculatorContents {...props} /> : null;
}

function CalculatorContents({
  value,
  onChange,
  onExpressionChange,
  onDone,
  onClose,
  readClipboard,
}: AmountCalculatorSheetProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const [display, setDisplay] = useState(() => normalizeAmount(value));
  const [left, setLeft] = useState<number | null>(null);
  const [leftText, setLeftText] = useState<string | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [replaceNext, setReplaceNext] = useState(false);
  const [error, setError] = useState("");

  const symbol = (value: Operator) => (value === "−" ? "-" : value);

  const emit = (next: string, nextHistory: string | null = null, active = true) => {
    onExpressionChange?.(next, nextHistory, active);
  };

  const put = (next: string) => {
    setDisplay(next);
    if (operator && leftText !== null) emit(leftText + symbol(operator) + next);
    else {
      onChange(next);
      emit(next);
    }
    setError("");
  };

  const digit = (key: string) => {
    const next =
      replaceNext || display === "0"
        ? key === "."
          ? "0."
          : key
        : key === "." && display.includes(".")
          ? display
          : display.includes(".") && display.split(".")[1].length >= 2
            ? display
            : display.length >= 12
              ? display
              : display + key;
    put(next);
    setReplaceNext(false);
  };

  const chooseOperator = (nextOperator: Operator) => {
    const current = Number(display);
    let base = leftText ?? display;
    if (operator && left !== null && !replaceNext) {
      const result = calculate(left, current, operator);
      if (result === null) {
        setError("ไม่สามารถคำนวณจำนวนนี้ได้");
        return;
      }
      setDisplay(result);
      onChange(result);
      setLeft(Number(result));
      base = result;
    } else {
      if (!operator || left === null) setLeft(current);
    }
    setLeftText(base);
    setOperator(nextOperator);
    setReplaceNext(true);
    setError("");
    emit(base + symbol(nextOperator));
  };

  const evaluate = (): string | null => {
    if (!operator || left === null || replaceNext) return display;
    const result = calculate(left, Number(display), operator);
    if (result === null) {
      setError("ไม่สามารถคำนวณจำนวนนี้ได้");
      return null;
    }
    const nextHistory = (leftText ?? String(left)) + symbol(operator) + display + "=";
    setDisplay(result);
    onChange(result);
    setLeft(null);
    setLeftText(null);
    setOperator(null);
    setReplaceNext(true);
    setError("");
    emit(result, nextHistory);
    return result;
  };

  const done = () => {
    const result = evaluate();
    if (result !== null) {
      const normalized = formatResult(Number(result));
      if (normalized === null) {
        setError("ไม่สามารถคำนวณจำนวนนี้ได้");
        return;
      }
      onChange(normalized);
      emit(normalized, null, false);
      onDone();
    }
  };

  const close = () => {
    emit(value, null, false);
    onClose?.();
  };

  const paste = async () => {
    try {
      const text = readClipboard
        ? await readClipboard()
        : process.env.EXPO_OS === "web" && typeof navigator !== "undefined" && navigator.clipboard
          ? await navigator.clipboard.readText()
          : "";
      const match = text.match(/\d[\d,]*(?:\.\d{1,2})?/);
      const next = match && normalizeAmount(match[0]);
      if (!next || (next === "0" && !/\b0(?:\.0{1,2})?\b/.test(text))) {
        setError("คลิปบอร์ดไม่มีจำนวนเงิน");
        return;
      }
      put(next);
      setReplaceNext(false);
    } catch {
      setError("ไม่สามารถวางจำนวนเงินได้");
    }
  };

  const press = (key: string) => {
    if (/^\d$/.test(key) || key === ".") {
      digit(key);
      return;
    }
    if (key === "AC") {
      setLeft(null);
      setLeftText(null);
      setOperator(null);
      setReplaceNext(false);
      setDisplay("0");
      setError("");
      onChange("0");
      emit("0");
      return;
    }
    if (key === "⌫") {
      if (operator && replaceNext) {
        setLeft(null);
        setLeftText(null);
        setOperator(null);
        setReplaceNext(false);
        emit(display);
        return;
      }
      put(display.length > 1 ? display.slice(0, -1) : "0");
      setReplaceNext(false);
      return;
    }
    if (key === "%") {
      const result = formatResult(Number(display) / 100);
      if (result === null) setError("ไม่สามารถคำนวณจำนวนนี้ได้");
      else if (operator && replaceNext) {
        setDisplay(result);
        setLeft(Number(result));
        setLeftText(null);
        setOperator(null);
        setReplaceNext(false);
        setError("");
        onChange(result);
        emit(result);
      } else {
        put(result);
        setReplaceNext(false);
      }
      return;
    }
    if (key === "=") {
      evaluate();
      return;
    }
    if (key === "✓") {
      done();
      return;
    }
    chooseOperator(key as Operator);
  };

  const pending = operator !== null && !replaceNext;

  const rows = [
    ["AC", "%", "÷"],
    ["7", "8", "9", "×"],
    ["4", "5", "6", "−"],
    ["1", "2", "3", "+"],
    [".", "0", "⌫", pending ? "=" : "✓"],
  ];
  const cellHeight = Math.max(44, Math.min(52, height * 0.06));

  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable accessibilityLabel="ปิดเครื่องคิดเลข" onPress={close} style={{ flex: 1 }} />
        <View
          style={{
            alignSelf: "center",
            width: "100%",
            maxWidth: 680,
            backgroundColor: theme.surface,
            borderTopLeftRadius: 9,
            borderTopRightRadius: 9,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              minHeight: 49,
              backgroundColor: theme.raised,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="วางจำนวนเงิน"
              onPress={paste}
              style={{
                minHeight: 46,
                minWidth: 80,
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
              }}
            >
              <PasteIcon />
              <Text style={{ color: theme.accentText, fontSize: 17, fontWeight: "700" }}>วาง</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={done}
              style={{ minHeight: 46, justifyContent: "center", paddingHorizontal: 2 }}
            >
              <Text style={{ color: theme.accentText, fontSize: 17, fontWeight: "700" }}>เสร็จ</Text>
            </Pressable>
          </View>
          {error ? (
            <Text
              accessibilityRole="alert"
              style={{ color: theme.dangerText, fontSize: 12, textAlign: "center", paddingTop: 5 }}
            >
              {error}
            </Text>
          ) : null}
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: Math.max(15, insets.bottom + 6),
              gap: 8,
            }}
          >
            {rows.map((row, rowIndex) => (
              <View key={rowIndex} style={{ flexDirection: "row", gap: 8 }}>
                {row.map((key) => {
                  const isFunction = ["AC", "%", "÷", "×", "−", "+"].includes(key);
                  const isDone = key === "=" || key === "✓";
                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="button"
                      accessibilityLabel={key === "⌫" ? "ลบตัวเลข" : key === "=" ? "คำนวณ" : key === "✓" ? "เสร็จ" : key}
                      onPress={() => press(key)}
                      style={({ pressed }) => ({
                        flex: key === "AC" ? 2 : 1,
                        minWidth: 0,
                        height: cellHeight,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 9,
                        borderWidth: isFunction || isDone ? 0 : 1,
                        borderColor: theme.border,
                        backgroundColor: isDone ? theme.accent : isFunction ? theme.raised : theme.surface,
                        opacity: pressed ? 0.72 : 1,
                      })}
                    >
                      {key === "⌫" ? (
                        <BackspaceIcon />
                      ) : key === "✓" ? (
                        <CheckIcon />
                      ) : key === "=" ? (
                        <Text style={{ color: theme.onAccent, fontSize: 28, fontWeight: "500" }}>=</Text>
                      ) : (
                        <Text
                          style={{
                            color: theme.text,
                            fontSize: key === "AC" ? 19 : 23,
                            fontWeight: key === "AC" ? "700" : "500",
                          }}
                        >
                          {key}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default AmountCalculatorSheet;

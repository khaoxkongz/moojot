import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/typography";
import { radius, touch } from "@/constants/theme";
import { calculatorKeyForHardware, type CalculatorKey, type CalculatorState } from "@/features/entries/calculator";
import { useAppTheme } from "@/lib/use-app-theme";

type PadKey = CalculatorKey | "done";

const rows: PadKey[][] = [
  ["AC", "%", "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "−"],
  ["1", "2", "3", "+"],
  [".", "0", "⌫", "done"],
];

const labels: Partial<Record<PadKey, string>> = {
  AC: "ล้างทั้งหมด",
  "%": "เปอร์เซ็นต์",
  "÷": "หาร",
  "×": "คูณ",
  "−": "ลบ",
  "+": "บวก",
  ".": "จุดทศนิยม",
  "⌫": "ลบตัวเลข",
  "=": "คำนวณ",
};

/**
 * The amount keypad that slides up over the editor: “วาง” and the error line on top, then the 4-column calculator.
 * The done key reads “เสร็จ”, or “=” while a calculation is pending. On the web, a hardware keyboard works too.
 */
export function AmountKeypad({
  state,
  onKey,
  onDone,
  onPaste,
}: {
  state: CalculatorState;
  onKey: (key: CalculatorKey) => void;
  onDone: () => void;
  onPaste: () => void;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const pending = state.operator !== null && !state.replaceNext;
  const [gridWidth, setGridWidth] = useState(0);
  const cell = gridWidth > 0 ? (gridWidth - 3 * 8) / 4 : 0;
  const handlers = useRef({ state, onKey, onDone });
  handlers.current = { state, onKey, onDone };

  useEffect(() => {
    if (process.env.EXPO_OS !== "web" || typeof window === "undefined") return;
    const listener = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = calculatorKeyForHardware(event.key, handlers.current.state);
      if (!key) return;
      event.preventDefault();
      if (key === "done") handlers.current.onDone();
      else handlers.current.onKey(key);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  return (
    <View
      accessibilityLabel="แป้นใส่จำนวนเงิน"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        backgroundColor: theme.surface,
        boxShadow: "0 -8px 28px rgba(0, 0, 0, 0.14)",
      }}
    >
      <View
        style={{
          minHeight: 48,
          paddingLeft: 6,
          paddingRight: 14,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          backgroundColor: theme.raised,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="วางจำนวนเงิน"
          onPress={onPaste}
          style={({ pressed }) => ({
            minHeight: touch.min,
            paddingHorizontal: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <MaterialCommunityIcons name="content-paste" size={20} color={theme.accentText} />
          <Text style={{ color: theme.accentText, fontSize: 15 }}>วาง</Text>
        </Pressable>
        <Text
          accessibilityRole={state.error ? "alert" : undefined}
          style={{ flex: 1, color: theme.danger, fontSize: 13, lineHeight: 18, textAlign: "right" }}
        >
          {state.error}
        </Text>
      </View>
      <View
        onLayout={(event) => setGridWidth(event.nativeEvent.layout.width - 24)}
        style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: insets.bottom + 10, gap: 8 }}
      >
        {rows.map((row, index) => (
          <View key={index} style={{ flexDirection: "row", gap: 8 }}>
            {row.map((key) => {
              const isDone = key === "done";
              const isFunction =
                key === "AC" || key === "%" || key === "÷" || key === "×" || key === "−" || key === "+";
              const outlined = !isDone && !isFunction;
              const shown: PadKey = isDone && pending ? "=" : key;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={shown === "done" ? "เสร็จ" : (labels[shown] ?? shown)}
                  onPress={() => (shown === "done" ? onDone() : onKey(shown))}
                  style={({ pressed }) => ({
                    ...(cell > 0 ? { width: key === "AC" ? cell * 2 + 8 : cell } : { flex: key === "AC" ? 2 : 1 }),
                    height: 50,
                    borderRadius: radius.key,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: outlined ? 1 : 0,
                    borderColor: theme.border,
                    backgroundColor: isDone
                      ? theme.accent
                      : pressed
                        ? outlined
                          ? theme.raised
                          : theme.border
                        : outlined
                          ? theme.surface
                          : theme.raised,
                    opacity: isDone && pressed ? 0.84 : 1,
                  })}
                >
                  {key === "⌫" ? (
                    <MaterialCommunityIcons name="backspace-outline" size={24} color={theme.text} />
                  ) : shown === "done" ? (
                    <Text style={{ color: theme.onAccent, fontSize: 17 }}>เสร็จ</Text>
                  ) : (
                    <Text
                      style={{
                        color: isDone ? theme.onAccent : theme.text,
                        fontSize: key === "AC" ? 18 : 22,
                        fontVariant: ["tabular-nums"],
                        fontWeight: "400",
                      }}
                    >
                      {shown}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

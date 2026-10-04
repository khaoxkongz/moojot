import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";

import { SheetBackdrop, SheetPanel } from "@/components/ui/bottom-sheet";
import { Text } from "@/components/ui/typography";
import { touch } from "@/constants/theme";
import {
  BIRTHDAY_INVALID,
  birthdayColumns,
  birthdayDraft,
  checkBirthday,
  type BirthdayDraft,
} from "@/features/settings/birthday";
import { useAppTheme } from "@/lib/use-app-theme";
import type { ISODate } from "@/types/finance";
import { todayISO } from "@/utils/dates";

const OPTION_HEIGHT = 44;
/** The handoff's column widths: day .8, month 1.5, year 1. */
const columnFlex = { day: 0.8, month: 1.5, year: 1 } as const;

/**
 * "ใส่วันเกิด": day, month and Buddhist-year columns. A day that does not exist or is after today shows
 * "วันเกิดไม่ถูกต้อง" at once, and "เลือก" keeps the sheet open until the day is valid.
 */
export function BirthdaySheet({
  visible,
  value,
  onPick,
  onClose,
}: {
  visible: boolean;
  value: ISODate | null;
  onPick: (birthDate: ISODate) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {/* A new picker per opening, so the draft starts from the saved birthday each time. */}
      <BirthdayPicker key={visible ? "open" : "closed"} value={value} onPick={onPick} onClose={onClose} />
    </Modal>
  );
}

function BirthdayPicker({
  value,
  onPick,
  onClose,
}: {
  value: ISODate | null;
  onPick: (birthDate: ISODate) => void;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const [today] = useState(todayISO);
  const [draft, setDraft] = useState<BirthdayDraft>(() => birthdayDraft(value));
  const picked = checkBirthday(draft, today);

  return (
    <View style={{ flex: 1, justifyContent: "flex-end" }}>
      <SheetBackdrop label="ปิด" onPress={onClose} />
      <SheetPanel title="ใส่วันเกิด" onClose={onClose} maxHeightRatio={0.9} bottomGap={14}>
        <View style={{ marginTop: 6, flexDirection: "row", gap: 8 }}>
          {birthdayColumns(today).map((column) => {
            const selected = column.options.findIndex((option) => option.value === draft[column.key]);
            return (
              <View key={column.key} style={{ flex: columnFlex[column.key], minWidth: 0, gap: 6 }}>
                <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 17, textAlign: "center" }}>
                  {column.label}
                </Text>
                <ScrollView
                  role="list"
                  aria-label={column.label}
                  style={{ height: 220, borderRadius: 14, backgroundColor: theme.raised }}
                  contentContainerStyle={{ padding: 4 }}
                  contentOffset={{ x: 0, y: Math.max(0, selected * OPTION_HEIGHT - 88) }}
                  showsVerticalScrollIndicator={false}
                >
                  {column.options.map((option) => {
                    const on = option.value === draft[column.key];
                    return (
                      <Pressable
                        key={option.value}
                        role="option"
                        aria-selected={on}
                        accessibilityLabel={option.label}
                        onPress={() => setDraft((current) => ({ ...current, [column.key]: option.value }))}
                        style={{
                          height: OPTION_HEIGHT,
                          borderRadius: 10,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: on ? theme.accent : "transparent",
                        }}
                      >
                        <Text style={{ color: on ? theme.onAccent : theme.text, fontSize: 15, lineHeight: 21 }}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            );
          })}
        </View>
        <Text
          accessibilityRole="alert"
          style={{
            marginTop: 8,
            minHeight: 20,
            color: theme.danger,
            fontSize: 13,
            lineHeight: 20,
            textAlign: "center",
          }}
        >
          {picked ? "" : BIRTHDAY_INVALID}
        </Text>
        <View style={{ marginTop: 6, flexDirection: "row", gap: 10 }}>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 48,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: theme.accentText,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ color: theme.accentText, fontSize: 15, lineHeight: 21 }}>ยกเลิก</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !picked }}
            onPress={() => {
              if (picked) onPick(picked);
            }}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: Math.max(48, touch.min),
              borderRadius: 24,
              backgroundColor: theme.accent,
              alignItems: "center",
              justifyContent: "center",
              opacity: picked ? (pressed ? 0.84 : 1) : 0.45,
            })}
          >
            <Text style={{ color: theme.onAccent, fontSize: 15, lineHeight: 21 }}>เลือก</Text>
          </Pressable>
        </View>
      </SheetPanel>
    </View>
  );
}

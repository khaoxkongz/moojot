import { useState } from "react";
import { Modal, Pressable, View } from "react-native";

import { IconButton } from "@/components/ui/controls";
import { Text } from "@/components/ui/typography";
import { radius, shadow, touch } from "@/constants/theme";
import { fromISO, longMonths, toISO } from "@/features/entries/date";
import { useAppTheme } from "@/lib/use-app-theme";
import { todayISO } from "@/utils/format";

const weekdays = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

/** Centered date picker for an entry: a day grid where days after today cannot be chosen, plus a “วันนี้” shortcut. */
export function CalendarSheet({
  visible,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {visible ? <CalendarContents value={value} onSelect={onSelect} onClose={onClose} /> : null}
    </Modal>
  );
}

function CalendarContents({
  value,
  onSelect,
  onClose,
}: {
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const today = todayISO();
  const [month, setMonth] = useState(() => {
    const date = fromISO(value <= today ? value : today);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const todayDate = fromISO(today);
  const atCurrentMonth = month.getFullYear() === todayDate.getFullYear() && month.getMonth() === todayDate.getMonth();
  const offset = month.getDay();
  const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: offset + dayCount }, (_, index) => (index < offset ? 0 : index - offset + 1));
  const monthTitle = longMonths[month.getMonth()] + " " + (month.getFullYear() + 543);
  const pick = (iso: string) => {
    onSelect(iso);
    onClose();
  };

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="ปิดปฏิทิน"
        onPress={onClose}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: theme.shade }}
      />
      <View
        accessibilityViewIsModal
        style={{
          width: "100%",
          maxWidth: 380,
          borderRadius: radius.dialog,
          backgroundColor: theme.surface,
          padding: 16,
          gap: 8,
          ...shadow.dialog,
        }}
      >
        <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 17, lineHeight: 24 }}>
          เลือกวันที่
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <IconButton
            icon="chevron-left"
            size={26}
            label="เดือนก่อน"
            onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          />
          <Text style={{ color: theme.text, fontSize: 15, lineHeight: 21 }}>{monthTitle}</Text>
          {atCurrentMonth ? (
            <View
              accessibilityLabel="เดือนถัดไปยังมาไม่ถึง"
              style={{ width: touch.min, height: touch.min, alignItems: "center" }}
            />
          ) : (
            <IconButton
              icon="chevron-right"
              size={26}
              label="เดือนถัดไป"
              onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            />
          )}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 4 }}>
          {weekdays.map((day) => (
            <Text
              key={day}
              style={{ width: `${100 / 7}%`, textAlign: "center", color: theme.muted, fontSize: 12, lineHeight: 24 }}
            >
              {day}
            </Text>
          ))}
          {cells.map((day, index) => {
            if (day === 0) return <View key={"blank-" + index} style={{ width: `${100 / 7}%`, height: 40 }} />;
            const iso = toISO(new Date(month.getFullYear(), month.getMonth(), day));
            const selected = iso === value;
            const future = iso > today;
            return (
              <View key={iso} style={{ width: `${100 / 7}%`, height: 40, alignItems: "center" }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`วันที่ ${day}${iso === today ? " วันนี้" : ""}`}
                  accessibilityState={{ selected, disabled: future }}
                  disabled={future}
                  onPress={() => pick(iso)}
                  style={({ pressed }) => ({
                    width: 40,
                    height: 40,
                    borderRadius: radius.pill,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: selected ? theme.accent : pressed ? theme.raised : "transparent",
                    borderWidth: iso === today && !selected ? 1.2 : 0,
                    borderColor: theme.accent,
                  })}
                >
                  <Text
                    style={{
                      color: selected ? theme.onAccent : future ? theme.border : theme.text,
                      fontSize: 15,
                      fontVariant: ["tabular-nums"],
                      fontWeight: "400",
                    }}
                  >
                    {day}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 48,
              borderRadius: radius.pill,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed ? theme.border : theme.raised,
            })}
          >
            <Text style={{ color: theme.text, fontSize: 15 }}>ยกเลิก</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => pick(today)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 48,
              borderRadius: radius.pill,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.accent,
              opacity: pressed ? 0.84 : 1,
            })}
          >
            <Text style={{ color: theme.onAccent, fontSize: 15 }}>วันนี้</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useState } from "react";
import { Modal, Pressable, View, type TextStyle } from "react-native";

import { IconButton } from "@/components/ui/controls";
import { Text } from "@/components/ui/typography";
import { radius, shadow, touch } from "@/constants/theme";
import { fromISO, longMonths, toISO } from "@/features/entries/date";
import { useAppTheme } from "@/lib/use-app-theme";
import { todayISO } from "@/utils/format";

const weekdays = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
/** Each day is a 40-tall stadium as wide as its column. */
const DAY_HEIGHT = 40;

/**
 * “เลือกวันที่จด”: the centered date dialog from the prototype (`aria-label="เลือกวันที่จด"`). Days after today are
 * greyed and cannot be chosen, the next-month arrow dims at the current month, and “วันนี้” picks today.
 */
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

  const dayText: TextStyle = { fontSize: 15, lineHeight: 20, fontVariant: ["tabular-nums"], fontWeight: "400" };
  const dialogButton = {
    flex: 1,
    minHeight: touch.dialogButton,
    borderRadius: touch.dialogButton / 2,
    alignItems: "center",
    justifyContent: "center",
  } as const;

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
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
          maxWidth: 360,
          borderRadius: radius.dialog,
          backgroundColor: theme.surface,
          paddingTop: 16,
          paddingHorizontal: 16,
          paddingBottom: 14,
          ...shadow.dialog,
        }}
      >
        <Text
          accessibilityRole="header"
          style={{ color: theme.text, fontSize: 17, lineHeight: 24, textAlign: "center" }}
        >
          เลือกวันที่จด
        </Text>
        <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <IconButton
            icon="chevron-left"
            size={26}
            color={theme.accentText}
            label="เดือนก่อน"
            onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          />
          <Text style={{ color: theme.text, fontSize: 15, lineHeight: 21 }}>{monthTitle}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="เดือนถัดไป"
            accessibilityState={{ disabled: atCurrentMonth }}
            disabled={atCurrentMonth}
            onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            style={({ pressed }) => ({
              width: touch.min,
              height: touch.min,
              borderRadius: touch.min / 2,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed ? theme.raised : "transparent",
              opacity: atCurrentMonth ? 0.35 : 1,
            })}
          >
            <MaterialCommunityIcons name="chevron-right" size={26} color={theme.accentText} />
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 2 }}>
          {weekdays.map((day) => (
            <Text
              key={day}
              style={{
                width: `${100 / 7}%`,
                paddingVertical: 6,
                textAlign: "center",
                color: theme.muted,
                fontSize: 12,
                lineHeight: 17,
              }}
            >
              {day}
            </Text>
          ))}
          {cells.map((day, index) => {
            if (day === 0) return <View key={"blank-" + index} style={{ width: `${100 / 7}%`, height: DAY_HEIGHT }} />;
            const iso = toISO(new Date(month.getFullYear(), month.getMonth(), day));
            const future = iso > today;
            if (future) {
              return (
                <View
                  key={iso}
                  accessibilityLabel={`วันที่ ${day} ยังมาไม่ถึง`}
                  style={{ width: `${100 / 7}%`, height: DAY_HEIGHT, alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={[dayText, { color: theme.muted, opacity: 0.4 }]}>{day}</Text>
                </View>
              );
            }
            const selected = iso === value;
            const isToday = iso === today && !selected;
            return (
              <Pressable
                key={iso}
                accessibilityRole="button"
                accessibilityLabel={`วันที่ ${day}${iso === today ? " วันนี้" : ""}`}
                accessibilityState={{ selected }}
                onPress={() => pick(iso)}
                style={({ pressed }) => ({
                  width: `${100 / 7}%`,
                  height: DAY_HEIGHT,
                  borderRadius: DAY_HEIGHT / 2,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: selected ? theme.accent : pressed ? theme.raised : "transparent",
                  ...(isToday ? { boxShadow: `inset 0 0 0 1.5px ${theme.accent}` } : null),
                })}
              >
                <Text style={[dayText, { color: selected ? theme.onAccent : isToday ? theme.accentText : theme.text }]}>
                  {day}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [
              dialogButton,
              { borderWidth: 1, borderColor: theme.accent, backgroundColor: pressed ? theme.raised : "transparent" },
            ]}
          >
            <Text style={{ color: theme.accentText, fontSize: 15, lineHeight: 21 }}>ยกเลิก</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => pick(today)}
            style={({ pressed }) => [dialogButton, { backgroundColor: theme.accent, opacity: pressed ? 0.84 : 1 }]}
          >
            <Text style={{ color: theme.onAccent, fontSize: 15, lineHeight: 21 }}>วันนี้</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

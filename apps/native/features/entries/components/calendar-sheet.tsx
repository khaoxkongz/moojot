import { useState } from "react";
import { Modal, Pressable, View } from "react-native";

import { Text } from "@/components/ui/typography";
import { fromISO, longMonths, toISO } from "@/features/entries/date";
import { styles } from "@/features/entries/entry-styles";
import { todayISO } from "@/utils/format";

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
  return visible ? <CalendarContents value={value} onSelect={onSelect} onClose={onClose} /> : null;
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
  const [month, setMonth] = useState(() => {
    const date = fromISO(value);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const offset = month.getDay();
  const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: offset + dayCount }, (_, index) => (index < offset ? 0 : index - offset + 1));
  const monthTitle = longMonths[month.getMonth()] + " " + (month.getFullYear() + 543);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalCenter}>
        <Pressable accessibilityLabel="ปิดปฏิทิน" onPress={onClose} style={styles.modalShade} />
        <View style={styles.calendarCard}>
          <Text style={styles.calendarTitle}>เลือกวันที่จด</Text>
          <View style={styles.calendarMonthRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="เดือนก่อน"
              onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              style={styles.calendarArrow}
            >
              <Text style={styles.calendarArrowText}>‹</Text>
            </Pressable>
            <Text style={styles.calendarMonth}>{monthTitle}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="เดือนถัดไป"
              onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              style={styles.calendarArrow}
            >
              <Text style={styles.calendarArrowText}>›</Text>
            </Pressable>
          </View>
          <View style={styles.calendarGrid}>
            {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day) => (
              <Text key={day} style={styles.calendarWeekday}>
                {day}
              </Text>
            ))}
            {cells.map((day, index) =>
              day === 0 ? (
                <View key={"blank-" + index} style={styles.calendarDay} />
              ) : (
                <Pressable
                  key={day}
                  accessibilityRole="button"
                  accessibilityLabel={"วันที่ " + day}
                  onPress={() => {
                    onSelect(toISO(new Date(month.getFullYear(), month.getMonth(), day)));
                    onClose();
                  }}
                  style={[
                    styles.calendarDay,
                    value === toISO(new Date(month.getFullYear(), month.getMonth(), day)) && styles.calendarSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.calendarDayText,
                      value === toISO(new Date(month.getFullYear(), month.getMonth(), day)) &&
                        styles.calendarSelectedText,
                    ]}
                  >
                    {day}
                  </Text>
                </Pressable>
              )
            )}
          </View>
          <View style={styles.calendarActions}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondaryAction}>
              <Text style={styles.secondaryActionText}>ยกเลิก</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onSelect(todayISO());
                onClose();
              }}
              style={styles.primaryAction}
            >
              <Text style={styles.primaryActionText}>วันนี้</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

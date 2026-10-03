import { useMutation, useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useIsFocused } from "expo-router";
import React, { useMemo, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/lib/use-app-theme";
import { Text } from "@/components/ui/typography";
import { planningMutationOptions } from "@/features/planning/mutation-options";
import { planningQueryOptions } from "@/features/planning/query-options";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { settingsMutationOptions } from "@/features/settings/mutation-options";
import { settingsQueryOptions } from "@/features/settings/query-options";
import { getPeriodForDate, isoYear, shortBuddhistYear } from "@/utils/dates";
import { isValidISODate, errorMessage } from "@/utils/format";

type OpenPeriod = "month" | "fortnight" | "week";
type Picker = "weekday" | "fortnight" | "monthday" | null;
type CalendarPreferences = {
  weekStart: number;
  fortnightAnchor: string;
  monthStartDay: number;
  openPeriod: OpenPeriod;
};

const weekdays = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];
const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function localToday(): string {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join(
    "-"
  );
}

function parseISO(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function asISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, days: number): string {
  const date = parseISO(value);
  date.setUTCDate(date.getUTCDate() + days);
  return asISO(date);
}

function daysBetween(from: string, to: string): number {
  return Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / 86_400_000);
}

function startOfWeek(value: string, weekday: number): string {
  const date = parseISO(value);
  return addDays(value, -((date.getUTCDay() - weekday + 7) % 7));
}

function twoWeekStart(today: string, anchor: string): string {
  return addDays(anchor, 14 * Math.floor(daysBetween(anchor, today) / 14));
}

function shortDate(value: string, withYear = false): string {
  const date = parseISO(value);
  return `${date.getUTCDate()} ${monthNames[date.getUTCMonth()]}${withYear ? ` ${shortBuddhistYear(isoYear(value))}` : ""}`;
}

function dateRange(from: string, through: string): string {
  const sameYear = isoYear(from) === isoYear(through);
  return `${shortDate(from, !sameYear)} - ${shortDate(through, true)}`;
}

function defaults(): CalendarPreferences {
  return {
    weekStart: 0,
    fortnightAnchor: startOfWeek(localToday(), 0),
    monthStartDay: 1,
    openPeriod: "month",
  };
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  const styles = useLocalStyles();
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionHeadingText}>{children}</Text>
    </View>
  );
}

function FieldRow({
  label,
  value,
  onPress,
  disabled = false,
}: {
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const styles = useLocalStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.fieldRow, pressed && styles.pressed]}
    >
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldValueGroup}>
        <Text numberOfLines={1} style={styles.fieldValue}>
          {value}
        </Text>
        <Text style={styles.chevron}>⌄</Text>
      </View>
    </Pressable>
  );
}

function RadioRow({
  label,
  selected,
  onPress,
  disabled = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const styles = useLocalStyles();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.radioRow, pressed && styles.pressed]}
    >
      <View style={[styles.radioCircle, selected && styles.radioSelected]}>
        {selected ? <Text style={styles.radioCheck}>✓</Text> : null}
      </View>
      <Text style={styles.radioLabel}>{label}</Text>
    </Pressable>
  );
}

const WHEEL_ITEM_HEIGHT = 40;

function WheelPicker({
  options,
  selected,
  onSelect,
}: {
  options: { label: string; value: number }[];
  selected: number;
  onSelect: (value: number) => void;
}) {
  const styles = useLocalStyles();
  const scroll = useRef<ScrollView>(null);
  const positioned = useRef(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((item) => item.value === selected)
  );
  const chooseFromOffset = (offset: number) => {
    const index = Math.max(0, Math.min(options.length - 1, Math.round(offset / WHEEL_ITEM_HEIGHT)));
    if (options[index].value !== selected) onSelect(options[index].value);
  };

  return (
    <View style={[styles.wheel, options.length <= 7 && styles.wheelCompact]}>
      <View pointerEvents="none" style={styles.wheelHighlight} />
      <ScrollView
        ref={scroll}
        accessibilityRole="adjustable"
        accessibilityLabel="เลื่อนเพื่อเลือกค่า"
        accessibilityValue={{ text: options[selectedIndex].label }}
        accessibilityActions={[
          { name: "increment", label: "ค่าถัดไป" },
          { name: "decrement", label: "ค่าก่อนหน้า" },
        ]}
        onAccessibilityAction={(event) => {
          const step = event.nativeEvent.actionName === "increment" ? 1 : -1;
          const nextIndex = Math.max(0, Math.min(options.length - 1, selectedIndex + step));
          onSelect(options[nextIndex].value);
          scroll.current?.scrollTo({ y: nextIndex * WHEEL_ITEM_HEIGHT, animated: true });
        }}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onContentSizeChange={() => {
          if (positioned.current) return;
          positioned.current = true;
          scroll.current?.scrollTo({ y: selectedIndex * WHEEL_ITEM_HEIGHT, animated: false });
        }}
        onScrollEndDrag={(event) => chooseFromOffset(event.nativeEvent.contentOffset.y)}
        onMomentumScrollEnd={(event) => chooseFromOffset(event.nativeEvent.contentOffset.y)}
        contentContainerStyle={styles.wheelContent}
      >
        {options.map((item, index) => (
          <Pressable
            key={item.value}
            accessibilityRole="radio"
            accessibilityLabel={item.label}
            accessibilityState={{ checked: item.value === selected }}
            onPress={() => {
              onSelect(item.value);
              scroll.current?.scrollTo({ y: index * WHEEL_ITEM_HEIGHT, animated: true });
            }}
            style={styles.wheelItem}
          >
            <Text style={[styles.wheelItemText, item.value === selected && styles.wheelItemSelected]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export default function CalendarSettingsScreen() {
  const styles = useLocalStyles();
  const theme = useAppTheme();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const [resetToken, setResetToken] = useState(0);

  const { height: windowHeight } = useWindowDimensions();

  const previousReset = useRef(resetToken);

  const setMonthStartDayMutation = useMutation(planningMutationOptions.setMonthStartDay());
  const setSettingMutation = useMutation(settingsMutationOptions.setSetting());

  const monthStartQuery = useQuery({ ...planningQueryOptions.monthStartDay(), enabled: isFocused });
  const weekStartQuery = useQuery({
    ...settingsQueryOptions.value("calendar_week_start"),
    enabled: isFocused,
  });
  const anchorQuery = useQuery({
    ...settingsQueryOptions.value("calendar_fortnight_anchor"),
    enabled: isFocused,
  });
  const periodQuery = useQuery({
    ...settingsQueryOptions.value("calendar_open_period"),
    enabled: isFocused,
  });

  const queries = [monthStartQuery, weekStartQuery, anchorQuery, periodQuery];
  const loadError = queries.find((query) => query.data === undefined && query.error)?.error?.message;
  const loading = queries.some((query) => query.data === undefined);
  const queryError = queries.find((query) => query.error)?.error?.message;
  const storedWeekday = weekStartQuery.data;
  const storedAnchor = anchorQuery.data;
  const storedPeriod = periodQuery.data;
  const weekday = Number(storedWeekday);
  const serverPreferences: CalendarPreferences = {
    weekStart: storedWeekday !== null && Number.isInteger(weekday) && weekday >= 0 && weekday <= 6 ? weekday : 0,
    fortnightAnchor: storedAnchor && isValidISODate(storedAnchor) ? storedAnchor : startOfWeek(localToday(), 0),
    monthStartDay: monthStartQuery.data ?? 1,
    openPeriod: storedPeriod === "fortnight" || storedPeriod === "week" ? storedPeriod : "month",
  };
  const [draftPreferences, setDraftPreferences] = useState<CalendarPreferences | null>(null);
  const preferences = draftPreferences ?? serverPreferences;
  const setPreferences = (update: React.SetStateAction<CalendarPreferences>) =>
    setDraftPreferences((current) => {
      const value = current ?? serverPreferences;
      return typeof update === "function" ? update(value) : update;
    });

  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState<Picker>(null);
  const [pendingWeekday, setPendingWeekday] = useState(0);
  const [pendingAnchor, setPendingAnchor] = useState(startOfWeek(localToday(), 0));
  const [pendingMonthDay, setPendingMonthDay] = useState(1);
  const [confirmSave, setConfirmSave] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (previousReset.current === resetToken) return;
    previousReset.current = resetToken;
    setDraftPreferences(defaults());
    setMessage("คืนค่าตัวเลือกเริ่มต้นแล้ว กดบันทึกเพื่อใช้ค่าใหม่");
    setError(null);
    setPicker(null);
    setConfirmSave(false);
  }, [resetToken]);

  const today = localToday();
  const fortnightStart = twoWeekStart(today, preferences.fortnightAnchor);
  const fortnightLabel = dateRange(fortnightStart, addDays(fortnightStart, 13));
  const thisWeekStart = startOfWeek(today, preferences.weekStart);
  const alternateAnchor = addDays(thisWeekStart, -7);

  const periodCaption = (() => {
    if (preferences.openPeriod === "fortnight") return `รอบนี้: ${fortnightLabel}`;
    if (preferences.openPeriod === "week") return `รอบนี้: ${dateRange(thisWeekStart, addDays(thisWeekStart, 6))}`;
    const period = getPeriodForDate(today, preferences.monthStartDay);
    const startMonth = parseISO(period.from);
    return `รอบนี้: ${monthNames[startMonth.getUTCMonth()]} ${shortBuddhistYear(isoYear(period.from))}`;
  })();

  const save = async () => {
    if (busy) return;
    try {
      setBusy(true);
      setError(null);
      await setSettingMutation.mutateAsync({
        key: "calendar_week_start",
        value: String(preferences.weekStart),
      });
      await setSettingMutation.mutateAsync({
        key: "calendar_fortnight_anchor",
        value: preferences.fortnightAnchor,
      });
      await setSettingMutation.mutateAsync({
        key: "calendar_open_period",
        value: preferences.openPeriod,
      });
      await setMonthStartDayMutation.mutateAsync({ day: preferences.monthStartDay });
      setConfirmSave(false);
      setMessage("บันทึกการตั้งค่าปฏิทินแล้ว");
    } catch (cause) {
      setError(errorMessage(cause));
      setConfirmSave(false);
    } finally {
      setBusy(false);
    }
  };

  const openPicker = (which: Exclude<Picker, null>) => {
    setPendingWeekday(preferences.weekStart);
    setPendingAnchor(preferences.fortnightAnchor);
    setPendingMonthDay(preferences.monthStartDay);
    setPicker(which);
  };

  const selectPicker = () => {
    if (picker === "weekday") {
      setPreferences((current) => ({
        ...current,
        weekStart: pendingWeekday,
        fortnightAnchor: startOfWeek(localToday(), pendingWeekday),
      }));
    } else if (picker === "fortnight") {
      setPreferences((current) => ({ ...current, fortnightAnchor: pendingAnchor }));
    } else if (picker === "monthday") {
      setPreferences((current) => ({ ...current, monthStartDay: pendingMonthDay }));
    }
    setPicker(null);
    setMessage(null);
  };

  return (
    <SettingsPage
      title="ตั้งค่าปฏิทิน"
      right={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="รีเซ็ตการตั้งค่าปฏิทิน"
          onPress={() => setResetToken((value) => value + 1)}
          style={styles.resetButton}
        >
          <Text style={styles.resetText}>รีเซ็ต</Text>
        </Pressable>
      }
    >
      <View style={styles.screen}>
        {loading ? (
          <View style={styles.loading}>
            {loadError ? (
              <Pressable
                onPress={() => {
                  void monthStartQuery.refetch();
                  void weekStartQuery.refetch();
                  void anchorQuery.refetch();
                  void periodQuery.refetch();
                }}
              >
                <Text selectable style={styles.error}>
                  {loadError} · ลองอีกครั้ง
                </Text>
              </Pressable>
            ) : (
              <ActivityIndicator color={theme.accentText} size="large" />
            )}
          </View>
        ) : (
          <>
            <ScrollView
              bounces={false}
              alwaysBounceVertical={false}
              overScrollMode="never"
              showsVerticalScrollIndicator={false}
              contentInsetAdjustmentBehavior="automatic"
              style={{ flex: 1 }}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.contentWidth}>
                <SectionHeading>วันที่เริ่มต้น</SectionHeading>
                <FieldRow
                  label="เริ่มสัปดาห์"
                  value={weekdays[preferences.weekStart]}
                  onPress={() => openPicker("weekday")}
                  disabled={busy}
                />
                <View style={styles.rowGap} />
                <FieldRow
                  label="ช่วง 2 สัปดาห์"
                  value={fortnightLabel}
                  onPress={() => openPicker("fortnight")}
                  disabled={busy}
                />
                <View style={styles.rowGap} />
                <FieldRow
                  label="เริ่มเดือน"
                  value={`วันที่ ${preferences.monthStartDay}`}
                  onPress={() => openPicker("monthday")}
                  disabled={busy}
                />

                <SectionHeading>รอบปฏิทินเมื่อเปิดแอป</SectionHeading>
                <View accessibilityRole="radiogroup" style={styles.radioGroup}>
                  <RadioRow
                    label="รายเดือน"
                    selected={preferences.openPeriod === "month"}
                    onPress={() => setPreferences((current) => ({ ...current, openPeriod: "month" }))}
                    disabled={busy}
                  />
                  <RadioRow
                    label="ราย 2 สัปดาห์"
                    selected={preferences.openPeriod === "fortnight"}
                    onPress={() => setPreferences((current) => ({ ...current, openPeriod: "fortnight" }))}
                    disabled={busy}
                  />
                  <RadioRow
                    label="รายสัปดาห์"
                    selected={preferences.openPeriod === "week"}
                    onPress={() => setPreferences((current) => ({ ...current, openPeriod: "week" }))}
                    disabled={busy}
                  />
                </View>
                <Text style={styles.periodCaption}>{periodCaption}</Text>
                {message ? (
                  <Text accessibilityRole="alert" style={styles.message}>
                    {message}
                  </Text>
                ) : null}
                {error || queryError ? (
                  <Text accessibilityRole="alert" selectable style={styles.error}>
                    {error ?? queryError}
                  </Text>
                ) : null}
              </View>
            </ScrollView>
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 44, 56) }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="บันทึกการตั้งค่าปฏิทิน"
                disabled={busy}
                onPress={() => setConfirmSave(true)}
                style={({ pressed }) => [styles.saveButton, (pressed || busy) && styles.pressed]}
              >
                <Text style={styles.saveText}>{busy ? "กำลังบันทึก…" : "บันทึก"}</Text>
              </Pressable>
            </View>
          </>
        )}

        <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
          <View style={styles.modalBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              accessibilityRole="button"
              accessibilityLabel="ปิดตัวเลือก"
              onPress={() => setPicker(null)}
            />
            {picker === "fortnight" ? (
              <View style={[styles.pickerPanel, { height: Math.min(399, windowHeight - 36) }]}>
                <View style={styles.fortnightArt}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="ปิดตัวเลือกช่วง 2 สัปดาห์"
                    onPress={() => setPicker(null)}
                    style={styles.fortnightClose}
                  >
                    <Text style={styles.fortnightCloseText}>×</Text>
                  </Pressable>
                  <Image
                    source={require("../../../../assets/generated/calendar-question-pig.png")}
                    contentFit="contain"
                    accessibilityLabel="น้องหมูสงสัยเรื่องรอบสองสัปดาห์"
                    style={styles.questionPig}
                  />
                </View>
                <View style={styles.fortnightBody}>
                  <Text style={styles.fortnightTitle}>2 สัปดาห์เริ่มเมื่อไหร่นะ?</Text>
                  <View accessibilityRole="radiogroup" style={styles.fortnightChoices}>
                    {[thisWeekStart, alternateAnchor].map((anchor, index) => {
                      const from = twoWeekStart(today, anchor);
                      const label = dateRange(from, addDays(from, 13));
                      const selected =
                        dateRange(
                          twoWeekStart(today, pendingAnchor),
                          addDays(twoWeekStart(today, pendingAnchor), 13)
                        ) === label;
                      return (
                        <Pressable
                          key={anchor}
                          accessibilityRole="radio"
                          accessibilityLabel={`${label} ${index === 0 ? "เริ่มสัปดาห์นี้" : "เริ่มสัปดาห์ที่แล้ว"}`}
                          accessibilityState={{ checked: selected }}
                          onPress={() => setPendingAnchor(anchor)}
                          style={styles.fortnightOption}
                        >
                          <View style={[styles.radioCircle, selected && styles.radioSelected]}>
                            {selected ? <Text style={styles.radioCheck}>✓</Text> : null}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fortnightOptionLabel}>{label}</Text>
                            <Text style={styles.fortnightOptionCaption}>
                              ({index === 0 ? "เริ่มสัปดาห์นี้" : "เริ่มสัปดาห์ที่แล้ว"})
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={styles.pickerActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="ยกเลิกการเลือก"
                      onPress={() => setPicker(null)}
                      style={styles.pickerCancel}
                    >
                      <Text style={styles.pickerCancelText}>ยกเลิก</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="ยืนยันช่วง 2 สัปดาห์"
                      onPress={selectPicker}
                      style={styles.pickerSelect}
                    >
                      <Text style={styles.pickerSelectText}>เลือก</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : picker ? (
              <View style={[styles.pickerPanel, styles.wheelPanel, { height: Math.min(399, windowHeight - 36) }]}>
                <Text style={styles.wheelTitle}>{picker === "weekday" ? "เริ่มสัปดาห์" : "เลือกวันที่เริ่มเดือน"}</Text>
                <WheelPicker
                  key={picker}
                  options={
                    picker === "weekday"
                      ? weekdays.map((label, value) => ({ label, value }))
                      : Array.from({ length: 31 }, (_, index) => ({
                          label: String(index + 1),
                          value: index + 1,
                        }))
                  }
                  selected={picker === "weekday" ? pendingWeekday : pendingMonthDay}
                  onSelect={picker === "weekday" ? setPendingWeekday : setPendingMonthDay}
                />
                <View style={styles.pickerActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="ยกเลิกการเลือก"
                    onPress={() => setPicker(null)}
                    style={styles.pickerCancel}
                  >
                    <Text style={styles.pickerCancelText}>ยกเลิก</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="ยืนยันค่าที่เลือก"
                    onPress={selectPicker}
                    style={styles.pickerSelect}
                  >
                    <Text style={styles.pickerSelectText}>เลือก</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        </Modal>

        <Modal visible={confirmSave} transparent animationType="fade" onRequestClose={() => setConfirmSave(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.confirmCard}>
              <View style={styles.confirmArt}>
                <Image
                  source={require("../../../../assets/generated/calendar-warning-pig.png")}
                  contentFit="contain"
                  accessibilityLabel="น้องหมูเตือนให้บันทึกการตั้งค่า"
                  style={styles.confirmImage}
                />
              </View>
              <View style={styles.confirmBody}>
                <Text style={styles.confirmTitle}>บันทึกตั้งค่านี้มั้ย?</Text>
                <Text style={styles.confirmCopy}>การตั้งค่าปฏิทินที่เลือกจะถูกบันทึกไว้กับอีเมลบัญชีนี้</Text>
                <View style={styles.confirmActions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => setConfirmSave(false)}
                    style={styles.cancelButton}
                  >
                    <Text style={styles.cancelText}>ไม่บันทึก</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => {
                      void save();
                    }}
                    style={styles.confirmButton}
                  >
                    <Text style={styles.confirmButtonText}>{busy ? "กำลังบันทึก…" : "บันทึก"}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SettingsPage>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    resetButton: { minWidth: 46, minHeight: 52, alignItems: "center", justifyContent: "center" },
    resetText: { color: theme.accentText, fontSize: 17, fontWeight: "800" },
    loading: { flex: 1, alignItems: "center", justifyContent: "center" },
    scrollContent: { paddingBottom: 18 },
    contentWidth: { width: "100%", maxWidth: 680, alignSelf: "center" },
    sectionHeading: {
      minHeight: 49,
      justifyContent: "center",
      paddingHorizontal: 17,
      backgroundColor: theme.background,
    },
    sectionHeadingText: { color: theme.text, fontSize: 18, fontWeight: "800" },
    fieldRow: {
      minHeight: 58,
      backgroundColor: theme.surface,
      paddingHorizontal: 17,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    fieldLabel: { color: theme.muted, fontSize: 16, flexShrink: 1 },
    fieldValueGroup: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 6,
      flex: 1,
    },
    fieldValue: { color: theme.text, fontSize: 16, flexShrink: 1, textAlign: "right" },
    chevron: { color: theme.text, fontSize: 27, lineHeight: 31, marginTop: -7 },
    rowGap: { height: 16, backgroundColor: theme.background },
    radioGroup: { backgroundColor: theme.surface },
    radioRow: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      gap: 17,
      paddingHorizontal: 20,
    },
    radioCircle: {
      width: 29,
      height: 29,
      borderRadius: 15,
      borderWidth: 2,
      borderColor: theme.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    radioSelected: { backgroundColor: theme.accent },
    radioCheck: { color: theme.onAccent, fontSize: 21, lineHeight: 25, fontWeight: "900" },
    radioLabel: { color: theme.text, fontSize: 17 },
    periodCaption: { color: theme.muted, fontSize: 15, paddingHorizontal: 17, paddingTop: 16 },
    message: {
      color: theme.success,
      fontSize: 13,
      lineHeight: 19,
      paddingHorizontal: 17,
      paddingTop: 12,
    },
    error: { color: theme.danger, fontSize: 13, lineHeight: 19, paddingHorizontal: 17, paddingTop: 12 },
    footer: { backgroundColor: theme.background, paddingTop: 10, alignItems: "center" },
    saveButton: {
      width: "64%",
      maxWidth: 300,
      minHeight: 52,
      borderRadius: 999,
      backgroundColor: theme.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    saveText: { color: theme.onAccent, fontSize: 19, fontWeight: "800" },
    pressed: { opacity: 0.7 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, .65)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    pickerPanel: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: theme.raised,
      borderRadius: 13,
      overflow: "hidden",
      transform: [{ translateY: 6 }],
    },
    wheelPanel: { paddingTop: 0 },
    wheelTitle: {
      color: theme.text,
      fontSize: 20,
      lineHeight: 32,
      fontWeight: "800",
      marginTop: 22,
      paddingHorizontal: 24,
    },
    wheel: { height: 245, marginTop: 29, position: "relative" },
    wheelCompact: { height: 170 },
    wheelHighlight: {
      position: "absolute",
      left: 24,
      right: 24,
      top: 81,
      height: 50,
      backgroundColor: theme.accent,
      borderRadius: 12,
    },
    wheelContent: { paddingTop: 86, paddingBottom: 120 },
    wheelItem: { height: WHEEL_ITEM_HEIGHT, justifyContent: "center", alignItems: "center" },
    wheelItemText: { color: theme.muted, fontSize: 19, lineHeight: 27, fontWeight: "700" },
    wheelItemSelected: { color: theme.onAccent, fontSize: 24, lineHeight: 32, fontWeight: "900" },
    pickerActions: {
      marginTop: "auto",
      paddingHorizontal: 24,
      paddingBottom: 27,
      flexDirection: "row",
      gap: 12,
    },
    pickerCancel: {
      flex: 1,
      minHeight: 40,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    pickerCancelText: { color: theme.accentText, fontSize: 18, fontWeight: "800" },
    pickerSelect: {
      flex: 1,
      minHeight: 40,
      borderRadius: 999,
      backgroundColor: theme.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    pickerSelectText: { color: theme.onAccent, fontSize: 18, fontWeight: "800" },
    fortnightArt: { height: 98, backgroundColor: theme.accent, alignItems: "center" },
    fortnightClose: {
      position: "absolute",
      top: 10,
      right: 16,
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    },
    fortnightCloseText: { color: theme.onAccent, fontSize: 34, lineHeight: 36, fontWeight: "300" },
    questionPig: { position: "absolute", top: 19, width: 130, height: 130 },
    fortnightBody: { flex: 1, paddingTop: 55 },
    fortnightTitle: {
      color: theme.text,
      fontSize: 20,
      lineHeight: 28,
      fontWeight: "800",
      textAlign: "center",
    },
    fortnightChoices: { paddingHorizontal: 19, paddingTop: 20, gap: 5 },
    fortnightOption: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12 },
    fortnightOptionLabel: { color: theme.text, fontSize: 16, lineHeight: 21 },
    fortnightOptionCaption: { color: theme.muted, fontSize: 13, lineHeight: 17 },
    confirmCard: {
      width: "100%",
      maxWidth: 420,
      borderRadius: 20,
      overflow: "hidden",
      backgroundColor: theme.raised,
    },
    confirmArt: {
      minHeight: 142,
      backgroundColor: theme.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    confirmImage: { width: 142, height: 142 },
    confirmBody: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 22, gap: 10 },
    confirmTitle: { color: theme.text, fontSize: 21, fontWeight: "900", textAlign: "center" },
    confirmCopy: { color: theme.muted, fontSize: 16, lineHeight: 24, textAlign: "center" },
    confirmActions: { flexDirection: "row", gap: 12, paddingTop: 17 },
    cancelButton: {
      flex: 1,
      minHeight: 47,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.accentText,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelText: { color: theme.accentText, fontSize: 16, fontWeight: "800" },
    confirmButton: {
      flex: 1,
      minHeight: 47,
      borderRadius: 999,
      backgroundColor: theme.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    confirmButtonText: { color: theme.onAccent, fontSize: 16, fontWeight: "800" },
  });
}

function useLocalStyles() {
  const theme = useAppTheme();
  return useMemo(() => createStyles(theme), [theme]);
}

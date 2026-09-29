import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useIsFocused } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/lib/use-app-theme";
import { Text, TextInput } from "@/components/ui/typography";
import { useOnboarding } from "@/context/onboarding";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { settingsMutationOptions } from "@/features/settings/mutation-options";
import { settingsQueryOptions } from "@/features/settings/query-options";
import { slipScanSession } from "@/features/slips/auto-import";
import { authClient } from "@/lib/auth-client";
import { clearLocalSlipImages } from "@/lib/local-slip-assets";

const months = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

function parseBirthDate(value: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getFullYear() === Number(match[1]) &&
    date.getMonth() + 1 === Number(match[2]) &&
    date.getDate() === Number(match[3])
    ? date
    : null;
}

function birthDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatBirthDate(date: Date): string {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function parseWebBirthDate(value: string): Date | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  return parseBirthDate(`${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`);
}

type IconName = "email" | "calendar" | "terms" | "privacy" | "data" | "edit" | "chevron";
type Sheet = "email" | "birth" | "personalization" | "updates" | "terms" | "privacy" | "data" | null;
type ConsentSetting = "personalization" | "updates";
type ConsentChoice = "yes" | "no" | null;

function consentLabel(value: ConsentChoice): string {
  return value === "yes" ? "ยินยอม" : value === "no" ? "ไม่ยินยอม" : "ยังไม่ระบุ";
}

function Icon({ name, size = 26 }: { name: IconName; size?: number }) {
  const theme = useAppTheme();
  const common = {
    fill: "none",
    stroke: theme.muted,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  let shape: React.ReactNode;
  switch (name) {
    case "email":
      shape = (
        <>
          <Rect x={2.5} y={6} width={25} height={18} rx={2} {...common} />
          <Path d="m3.5 8 11.5 9L26.5 8" {...common} />
        </>
      );
      break;
    case "calendar":
      shape = (
        <>
          <Rect x={3} y={6} width={24} height={21} rx={1} {...common} />
          <Line x1={3} y1={13} x2={27} y2={13} {...common} />
          <Line x1={9} y1={2} x2={9} y2={9} {...common} />
          <Line x1={21} y1={2} x2={21} y2={9} {...common} />
        </>
      );
      break;
    case "terms":
      shape = (
        <>
          <Path d="M5 3h14l5 5v19H5Z" {...common} />
          <Path d="M19 3v6h5M9 14h8M9 19h11M9 24h7" {...common} />
          <Path
            d="m18 16 8-8 2 2-8 8-3 1Z"
            fill={theme.surface}
            stroke={theme.muted}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
        </>
      );
      break;
    case "privacy":
      shape = (
        <>
          <Path d="M15 2 26 7v8c0 7-4.5 11.2-11 14C8.5 26.2 4 22 4 15V7Z" {...common} />
          <Path d="m10 15 3.5 3.5 6.5-7" {...common} />
        </>
      );
      break;
    case "data":
      shape = (
        <>
          <Rect x={4} y={3} width={22} height={24} rx={1} {...common} />
          <Circle cx={9} cy={10} r={0.8} fill={theme.muted} />
          <Circle cx={9} cy={17} r={0.8} fill={theme.muted} />
          <Circle cx={9} cy={23} r={0.8} fill={theme.muted} />
          <Line x1={13} y1={10} x2={21} y2={10} {...common} />
          <Line x1={13} y1={17} x2={21} y2={17} {...common} />
          <Line x1={13} y1={23} x2={21} y2={23} {...common} />
        </>
      );
      break;
    case "edit":
      shape = (
        <>
          <Path d="M5 21 19.5 6.5l4 4L9 25l-5 1Z" {...common} />
          <Path d="m17.5 8.5 4 4M4 26h20" {...common} />
        </>
      );
      break;
    case "chevron":
      shape = <Path d="m10 3 11 12-11 12" {...common} />;
      break;
  }
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 30 30"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {shape}
    </Svg>
  );
}

function SectionTitle({ children }: { children: string }) {
  const styles = useLocalStyles();
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionTitleText}>{children}</Text>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  edit,
  onPress,
}: {
  icon: IconName;
  label: string;
  value?: string;
  edit?: boolean;
  onPress: () => void;
}) {
  const styles = useLocalStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}${value ? `: ${value}` : ""}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.74 }]}
    >
      <View style={styles.rowIcon}>
        <Icon name={icon} />
      </View>
      <Text style={styles.rowLabel} numberOfLines={1}>
        {label}
      </Text>
      {value ? (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      <Icon name={edit ? "edit" : "chevron"} size={edit ? 25 : 22} />
    </Pressable>
  );
}

function SheetFrame({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const styles = useLocalStyles();
  return (
    <Modal animationType="fade" transparent visible onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined} style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ปิดหน้าต่าง"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.dialog}>
          <View style={styles.dialogHeader}>
            <Text style={styles.dialogTitle}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="ปิด" onPress={onClose} hitSlop={10}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function AccountSettingsScreen() {
  const styles = useLocalStyles();
  const theme = useAppTheme();
  const isFocused = useIsFocused();

  const { signOut: endSession } = useOnboarding();

  const { data: session } = authClient.useSession();
  const activeEmail = session?.user.email ?? null;

  const resetUserDataMutation = useMutation(settingsMutationOptions.resetUserData());
  const seedDemoDataMutation = useMutation(settingsMutationOptions.seedDemoData());
  const setSettingMutation = useMutation(settingsMutationOptions.setSetting());

  const birthDateQuery = useQuery({
    ...settingsQueryOptions.value("profile_birth_date"),
    enabled: isFocused,
  });
  const birthMonthQuery = useQuery({
    ...settingsQueryOptions.value("profile_birth_month"),
    enabled: isFocused,
  });
  const personalizationQuery = useQuery({
    ...settingsQueryOptions.value("onboarding_personalization"),
    enabled: isFocused,
  });
  const updatesQuery = useQuery({
    ...settingsQueryOptions.value("onboarding_updates"),
    enabled: isFocused,
  });

  const queries = [birthDateQuery, birthMonthQuery, personalizationQuery, updatesQuery];
  const loadError = queries.find((query) => query.data === undefined && query.error)?.error?.message;
  const loading = queries.some((query) => query.data === undefined);
  const queryError = queries.find((query) => query.error)?.error?.message;
  const birthDate = parseBirthDate(birthDateQuery.data ?? null);
  const parsedMonth = Number(birthMonthQuery.data);
  const birthMonth =
    birthMonthQuery.data && Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12 ? parsedMonth : null;
  const personalization: ConsentChoice =
    personalizationQuery.data === "yes" || personalizationQuery.data === "no" ? personalizationQuery.data : null;
  const updates: ConsentChoice = updatesQuery.data === "yes" || updatesQuery.data === "no" ? updatesQuery.data : null;

  const [birthDraft, setBirthDraft] = useState(new Date(2000, 0, 1));
  const [birthPickerOpen, setBirthPickerOpen] = useState(false);
  const [webBirthDraft, setWebBirthDraft] = useState("");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function signOut() {
    try {
      setSaving(true);
      setError(null);
      await endSession();
      setSheet(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  async function saveBirthDate(date: Date | null) {
    try {
      setSaving(true);
      await setSettingMutation.mutateAsync({
        key: "profile_birth_date",
        value: date ? birthDateKey(date) : "",
      });
      await setSettingMutation.mutateAsync({
        key: "profile_birth_month",
        value: date ? String(date.getMonth() + 1) : "",
      });
      setSheet(null);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  async function saveConsent(setting: ConsentSetting, choice: Exclude<ConsentChoice, null>) {
    try {
      setSaving(true);
      await setSettingMutation.mutateAsync({ key: `onboarding_${setting}`, value: choice });
      setSheet(null);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  function open(next: Sheet) {
    setError(null);
    setNotice(null);
    if (next === "birth") {
      const date = birthDate ?? new Date(2000, birthMonth ? birthMonth - 1 : 0, 1);
      setBirthDraft(date);
      setBirthPickerOpen(false);
      setWebBirthDraft(
        birthDate
          ? `${String(birthDate.getDate()).padStart(2, "0")}/${String(birthDate.getMonth() + 1).padStart(2, "0")}/${birthDate.getFullYear()}`
          : ""
      );
    }
    setSheet(next);
  }

  function closeEmailSheet() {
    if (saving) return;
    setSheet(null);
    setError(null);
  }

  async function addDemo() {
    try {
      setSaving(true);
      setError(null);
      const created = await seedDemoDataMutation.mutateAsync();
      setNotice(created ? "เพิ่มข้อมูลตัวอย่างแล้ว" : "มีรายการอยู่แล้ว เพิ่มข้อมูลตัวอย่างได้เฉพาะเมื่อยังไม่มีรายการ");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  async function clearData() {
    try {
      setSaving(true);
      setError(null);
      await resetUserDataMutation.mutateAsync();
      await clearLocalSlipImages(session?.user.id || "");
      // The server no longer holds these photos' identity, so they may be read again.
      if (session?.user.id) await slipScanSession.forget(session.user.id);
      if (activeEmail) await setSettingMutation.mutateAsync({ key: "profile_email", value: activeEmail });
      setNotice(`ล้างข้อมูลของ ${activeEmail ?? "บัญชีนี้"} บนเซิร์ฟเวอร์แล้ว`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  function confirmClearData() {
    const message = `รายการ หมวดหมู่ที่สร้างเอง แท็ก งบประมาณ ข้อมูลโปรไฟล์อื่น และการตั้งค่าของ ${activeEmail ?? "บัญชีนี้"} จะถูกลบ อีเมลที่ใช้งานอยู่จะยังคงเดิม การลบนี้ย้อนกลับไม่ได้`;
    if (process.env.EXPO_OS === "web") {
      if (window.confirm(`ล้างข้อมูลหมูจด?\n\n${message}`)) void clearData();
    } else {
      Alert.alert("ล้างข้อมูลหมูจด?", message, [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ล้างข้อมูล",
          style: "destructive",
          onPress: () => {
            void clearData();
          },
        },
      ]);
    }
  }

  return (
    <SettingsPage title="ข้อมูลส่วนตัว">
      <View style={styles.screen}>
        <ScrollView
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          <SectionTitle>ข้อมูลส่วนตัว</SectionTitle>
          {loading ? (
            loadError ? (
              <Pressable
                onPress={() => {
                  void birthDateQuery.refetch();
                  void birthMonthQuery.refetch();
                  void personalizationQuery.refetch();
                  void updatesQuery.refetch();
                }}
                style={{ padding: 20 }}
              >
                <Text selectable style={styles.inlineError}>
                  {loadError} · ลองอีกครั้ง
                </Text>
              </Pressable>
            ) : (
              <ActivityIndicator
                color={theme.accentText}
                style={{ paddingVertical: 35, backgroundColor: theme.surface }}
              />
            )
          ) : (
            <>
              <Row icon="email" label="อีเมล" value={activeEmail ?? "ยังไม่ระบุ"} onPress={() => open("email")} />
              <Row
                icon="calendar"
                label="วันเกิด"
                value={birthDate ? formatBirthDate(birthDate) : birthMonth ? months[birthMonth - 1] : "ยังไม่ระบุ"}
                edit
                onPress={() => open("birth")}
              />
            </>
          )}
          <View style={styles.note}>
            <Text style={styles.noteText} selectable>
              • รายการและการตั้งค่าบนเซิร์ฟเวอร์ผูกกับบัญชีที่เข้าสู่ระบบ: {activeEmail}
            </Text>
            <Text style={styles.noteText} selectable>
              • ต้องใช้รหัสผ่านของบัญชีนี้เพื่อเปิดข้อมูลบนอุปกรณ์อื่น
            </Text>
            <Text style={styles.noteText} selectable>
              • ออกจากระบบได้จากแถวอีเมลด้านบน
            </Text>
          </View>

          <SectionTitle>ความยินยอม</SectionTitle>
          {loading ? (
            loadError ? null : (
              <ActivityIndicator
                color={theme.accentText}
                style={{ paddingVertical: 35, backgroundColor: theme.surface }}
              />
            )
          ) : (
            <>
              <Row
                icon="privacy"
                label="คำแนะนำเฉพาะบุคคล"
                value={consentLabel(personalization)}
                edit
                onPress={() => open("personalization")}
              />
              <Row
                icon="email"
                label="ข่าวสารและเคล็ดลับ"
                value={consentLabel(updates)}
                edit
                onPress={() => open("updates")}
              />
            </>
          )}

          <SectionTitle>เกี่ยวกับ</SectionTitle>
          <Row icon="terms" label="ข้อตกลงและเงื่อนไข" onPress={() => open("terms")} />
          <Row icon="privacy" label="นโยบายการคุ้มครองข้อมูลส่วนบุคคล" onPress={() => open("privacy")} />
          <Row icon="data" label="การจัดการข้อมูล" onPress={() => open("data")} />
          {(error || (!loadError && queryError)) && !sheet ? (
            <Text accessibilityRole="alert" style={styles.inlineError}>
              {error ?? queryError}
            </Text>
          ) : null}
        </ScrollView>

        {sheet === "email" ? (
          <SheetFrame title="บัญชี" onClose={closeEmailSheet}>
            <Text selectable style={styles.dialogCopy}>
              กำลังใช้งานบัญชี {activeEmail}
            </Text>
            <Text style={styles.dialogCopy}>หากต้องการใช้บัญชีอื่น ให้ออกจากระบบแล้วเข้าสู่ระบบด้วยบัญชีนั้น</Text>
            {error ? (
              <Text accessibilityRole="alert" style={styles.dialogError}>
                {error}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="ออกจากระบบ"
              accessibilityState={{ disabled: saving, busy: saving }}
              disabled={saving}
              onPress={() => void signOut()}
              style={styles.saveButton}
            >
              <Text style={styles.saveText}>{saving ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}</Text>
            </Pressable>
          </SheetFrame>
        ) : null}

        {sheet === "birth" ? (
          <SheetFrame
            title="วันเกิด"
            onClose={() => {
              if (!saving) setSheet(null);
            }}
          >
            <Text style={styles.dialogCopy}>เลือกวันเกิดเพื่อแสดงในโปรไฟล์ของคุณ</Text>
            {process.env.EXPO_OS === "ios" ? (
              <DateTimePicker
                mode="date"
                display="spinner"
                value={birthDraft}
                minimumDate={new Date(1900, 0, 1)}
                maximumDate={new Date()}
                locale="th-TH"
                themeVariant="dark"
                onValueChange={(_event, date) => setBirthDraft(date)}
                style={{ height: 180 }}
              />
            ) : process.env.EXPO_OS === "web" ? (
              <TextInput
                accessibilityLabel="วันเกิด วัน เดือน ปี ค.ศ."
                value={webBirthDraft}
                onChangeText={(value) => {
                  setWebBirthDraft(value);
                  setError(null);
                }}
                keyboardType="numbers-and-punctuation"
                placeholder="วว/ดด/ปปปป (ค.ศ.)"
                placeholderTextColor={theme.muted}
                style={styles.input}
              />
            ) : null}
            {process.env.EXPO_OS === "android" ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="เลือกวันเกิด"
                accessibilityState={{ disabled: saving }}
                disabled={saving}
                onPress={() => setBirthPickerOpen(true)}
                style={styles.saveButton}
              >
                <Text style={styles.saveText}>เลือกวันเกิด</Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="บันทึกวันเกิด"
                accessibilityState={{ disabled: saving }}
                disabled={saving}
                onPress={() => {
                  const date = process.env.EXPO_OS === "ios" ? birthDraft : parseWebBirthDate(webBirthDraft);
                  if (!date || date < new Date(1900, 0, 1) || date > new Date()) {
                    setError("กรุณาใส่วันเกิดที่ถูกต้อง");
                    return;
                  }
                  void saveBirthDate(date);
                }}
                style={styles.saveButton}
              >
                <Text style={styles.saveText}>{saving ? "กำลังบันทึก…" : "บันทึกวันเกิด"}</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="ลบวันเกิด"
              accessibilityState={{ disabled: saving }}
              disabled={saving}
              onPress={() => {
                void saveBirthDate(null);
              }}
              style={styles.clearButton}
            >
              <Text style={styles.clearText}>ลบวันเกิด</Text>
            </Pressable>
            {error ? (
              <Text accessibilityRole="alert" style={styles.dialogError}>
                {error}
              </Text>
            ) : null}
          </SheetFrame>
        ) : null}
        {sheet === "birth" && birthPickerOpen && process.env.EXPO_OS === "android" ? (
          <DateTimePicker
            mode="date"
            value={birthDraft}
            minimumDate={new Date(1900, 0, 1)}
            maximumDate={new Date()}
            onValueChange={(_event, date) => {
              setBirthPickerOpen(false);
              if (date) void saveBirthDate(date);
            }}
            onDismiss={() => setBirthPickerOpen(false)}
          />
        ) : null}

        {sheet === "personalization" || sheet === "updates" ? (
          <SheetFrame
            title={sheet === "personalization" ? "คำแนะนำเฉพาะบุคคล" : "ข่าวสารและเคล็ดลับ"}
            onClose={() => setSheet(null)}
          >
            <Text style={styles.dialogCopy}>
              {sheet === "personalization"
                ? "อนุญาตให้หมูจดใช้รายการที่บันทึกเพื่อแสดงคำแนะนำเฉพาะบุคคลในอนาคตหรือไม่"
                : "ต้องการรับข่าวสารและเคล็ดลับจากหมูจดในอนาคตหรือไม่ ขณะนี้แอปยังไม่มีการส่งอีเมลข่าวสาร"}
            </Text>
            <View style={styles.consentChoices}>
              {(["yes", "no"] as const).map((choice) => {
                const selected = (sheet === "personalization" ? personalization : updates) === choice;
                const label = choice === "yes" ? "ยินยอม" : "ไม่ยินยอม";
                return (
                  <Pressable
                    key={choice}
                    accessibilityRole="radio"
                    accessibilityLabel={label}
                    accessibilityState={{ checked: selected, disabled: saving }}
                    disabled={saving}
                    onPress={() => {
                      void saveConsent(sheet, choice);
                    }}
                    style={[styles.consentChoice, selected && styles.consentChoiceSelected]}
                  >
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected ? <View style={styles.radioDot} /> : null}
                    </View>
                    <Text style={styles.consentChoiceText}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {error ? (
              <Text accessibilityRole="alert" style={styles.dialogError}>
                {error}
              </Text>
            ) : null}
          </SheetFrame>
        ) : null}

        {sheet === "terms" ? (
          <SheetFrame title="ข้อตกลงและเงื่อนไข" onClose={() => setSheet(null)}>
            <Text style={styles.dialogCopy}>
              หมูจดเป็นแอปบันทึกรายรับรายจ่ายส่วนตัว ข้อมูลและผลสรุปขึ้นอยู่กับรายการที่คุณบันทึก
              โปรดตรวจความถูกต้องของข้อมูลก่อนใช้ประกอบการตัดสินใจทางการเงิน
            </Text>
            <Text style={styles.dialogCopy}>ข้อมูลการเงินที่บันทึกจะผูกกับอีเมลบัญชีที่ใช้งานอยู่</Text>
          </SheetFrame>
        ) : null}

        {sheet === "privacy" ? (
          <SheetFrame title="ข้อมูลส่วนบุคคล" onClose={() => setSheet(null)}>
            <Text style={styles.dialogCopy}>
              รายการและข้อมูลโปรไฟล์ที่คุณบันทึกจะถูกเก็บบนเซิร์ฟเวอร์หมูจดและผูกกับอีเมลบัญชีที่ใช้งานอยู่ คุณเป็นผู้เลือกไฟล์ที่จะนำเข้า
            </Text>
            <Text style={styles.dialogCopy}>
              ไฟล์ที่คุณเลือกนำเข้าจะถูกส่งผ่านเซิร์ฟเวอร์หมูจดไปยัง Google Gemini 3.8 Flash เพื่อวิเคราะห์รายการ
              คุณต้องตรวจและยืนยันผลก่อนบันทึกเป็นธุรกรรม
            </Text>
          </SheetFrame>
        ) : null}

        {sheet === "data" ? (
          <SheetFrame title="การจัดการข้อมูล" onClose={() => setSheet(null)}>
            <Text style={styles.dialogCopy}>ส่งออกรายการเป็น CSV ได้จากเมนู “ส่งออกข้อมูล” ในหน้าพี่มนุษย์</Text>
            <Text style={styles.dialogCopy}>ควรเก็บไฟล์ส่งออกไว้ในที่ปลอดภัยเพื่อสำรองข้อมูล</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="เพิ่มข้อมูลตัวอย่าง"
              accessibilityState={{ disabled: saving }}
              disabled={saving}
              onPress={() => {
                void addDemo();
              }}
              style={styles.saveButton}
            >
              <Text style={styles.saveText}>เพิ่มข้อมูลตัวอย่าง</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="ล้างข้อมูลทั้งหมด"
              accessibilityState={{ disabled: saving }}
              disabled={saving}
              onPress={confirmClearData}
              style={styles.clearDataButton}
            >
              <Text style={styles.clearDataText}>ล้างข้อมูลทั้งหมด</Text>
            </Pressable>
            {notice ? (
              <Text accessibilityRole="alert" style={styles.dialogNotice}>
                {notice}
              </Text>
            ) : null}
            {error ? (
              <Text accessibilityRole="alert" style={styles.dialogError}>
                {error}
              </Text>
            ) : null}
          </SheetFrame>
        ) : null}
      </View>
    </SettingsPage>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 80 },
    sectionTitle: {
      minHeight: 76,
      backgroundColor: theme.background,
      justifyContent: "flex-end",
      paddingHorizontal: 17,
      paddingTop: 20,
      paddingBottom: 18,
    },
    sectionTitleText: { color: theme.text, fontSize: 18, lineHeight: 24, fontWeight: "800" },
    row: {
      minHeight: 57,
      backgroundColor: theme.surface,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 17,
      gap: 11,
    },
    rowIcon: { width: 27, alignItems: "center" },
    rowLabel: { flex: 1, color: theme.muted, fontSize: 17, lineHeight: 24 },
    rowValue: {
      maxWidth: "39%",
      color: theme.text,
      fontSize: 17,
      lineHeight: 24,
      textAlign: "right",
    },
    note: {
      minHeight: 105,
      backgroundColor: theme.background,
      paddingHorizontal: 24,
      paddingTop: 17,
      paddingBottom: 13,
      gap: 2,
    },
    noteText: { color: theme.muted, fontSize: 15, lineHeight: 23 },
    inlineError: { color: theme.dangerText, fontSize: 14, textAlign: "center", padding: 20 },
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, .58)",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    },
    dialog: {
      backgroundColor: theme.raised,
      width: "100%",
      maxWidth: 440,
      borderRadius: 20,
      padding: 19,
      gap: 15,
    },
    dialogHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    dialogTitle: { color: theme.text, fontSize: 20, lineHeight: 27, fontWeight: "800", flex: 1 },
    closeText: { color: theme.text, fontSize: 31, lineHeight: 31 },
    dialogCopy: { color: theme.muted, fontSize: 15, lineHeight: 25 },
    dialogError: { color: theme.dangerText, fontSize: 14, lineHeight: 20 },
    input: {
      minHeight: 50,
      borderRadius: 12,
      backgroundColor: theme.surface,
      color: theme.text,
      fontSize: 17,
      paddingHorizontal: 14,
    },
    saveButton: {
      minHeight: 50,
      backgroundColor: theme.accent,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
    },
    saveText: { color: theme.onAccent, fontSize: 17, fontWeight: "800" },
    consentChoices: { flexDirection: "row", gap: 10 },
    consentChoice: {
      flex: 1,
      minHeight: 49,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.muted,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
    },
    consentChoiceSelected: { borderColor: theme.accent, backgroundColor: theme.surface },
    consentChoiceText: { color: theme.text, fontSize: 16, fontWeight: "700" },
    radio: {
      width: 21,
      height: 21,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    radioSelected: { borderColor: theme.accent },
    radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: theme.accent },
    clearButton: { alignSelf: "center", paddingHorizontal: 15, paddingVertical: 6 },
    clearText: { color: theme.accentText, fontSize: 14, fontWeight: "700" },
    clearDataButton: {
      minHeight: 49,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    clearDataText: { color: theme.raised, fontSize: 16, fontWeight: "800" },
    dialogNotice: { color: theme.successText, fontSize: 14, lineHeight: 20 },
  });
}

function useLocalStyles() {
  const theme = useAppTheme();
  return useMemo(() => createStyles(theme), [theme]);
}

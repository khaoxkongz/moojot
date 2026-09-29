import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, View } from "react-native";

import { OnboardingIllustration } from "@/components/ui/onboarding-illustrations";
import { Text, TextInput } from "@/components/ui/typography";
import { Footer, Header, Page } from "@/features/onboarding/components/onboarding-controls";
import { formatBirthDate } from "@/features/onboarding/date";
import { useOnboardingFlow } from "@/features/onboarding/flow-context";
import { useAppTheme } from "@/lib/use-app-theme";

export default function OnboardingBirthdayRoute() {
  const theme = useAppTheme();
  const router = useRouter();
  const { birthDate, setBirthDate } = useOnboardingFlow();
  const [birthDraft, setBirthDraft] = useState(new Date(2000, 0, 1));
  const [birthPickerOpen, setBirthPickerOpen] = useState(false);
  const [birthdayConfirmationOpen, setBirthdayConfirmationOpen] = useState(false);
  const [webBirthDraft, setWebBirthDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function confirmBirthdayOrContinue() {
    if (birthDate) setBirthdayConfirmationOpen(true);
    else router.push("/onboarding/greeting");
  }

  function saveWebBirthDraft() {
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(webBirthDraft.trim());
    if (!match) {
      setError("กรุณาใส่วันเกิดในรูปแบบ วว/ดด/ปปปป (ค.ศ.)");
      return;
    }
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day ||
      date > new Date() ||
      year < 1900
    ) {
      setError("วันเกิดไม่ถูกต้อง");
      return;
    }
    setBirthDate(date);
    setBirthPickerOpen(false);
    setError(null);
  }

  return (
    <Page backgroundColor={theme.background}>
      <Header title="ข้อมูลส่วนตัว" onBack={() => router.back()} />
      <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 30, gap: 22 }}>
        <Text style={{ color: theme.text, fontSize: 23, fontWeight: "700" }}>พี่มนุษย์เกิดวันไหนนะ?</Text>
        <Text style={{ color: theme.muted, fontSize: 17, lineHeight: 27 }}>บอกวันเกิดเพื่อเก็บไว้ในโปรไฟล์ ข้ามขั้นตอนนี้ได้</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="เลือกวันเกิด"
          onPress={() => {
            setBirthDraft(birthDate ?? new Date(2000, 0, 1));
            setBirthPickerOpen(true);
          }}
          style={{
            backgroundColor: theme.surface,
            borderRadius: 12,
            minHeight: 73,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            gap: 17,
          }}
        >
          <MaterialCommunityIcons
            name="calendar-month-outline"
            size={28}
            color={birthDate ? theme.text : theme.muted}
          />
          <Text
            style={{
              color: birthDate ? theme.text : theme.muted,
              fontSize: 19,
              fontWeight: "700",
            }}
          >
            {birthDate ? formatBirthDate(birthDate) : "ใส่วันเกิด"}
          </Text>
        </Pressable>
      </View>
      <Footer
        label="ต่อไป"
        onPress={confirmBirthdayOrContinue}
        white={false}
        extra={
          !birthDate ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/onboarding/greeting")}
              style={{ alignItems: "center", padding: 5 }}
            >
              <Text style={{ color: theme.muted, fontSize: 15 }}>ข้ามก่อน</Text>
            </Pressable>
          ) : undefined
        }
      />
      <Modal
        transparent
        animationType="fade"
        visible={birthdayConfirmationOpen}
        onRequestClose={() => setBirthdayConfirmationOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, .62)",
            justifyContent: "center",
            paddingHorizontal: 16,
          }}
        >
          <View style={{ backgroundColor: theme.raised, borderRadius: 22, overflow: "hidden" }}>
            <View
              style={{
                backgroundColor: theme.accent,
                alignItems: "center",
                paddingTop: 15,
                paddingBottom: 2,
              }}
            >
              <OnboardingIllustration variant="logo" size={135} />
            </View>
            <View
              style={{
                paddingHorizontal: 20,
                paddingTop: 22,
                paddingBottom: 24,
                gap: 12,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: theme.text,
                  fontSize: 22,
                  fontWeight: "800",
                  textAlign: "center",
                }}
              >
                เช็กข้อมูลก่อนนะ
              </Text>
              <Text
                style={{
                  color: theme.accentText,
                  fontSize: 19,
                  fontWeight: "800",
                  textAlign: "center",
                }}
              >
                วันเกิด: {birthDate ? formatBirthDate(birthDate) : ""}
              </Text>
              <Text style={{ color: theme.text, fontSize: 16, lineHeight: 24, textAlign: "center" }}>
                ถ้าวันเกิดไม่ถูกต้อง ย้อนกลับไปเลือกใหม่ได้
              </Text>
              <View style={{ flexDirection: "row", width: "100%", gap: 10, marginTop: 15 }}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setBirthdayConfirmationOpen(false)}
                  style={{
                    flex: 1,
                    borderRadius: 999,
                    borderWidth: 1.5,
                    borderColor: theme.accentText,
                    padding: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: theme.accentText, fontSize: 17, fontWeight: "800" }}>ย้อนกลับ</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setBirthdayConfirmationOpen(false);
                    router.push("/onboarding/greeting");
                  }}
                  style={{
                    flex: 1,
                    borderRadius: 999,
                    backgroundColor: theme.accent,
                    padding: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: theme.onAccent, fontSize: 17, fontWeight: "800" }}>ยืนยัน</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      {birthPickerOpen && process.env.EXPO_OS === "ios" ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setBirthPickerOpen(false)}>
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,.58)",
              justifyContent: "center",
              paddingHorizontal: 16,
            }}
          >
            <View style={{ backgroundColor: theme.raised, borderRadius: 20, padding: 20, gap: 17 }}>
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: "800" }}>ใส่วันเกิด</Text>
              <DateTimePicker
                mode="date"
                display="spinner"
                value={birthDraft}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
                locale="th-TH"
                themeVariant="dark"
                onValueChange={(_event, date) => setBirthDraft(date)}
                style={{ height: 180 }}
              />
              <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 20 }}>
                <Pressable accessibilityRole="button" onPress={() => setBirthPickerOpen(false)}>
                  <Text style={{ color: theme.accentText, fontSize: 17, fontWeight: "700" }}>ยกเลิก</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setBirthDate(birthDraft);
                    setBirthPickerOpen(false);
                  }}
                >
                  <Text style={{ color: theme.accentText, fontSize: 17, fontWeight: "700" }}>เลือก</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
      {birthPickerOpen && process.env.EXPO_OS === "android" ? (
        <DateTimePicker
          mode="date"
          value={birthDraft}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
          onValueChange={(_event, date) => {
            setBirthDate(date);
            setBirthPickerOpen(false);
          }}
          onDismiss={() => setBirthPickerOpen(false)}
        />
      ) : null}
      {birthPickerOpen && process.env.EXPO_OS === "web" ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setBirthPickerOpen(false)}>
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,.58)",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <View style={{ backgroundColor: theme.raised, borderRadius: 20, padding: 20, gap: 16 }}>
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: "800" }}>ใส่วันเกิด</Text>
              <TextInput
                accessibilityLabel="วันเกิด วัน เดือน ปี ค.ศ."
                placeholder="วว/ดด/ปปปป (ค.ศ.)"
                placeholderTextColor={theme.muted}
                value={webBirthDraft}
                onChangeText={setWebBirthDraft}
                keyboardType="numbers-and-punctuation"
                style={{
                  backgroundColor: theme.surface,
                  color: theme.text,
                  minHeight: 50,
                  paddingHorizontal: 15,
                  borderRadius: 10,
                }}
              />
              {error ? (
                <Text accessibilityRole="alert" style={{ color: theme.dangerText }}>
                  {error}
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 20 }}>
                <Pressable accessibilityRole="button" onPress={() => setBirthPickerOpen(false)}>
                  <Text style={{ color: theme.accentText }}>ยกเลิก</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={saveWebBirthDraft}>
                  <Text style={{ color: theme.accentText }}>เลือก</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </Page>
  );
}

import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { RowIcon } from "@/components/ui/controls";
import { Text } from "@/components/ui/typography";
import { radius, raisedRing, touch } from "@/constants/theme";
import { birthdayLabel } from "@/features/settings/birthday";
import { BirthdaySheet } from "@/features/settings/components/birthday-sheet";
import type { ConsentSetting } from "@/features/settings/profile-values";
import { useAppTheme } from "@/lib/use-app-theme";

import { goNext, setBirthDate, toggleConsent } from "../onboarding-flow";
import { useOnboarding } from "../onboarding-context";
import { StepBody, StepButton, StepFooter, StepTitle } from "./step-parts";

const CONSENTS: { setting: ConsentSetting; title: string; sub: string }[] = [
  {
    setting: "personalization",
    title: "ให้หมูจดใช้ข้อมูลรายการเพื่อแสดงคำแนะนำที่ตรงกับพี่มนุษย์",
    sub: "ไม่มีผลต่อการจดรายจ่าย",
  },
  { setting: "updates", title: "รับข่าวสารและเคล็ดลับจากหมูจด", sub: "ตอนนี้ยังไม่มีการส่งอีเมลข่าวสารจากแอป" },
];

function SectionLabel({ children }: { children: string }) {
  const theme = useAppTheme();
  return <Text style={{ marginTop: 20, color: theme.muted, fontSize: 13, lineHeight: 18 }}>{children}</Text>;
}

/** The handoff's 51×31 switch drawn inside its row, so the whole row is one target. */
function SwitchMark({ on }: { on: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={{ width: 51, height: 31, borderRadius: 16, backgroundColor: on ? theme.accent : theme.border }}>
      <View
        style={{
          position: "absolute",
          top: 2,
          left: on ? 22 : 2,
          width: 27,
          height: 27,
          borderRadius: 14,
          backgroundColor: "#FFFFFF",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        }}
      />
    </View>
  );
}

/** Step 4: the optional birthday and the two consent switches. The profile shows and changes the same values. */
export function ExtrasStep() {
  const theme = useAppTheme();
  const { flow, update } = useOnboarding();
  const [birthdayOpen, setBirthdayOpen] = useState(false);
  const card = [{ marginTop: 6, borderRadius: radius.card, backgroundColor: theme.surface }, raisedRing(theme)];

  return (
    <>
      {/* The handoff pads this step 8 on top; the title's own 8 gives the same gap. */}
      <StepBody style={{ paddingTop: 0 }}>
        <StepTitle title="อีกนิดเดียว" sub="ขั้นนี้ไม่ใส่ก็ได้ เปลี่ยนทีหลังได้ในหน้าพี่มนุษย์" />
        <SectionLabel>ข้อมูลส่วนตัว</SectionLabel>
        <View style={[...card, { flexDirection: "row", alignItems: "center" }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`พี่มนุษย์เกิดวันไหนนะ? ${flow.birthDate ? birthdayLabel(flow.birthDate) : "ใส่วันเกิด"}`}
            onPress={() => setBirthdayOpen(true)}
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 68,
              paddingVertical: 10,
              paddingHorizontal: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <RowIcon icon="cake-variant-outline" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 17 }}>พี่มนุษย์เกิดวันไหนนะ?</Text>
              <Text style={{ color: flow.birthDate ? theme.text : theme.accentText, fontSize: 15, lineHeight: 21 }}>
                {flow.birthDate ? birthdayLabel(flow.birthDate) : "ใส่วันเกิด"}
              </Text>
            </View>
          </Pressable>
          {flow.birthDate ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="ล้างวันเกิด"
              onPress={() => update((current) => setBirthDate(current, null))}
              style={{ minHeight: touch.min, marginRight: 6, paddingHorizontal: 10, justifyContent: "center" }}
            >
              <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 20 }}>ล้าง</Text>
            </Pressable>
          ) : (
            <MaterialCommunityIcons name="chevron-right" size={22} color={theme.muted} style={{ marginRight: 12 }} />
          )}
        </View>
        <SectionLabel>พี่มนุษย์อนุญาตไหม?</SectionLabel>
        <View style={[...card, { overflow: "hidden" }]}>
          {CONSENTS.map((consent, index) => {
            const on = flow.consents[consent.setting];
            return (
              <Pressable
                key={consent.setting}
                role="switch"
                aria-checked={on}
                accessibilityLabel={consent.title}
                accessibilityHint={consent.sub}
                onPress={() => update((current) => toggleConsent(current, consent.setting))}
                style={({ pressed }) => ({
                  minHeight: 72,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  backgroundColor: pressed ? theme.raised : "transparent",
                })}
              >
                {index > 0 ? (
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 14,
                      right: 0,
                      height: 1,
                      backgroundColor: theme.raised,
                    }}
                  />
                ) : null}
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={{ color: theme.text, fontSize: 15, lineHeight: 22 }}>{consent.title}</Text>
                  <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 17 }}>{consent.sub}</Text>
                </View>
                <SwitchMark on={on} />
              </Pressable>
            );
          })}
        </View>
      </StepBody>
      <StepFooter>
        <StepButton label="ต่อไป" onPress={() => update(goNext)} testID="onboarding-next" />
      </StepFooter>
      <BirthdaySheet
        visible={birthdayOpen}
        value={flow.birthDate}
        onClose={() => setBirthdayOpen(false)}
        onPick={(birthDate) => {
          update((current) => setBirthDate(current, birthDate));
          setBirthdayOpen(false);
        }}
      />
    </>
  );
}

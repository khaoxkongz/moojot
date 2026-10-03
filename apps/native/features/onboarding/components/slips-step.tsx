import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useState } from "react";
import { Linking, Pressable, View } from "react-native";

import { OnboardingIllustration } from "@/components/ui/onboarding-illustrations";
import { Text } from "@/components/ui/typography";
import { radius, raisedRing, touch } from "@/constants/theme";
import { useAppTheme } from "@/lib/use-app-theme";

import { SLIP_HOW, SLIP_INFO } from "../onboarding-copy";
import { goNext } from "../onboarding-flow";
import { useOnboarding } from "../onboarding-context";
import { slipAlbumRows, type PhotoStepState } from "../photo-step";
import { InfoSheet } from "./info-sheet";
import { IconLineRow, InfoLink, StepBody, StepButton, StepFooter, StepTitle } from "./step-parts";

function slipTitle(photo: PhotoStepState) {
  if (photo.status === "counted") return `เจอ ${photo.total} รูปในอัลบั้มสลิป`;
  if (photo.status === "counting") return "กำลังนับรูปในอัลบั้ม…";
  return "หมูจดช่วยอ่านสลิปได้";
}

/** The note under the albums when the step cannot count them, with what the person can do about it. */
function photoNote(photo: PhotoStepState): { title: string; action: "settings" | "retry" | null } | null {
  switch (photo.status) {
    case "limited":
      return { title: "ต้องอนุญาตให้เข้าถึงรูปภาพทั้งหมด จึงจะค้นหาอัลบั้มได้", action: "settings" };
    case "denied":
      return { title: "ยังไม่ได้รับสิทธิ์เข้าถึงรูปภาพทั้งหมด", action: "settings" };
    case "failed":
      return { title: `นับรูปในอัลบั้มไม่สำเร็จ: ${photo.message}`, action: "retry" };
    case "unsupported":
      return { title: "เครื่องนี้ไม่มีคลังรูปให้หมูอ่าน", action: null };
    default:
      return null;
  }
}

/**
 * Step 2: what slip reading does, before any system prompt. "อนุญาตและค้นหาสลิป" shows the prompt and counts the
 * bank albums; "ข้ามไปก่อน" goes on without photos. Nothing here reads a photo: Home does, after setup.
 */
export function SlipsStep() {
  const theme = useAppTheme();
  const { update, photoStep, photo } = useOnboarding();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [settingsError, setSettingsError] = useState(false);
  const asking = photo.status === "ask" || photo.status === "skipped";
  const busy = photo.status === "counting" || photo.status === "checking";
  const note = photoNote(photo);

  const primary = () => {
    if (asking) void photoStep.allow();
    else if (!busy) update(goNext);
  };

  return (
    <>
      <StepBody>
        <View style={{ height: 140 }}>
          <OnboardingIllustration variant="slips" height={140} />
          {photo.status === "counted" ? (
            <View
              style={{
                position: "absolute",
                top: 2,
                left: "50%",
                marginLeft: 56,
                minWidth: 50,
                height: 34,
                paddingHorizontal: 12,
                borderRadius: 17,
                backgroundColor: theme.accent,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: theme.onAccent,
                  fontSize: 19,
                  lineHeight: 24,
                  fontVariant: ["tabular-nums"],
                  fontWeight: "400",
                }}
              >
                {photo.total}
              </Text>
            </View>
          ) : null}
        </View>
        <StepTitle title={slipTitle(photo)} />
        <View style={{ marginTop: 12, gap: 10 }}>
          {SLIP_HOW.map((line) => (
            <IconLineRow key={line.key} line={line} />
          ))}
        </View>
        <Text style={{ marginTop: 18, color: theme.muted, fontSize: 13, lineHeight: 18 }}>อัลบั้มที่หมูอ่านได้</Text>
        <View
          style={[
            { marginTop: 6, borderRadius: radius.card, overflow: "hidden", backgroundColor: theme.surface },
            raisedRing(theme),
          ]}
        >
          {slipAlbumRows(photo).map((album, index) => (
            <View
              key={album.id}
              accessible
              accessibilityLabel={album.count ? `${album.name} ${album.count}` : album.name}
              style={{
                minHeight: 50,
                paddingVertical: 8,
                paddingHorizontal: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              {index > 0 ? (
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 50,
                    right: 0,
                    height: 1,
                    backgroundColor: theme.raised,
                  }}
                />
              ) : null}
              <View style={{ width: 24, alignItems: "center" }}>
                <MaterialCommunityIcons name={album.icon} size={20} color={theme.muted} />
              </View>
              <Text style={{ flex: 1, color: theme.text, fontSize: 15, lineHeight: 21 }}>{album.name}</Text>
              <Text style={{ color: album.found ? theme.text : theme.muted, fontSize: 13, lineHeight: 18 }}>
                {album.count}
              </Text>
            </View>
          ))}
        </View>
        {note ? (
          <View
            style={{
              marginTop: 12,
              paddingTop: 12,
              paddingHorizontal: 14,
              paddingBottom: note.action ? 4 : 12,
              borderRadius: radius.tile,
              backgroundColor: theme.raised,
            }}
          >
            <Text style={{ color: theme.text, fontSize: 14, lineHeight: 21 }}>{note.title}</Text>
            <Text style={{ marginTop: 2, color: theme.muted, fontSize: 13, lineHeight: 20 }}>
              ไปต่อได้เลย จดรายการเองได้ตามปกติ และเปิดสิทธิ์ภายหลังจากหน้าแรกได้
            </Text>
            {settingsError ? (
              <Text
                accessibilityRole="alert"
                style={{ marginTop: 4, color: theme.danger, fontSize: 13, lineHeight: 19 }}
              >
                เปิดการตั้งค่าไม่สำเร็จ เปิดแอปการตั้งค่าของเครื่องแล้วเลือกหมูจด
              </Text>
            ) : null}
            {note.action ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (note.action === "retry") return void photoStep.check();
                  setSettingsError(false);
                  Linking.openSettings().catch(() => setSettingsError(true));
                }}
                style={({ pressed }) => ({
                  minHeight: touch.min,
                  alignSelf: "flex-start",
                  justifyContent: "center",
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text style={{ color: theme.accentText, fontSize: 14, lineHeight: 20 }}>
                  {note.action === "retry" ? "ลองอีกครั้ง" : "เปิดการตั้งค่ารูปภาพ"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        <InfoLink icon="information-outline" label="หมูจดอ่านสลิปอะไรได้บ้าง?" onPress={() => setSheetOpen(true)} />
      </StepBody>
      <StepFooter bottom={8}>
        {asking ? (
          <Text style={{ marginBottom: 8, color: theme.muted, fontSize: 13, lineHeight: 20, textAlign: "center" }}>
            เครื่องจะถามต่อ ให้เลือก “อนุญาตให้เข้าถึงทั้งหมด”
          </Text>
        ) : null}
        <StepButton
          label={asking ? "อนุญาตและค้นหาสลิป" : "ต่อไป"}
          busy={busy}
          busyLabel={photo.status === "checking" ? "กำลังตรวจสิทธิ์รูปภาพ…" : "กำลังนับรูป…"}
          onPress={primary}
          testID="onboarding-next"
        />
        {asking ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              photoStep.skip();
              update(goNext);
            }}
            style={({ pressed }) => ({
              marginTop: 2,
              minHeight: touch.min,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ color: theme.muted, fontSize: 15, lineHeight: 21 }}>ข้ามไปก่อน</Text>
          </Pressable>
        ) : null}
      </StepFooter>
      <InfoSheet
        title="หมูจดอ่านสลิปอะไรได้บ้าง?"
        sections={SLIP_INFO}
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}

import { useMutation } from "@tanstack/react-query";
import { File, Paths } from "expo-file-system";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import { Text } from "@/components/ui/typography";
import { useAppTheme } from "@/lib/use-app-theme";
import { entriesMutationOptions } from "@/features/entries/mutation-options";
import { errorMessage } from "@/utils/format";

type IconName =
  | "account"
  | "grid"
  | "tag"
  | "card"
  | "export"
  | "calendar"
  | "theme"
  | "language"
  | "book"
  | "help"
  | "slip"
  | "statement"
  | "facebook"
  | "line"
  | "support"
  | "messenger"
  | "plan"
  | "streak"
  | "repeat"
  | "import";
function RowIcon({ name }: { name: IconName }) {
  const theme = useAppTheme();
  if (name === "facebook" || name === "line" || name === "messenger") {
    return (
      <View
        style={{
          width: 29,
          height: 29,
          borderRadius: 15,
          backgroundColor: theme.muted,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            color: theme.surface,
            fontSize: name === "line" ? 8 : 23,
            lineHeight: name === "line" ? 12 : 27,
            fontWeight: "900",
          }}
        >
          {name === "facebook" ? "f" : name === "line" ? "LINE" : "⌁"}
        </Text>
      </View>
    );
  }
  const p = {
    fill: "none",
    stroke: theme.muted,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  let glyph: React.ReactNode;
  switch (name) {
    case "account":
      glyph = (
        <>
          <Circle cx={15} cy={15} r={12} {...p} />
          <Circle cx={15} cy={10.5} r={4} {...p} />
          <Path d="M5.4 22.2c2.5-4.2 5.6-5.2 9.6-5.2s7.1 1 9.6 5.2" {...p} />
        </>
      );
      break;
    case "grid":
      glyph = (
        <>
          <Rect x={2.5} y={2.5} width={10} height={10} rx={1} {...p} />
          <Rect x={17.5} y={2.5} width={10} height={10} rx={1} {...p} />
          <Rect x={2.5} y={17.5} width={10} height={10} rx={1} {...p} />
          <Rect x={17.5} y={17.5} width={10} height={10} rx={1} {...p} />
        </>
      );
      break;
    case "tag":
      glyph = (
        <>
          <Line x1={9} y1={2} x2={5} y2={28} {...p} />
          <Line x1={22} y1={2} x2={18} y2={28} {...p} />
          <Line x1={2} y1={11} x2={28} y2={11} {...p} />
          <Line x1={1} y1={21} x2={27} y2={21} {...p} />
        </>
      );
      break;
    case "card":
      glyph = (
        <>
          <Rect x={2.5} y={5} width={25} height={20} rx={3} {...p} />
          <Line x1={3} y1={12} x2={27} y2={12} {...p} />
          <Line x1={7} y1={20} x2={15} y2={20} {...p} />
        </>
      );
      break;
    case "export":
      glyph = (
        <>
          <Path d="M4 18v8h22v-8M15 22V3m0 0L8 10m7-7 7 7" {...p} />
        </>
      );
      break;
    case "calendar":
      glyph = (
        <>
          <Rect x={3} y={6} width={24} height={21} rx={2} {...p} />
          <Line x1={3} y1={13} x2={27} y2={13} {...p} />
          <Line x1={9} y1={2} x2={9} y2={9} {...p} />
          <Line x1={21} y1={2} x2={21} y2={9} {...p} />
        </>
      );
      break;
    case "theme":
      glyph = (
        <>
          <Path d="m4 21 11-14 8 6-11 14c-1 1-3 1-4 0l-4-3c-1-1-1-2 0-3Z" {...p} />
          <Line x1={13} y1={10} x2={20} y2={15} {...p} />
          <Path d="M22 4c2 1 3 3 3 5" {...p} />
        </>
      );
      break;
    case "language":
      glyph = (
        <>
          <Path d="M3 9c2-5 10-5 12 0 1 3-1 5-4 7l-1 4M18 26l5-14 5 14m-8-5h6" {...p} />
        </>
      );
      break;
    case "book":
      glyph = (
        <>
          <Path d="M5 4h21v22H6c-2 0-3-1-3-3V7c0-2 1-3 2-3Zm-1 17c2-1 3-1 5-1h17" {...p} />
          <Line x1={9} y1={9} x2={20} y2={9} {...p} />
        </>
      );
      break;
    case "help":
      glyph = (
        <>
          <Circle cx={15} cy={15} r={12} {...p} />
          <Path d="M11 11c0-2 2-4 4-4 3 0 5 2 5 5 0 2-1 3-4 5v2" {...p} />
          <Circle cx={16} cy={23} r={1} fill={theme.muted} />
        </>
      );
      break;
    case "slip":
      glyph = (
        <>
          <Path d="M4 3h22v24H4V3Z" {...p} />
          <Line x1={9} y1={9} x2={21} y2={9} {...p} />
          <Line x1={9} y1={15} x2={21} y2={15} {...p} />
          <Line x1={9} y1={21} x2={18} y2={21} {...p} />
        </>
      );
      break;
    case "statement":
      glyph = (
        <>
          <Path d="M5 3h15l5 5v19H5V3Zm15 0v6h5" {...p} />
          <Line x1={9} y1={13} x2={20} y2={13} {...p} />
          <Line x1={9} y1={18} x2={20} y2={18} {...p} />
          <Line x1={9} y1={23} x2={17} y2={23} {...p} />
        </>
      );
      break;
    case "support":
      glyph = (
        <>
          <Path d="M4 3h22v24H4V3ZM8 11h13M8 17h13M8 22h8" {...p} />
          <Line x1={2} y1={28} x2={28} y2={2} {...p} />
        </>
      );
      break;
    case "plan":
      glyph = (
        <>
          <Circle cx={15} cy={15} r={12} {...p} />
          <Circle cx={15} cy={15} r={7} {...p} />
          <Circle cx={15} cy={15} r={2} fill={theme.muted} />
        </>
      );
      break;
    case "streak":
      glyph = (
        <>
          <Path d="M15 2c3 6 9 8 9 16a9 9 0 0 1-18 0c0-5 4-9 9-16Z" {...p} />
          <Path d="M15 13c2 3 4 5 4 8a4 4 0 0 1-8 0c0-3 2-5 4-8Z" {...p} />
        </>
      );
      break;
    case "repeat":
      glyph = (
        <>
          <Path d="M25 11c-1-5-5-8-10-8-4 0-7 2-9 5M5 2v6h6M5 19c1 5 5 8 10 8 4 0 7-2 9-5m1 6v-6h-6" {...p} />
        </>
      );
      break;
    case "import":
      glyph = (
        <>
          <Rect x={4} y={18} width={22} height={9} rx={2} {...p} />
          <Path d="M15 3v17m0 0-7-7m7 7 7-7" {...p} />
        </>
      );
      break;
  }
  return (
    <Svg width={29} height={29} viewBox="0 0 30 30">
      {glyph}
    </Svg>
  );
}

function SectionTitle({ children }: { children: string }) {
  const theme = useAppTheme();
  return (
    <View
      style={{
        minHeight: 69,
        backgroundColor: theme.background,
        justifyContent: "flex-end",
        paddingHorizontal: 17,
        paddingTop: 22,
        paddingBottom: 16,
      }}
    >
      <Text style={{ color: theme.text, fontSize: 17, fontWeight: "900" }}>{children}</Text>
    </View>
  );
}

function SettingsRow({
  icon,
  title,
  onPress,
  isNew = false,
  unavailable = false,
}: {
  icon: IconName;
  title: string;
  onPress?: () => void;
  isNew?: boolean;
  unavailable?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title + (unavailable ? " ยังไม่มีช่องทางนี้" : "")}
      accessibilityState={{ disabled: unavailable }}
      disabled={unavailable || !onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 58,
        backgroundColor: theme.surface,
        paddingHorizontal: 17,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <View style={{ width: 31, alignItems: "center" }}>
        <RowIcon name={icon} />
      </View>
      <Text numberOfLines={1} style={{ flex: 1, color: theme.muted, fontSize: 16 }}>
        {title}
        {isNew ? <Text style={{ color: theme.accentText, fontSize: 13 }}> ใหม่</Text> : null}
      </Text>
      {unavailable ? (
        <Text style={{ color: theme.muted, fontSize: 10 }}>เร็ว ๆ นี้</Text>
      ) : (
        <Svg width={17} height={28} viewBox="0 0 17 28">
          <Path
            d="m2 2 12 12L2 26"
            fill="none"
            stroke={theme.muted}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const exportTransactionsCsvMutation = useMutation(entriesMutationOptions.exportCsv());

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [extraOpen, setExtraOpen] = useState(false);

  async function exportCsv() {
    if (busy) return;
    try {
      setBusy(true);
      setNotice(null);
      const csv = await exportTransactionsCsvMutation.mutateAsync({});
      const filename = "moojot-" + new Date().toISOString().slice(0, 10) + ".csv";
      if (process.env.EXPO_OS === "web") {
        const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        if (!(await Sharing.isAvailableAsync())) throw new Error("อุปกรณ์นี้ยังไม่รองรับการแชร์ไฟล์");
        const file = new File(Paths.cache, filename);
        file.create({ overwrite: true });
        file.write("\uFEFF" + csv);
        await Sharing.shareAsync(file.uri, {
          mimeType: "text/csv",
          UTI: "public.comma-separated-values-text",
          dialogTitle: "ส่งออกรายการหมูจด",
        });
      }
      setNotice("ส่งออกข้อมูลเรียบร้อย");
    } catch (cause) {
      setNotice(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 20 }}
      >
        <View
          style={{
            height: Math.max(260, insets.top + 217),
            backgroundColor: theme.accent,
            paddingTop: Math.max(insets.top, 30) + 23,
            paddingHorizontal: 17,
          }}
        >
          <View style={{ width: "100%", maxWidth: 680, alignSelf: "center" }}>
            <Text
              style={{
                maxWidth: "61%",
                color: theme.onAccent,
                fontSize: 21,
                fontWeight: "900",
                lineHeight: 29,
              }}
            >
              สวัสดี พี่มนุษย์!
            </Text>
            <Text style={{ maxWidth: "59%", color: theme.onAccent, fontSize: 16, lineHeight: 24, paddingTop: 9 }}>
              มาช่วยกันดูแลการใช้จ่าย{"\n"}กันเถอะ หมู~
            </Text>
            <Image
              source={require("../../../assets/generated/profile-greeting.png")}
              contentFit="contain"
              accessibilityLabel="น้องหมูถือปากกาพร้อมช่วยจดรายจ่าย"
              style={{ position: "absolute", right: -12, top: -9, width: 276, height: 184 }}
            />
          </View>
        </View>

        <View style={{ width: "100%", maxWidth: 680, alignSelf: "center" }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ดูข้อมูลแอปและเพิ่มข้อมูลตัวอย่าง"
            onPress={() => router.push("/settings/account")}
            style={{
              marginTop: -49,
              marginHorizontal: 16,
              minHeight: 109,
              borderRadius: 20,
              backgroundColor: theme.raised,
              flexDirection: "row",
              alignItems: "center",
              paddingRight: 16,
              overflow: "hidden",
            }}
          >
            <Image
              source={require("../../../assets/generated/profile-trial.png")}
              contentFit="contain"
              accessibilityLabel="น้องหมูโผล่ออกมาจากกล่อง"
              style={{ position: "absolute", left: -4, top: -4, width: 248, height: 124 }}
            />
            <View style={{ flex: 1, gap: 4, marginLeft: 130 }}>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}>ลองใช้หมูจดให้เต็มที่</Text>
              <Text style={{ color: theme.accentText, fontSize: 16, fontWeight: "700" }}>เพิ่มข้อมูลตัวอย่าง</Text>
            </View>
          </Pressable>

          <SectionTitle>ตั้งค่าการใช้งาน</SectionTitle>
          <SettingsRow icon="account" title="ข้อมูลในแอป" onPress={() => router.push("/settings/account")} />

          <SectionTitle>รายการ</SectionTitle>
          <SettingsRow icon="grid" title="จัดการหมวดหมู่" onPress={() => router.push("/categories")} />
          <SettingsRow icon="tag" title="จัดการแท็ก" onPress={() => router.push("/tags")} />
          <SettingsRow icon="card" title="จัดการบัตรเครดิต" isNew onPress={() => router.push("/settings/cards")} />
          <SettingsRow
            icon="export"
            title={busy ? "กำลังส่งออกข้อมูล…" : "ส่งออกข้อมูล"}
            onPress={() => {
              void exportCsv();
            }}
          />
          {notice ? (
            <View style={{ backgroundColor: theme.surface, paddingHorizontal: 19, paddingBottom: 12 }}>
              <Text selectable style={{ color: theme.accentText, fontSize: 12 }}>
                {notice}
              </Text>
            </View>
          ) : null}

          <SectionTitle>การแสดงผล</SectionTitle>
          <SettingsRow icon="calendar" title="ตั้งค่าปฏิทิน" onPress={() => router.push("/settings/calendar")} />
          <SettingsRow icon="theme" title="ธีม" onPress={() => router.push("/settings/theme")} />
          <SettingsRow icon="language" title="ภาษา / Language" onPress={() => router.push("/settings/language")} />

          <SectionTitle>วิธีการใช้งาน</SectionTitle>
          <SettingsRow icon="book" title="แนะนำการใช้งาน" onPress={() => router.push("/settings/guide")} />
          <SettingsRow icon="help" title="คำถามที่หมูเจอบ่อย" onPress={() => router.push("/settings/faq")} />
          <SettingsRow icon="slip" title="สลิปที่หมูอ่านได้" onPress={() => router.push("/settings/slips")} />
          <SettingsRow
            icon="statement"
            title="บัตรเครดิตที่หมูจดได้"
            isNew
            onPress={() => router.push("/settings/supported-cards")}
          />

          <SectionTitle>ติดตามหมูจด</SectionTitle>
          <SettingsRow icon="facebook" title="MooJot Facebook Page" unavailable />
          <SettingsRow icon="line" title="MooJot LINE Open Chat" unavailable />

          <SectionTitle>แจ้งปัญหา / สอบถามการใช้งาน</SectionTitle>
          <SettingsRow icon="support" title="หมูไม่อ่านสลิปบางธนาคาร?" onPress={() => router.push("/settings/slip-help")} />
          <SettingsRow icon="messenger" title="MooJot Facebook Messenger" unavailable />

          <View
            style={{
              backgroundColor: theme.background,
              paddingHorizontal: 17,
              paddingTop: 19,
              paddingBottom: 29,
              gap: 18,
            }}
          >
            <Text style={{ color: theme.muted, fontSize: 13 }}>เวอร์ชัน 1.0.0 · หมูจด</Text>
            <View style={{ flexDirection: "row", gap: 9 }}>
              {["บันทึกในเครื่อง", "ข้อมูลของคุณ", "หมูจด"].map((label) => (
                <View
                  key={label}
                  style={{
                    flex: 1,
                    minHeight: 62,
                    borderRadius: 8,
                    backgroundColor: theme.raised,
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 6,
                  }}
                >
                  <Text style={{ color: theme.text, fontSize: 11, fontWeight: "900", textAlign: "center" }}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={{ color: theme.muted, fontSize: 12, textAlign: "center" }}>แอปบันทึกรายรับรายจ่ายส่วนตัว</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="เปิดเครื่องมือเพิ่มเติม"
            accessibilityState={{ expanded: extraOpen }}
            onPress={() => setExtraOpen((open) => !open)}
            style={{
              minHeight: 49,
              backgroundColor: theme.raised,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: theme.text, fontSize: 13, fontWeight: "700" }}>
              เครื่องมือเพิ่มเติม {extraOpen ? "⌃" : "⌄"}
            </Text>
          </Pressable>
          {extraOpen ? (
            <>
              <SettingsRow icon="plan" title="งบประมาณและแผน" onPress={() => router.push("/plan")} />
              <SettingsRow icon="repeat" title="รายการจดซ้ำ" onPress={() => router.push("/recurring-form")} />
              <SettingsRow icon="streak" title="สถิติแครอต" onPress={() => router.push("/streak-stats")} />
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

import { Image } from "expo-image";
import { router, Stack } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/lib/use-app-theme";
import { Text } from "@/components/ui/typography";

const pages = [
  {
    title: "ชวนพี่จดให้ครบ\nน้องหมูได้กินแครอต\nพี่ได้ดูสรุปครบถ้วน",
    description: "สรุปรายรับรายจ่ายได้ละเอียดขึ้น\nเห็นทุกหมวดหมู่ที่ใช้ไปในแต่ละวัน",
    artwork: require("../../../assets/generated/tutorial-overview.png"),
    artworkLabel: "น้องหมูกับกราฟสรุปรายจ่ายและแครอต",
  },
  {
    title: "วิธีรับแครอต\nจดรายการวันนี้\nแล้วให้อาหารน้องหมู",
    description: "บันทึกรายรับหรือรายจ่ายอย่างน้อยหนึ่งรายการ\nแครอตของวันนี้ก็พร้อมให้น้องหมูแล้ว",
    artwork: require("../../../assets/generated/tutorial-feed.png"),
    artworkLabel: "น้องหมูได้รับแครอตจากการจดรายการ",
  },
  {
    title: "จดต่อเนื่องทุกวัน\nน้องหมูได้แครอตทุกวัน",
    description: "วันไหนยังไม่ได้จด กลับมาเริ่มใหม่ได้เสมอ\nสถิติความต่อเนื่องจะเริ่มนับอีกครั้ง",
    artwork: require("../../../assets/generated/tutorial-streak.png"),
    artworkLabel: "แครอตเรียงต่อกันแทนวันที่จดรายการ",
  },
  {
    title: "แวะมาจดกันทุกวัน\nดูความต่อเนื่องของเรา",
    description: "ยิ่งจดสม่ำเสมอ ยิ่งเห็นภาพการเงินชัดขึ้น\nและได้ดูแลน้องหมูไปพร้อมกัน",
    artwork: require("../../../assets/generated/tutorial-return.png"),
    artworkLabel: "แครอตสำหรับการจดรายการอย่างสม่ำเสมอ",
  },
] as const;

export default function StreakTutorialScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [page, setPage] = useState(0);

  const artworkWidth = Math.min(width - 34, 420);
  const artworkHeight = Math.min(Math.max(height * 0.43, 310), 440);
  const displayedArtworkWidth =
    page === 2 ? Math.min(width * 1.55, 650) : page === 3 ? Math.min(width * 1.08, 470) : artworkWidth;

  const current = pages[page];

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/streak-stats");
  };

  const back = () => (page === 0 ? close() : setPage(page - 1));
  const next = () => (page === pages.length - 1 ? close() : setPage(page + 1));

  return (
    <ScrollView
      bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: height * 0.69,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: theme.accent,
        }}
      />

      <View style={{ flex: 1, paddingTop: insets.top + 6 }}>
        <View
          style={{
            minHeight: 66,
            paddingHorizontal: 17,
            flexDirection: "row",
            alignItems: "center",
            gap: 18,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={page === 0 ? "กลับไปหน้าสถิติ" : "ย้อนกลับขั้นตอนก่อนหน้า"}
            onPress={back}
            hitSlop={10}
            style={{ width: 41, minHeight: 48, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: theme.text, fontSize: 42, lineHeight: 47, fontWeight: "300" }}>‹</Text>
          </Pressable>
          <View
            accessibilityLabel={`ขั้นตอน ${page + 1} จาก ${pages.length}`}
            style={{ flex: 1, flexDirection: "row", gap: 8 }}
          >
            {pages.map((_, index) => (
              <View
                key={index}
                style={{ flex: 1, height: 6, backgroundColor: index === page ? theme.accent : theme.border }}
              />
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ปิดคำแนะนำ"
            onPress={close}
            hitSlop={10}
            style={{ width: 41, minHeight: 48, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: theme.text, fontSize: 35, lineHeight: 40, fontWeight: "300" }}>×</Text>
          </Pressable>
        </View>

        <View
          style={{
            paddingHorizontal: 27,
            paddingTop: Math.max(30, Math.min(height * 0.065, 56)),
            alignItems: "center",
            gap: 18,
          }}
        >
          <Text
            style={{
              color: theme.text,
              fontSize: 23,
              lineHeight: 31,
              fontWeight: "900",
              textAlign: "center",
            }}
          >
            {current.title}
          </Text>
          <Text
            style={{
              color: theme.muted,
              fontSize: 16,
              lineHeight: 26,
              fontWeight: "500",
              textAlign: "center",
            }}
          >
            {current.description}
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            minHeight: artworkHeight,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <Image
            source={current.artwork}
            contentFit="contain"
            accessibilityLabel={current.artworkLabel}
            style={{ width: displayedArtworkWidth, height: artworkHeight }}
          />
        </View>

        <View
          style={{
            minHeight: 122,
            paddingHorizontal: 31,
            paddingTop: 16,
            paddingBottom: Math.max(insets.bottom, 20) + 20,
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 14,
          }}
        >
          {page > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={back}
              style={{ minHeight: 52, flex: 1, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: theme.accentText, fontSize: 17, fontWeight: "800" }}>ย้อนกลับ</Text>
            </Pressable>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <Pressable
            accessibilityRole="button"
            onPress={next}
            style={({ pressed }) => ({
              minHeight: 52,
              flex: 1.4,
              borderRadius: 28,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.accent,
              opacity: pressed ? 0.8 : 1,
              boxShadow: "0 3px 6px rgba(45, 45, 43, 0.18)",
            })}
          >
            <Text style={{ color: theme.onAccent, fontSize: 18, fontWeight: "900" }}>
              {page === pages.length - 1 ? "เริ่มเลย!" : "ต่อไป"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

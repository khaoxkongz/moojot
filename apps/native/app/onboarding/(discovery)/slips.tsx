import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";

import { OnboardingIllustration } from "@/components/ui/onboarding-illustrations";
import { Text } from "@/components/ui/typography";
import { FloatingBack, Footer, Page, PrimaryButton } from "@/features/onboarding/components/onboarding-controls";
import { SlipSourceCard } from "@/features/onboarding/components/slip-source-card";
import { useAppTheme } from "@/lib/use-app-theme";
import { scanSlipAlbums, slipAlbumSources, type SlipAlbumScanResult } from "@/features/slips/library-scan";
import { errorMessage } from "@/utils/format";

export default function OnboardingSlipsRoute() {
  const theme = useAppTheme();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const slipScanRun = useRef(0);
  const [slipInfo, setSlipInfo] = useState<"supported" | "help" | null>(null);
  const [slipScan, setSlipScan] = useState<SlipAlbumScanResult | null>(null);
  const [slipScanBusy, setSlipScanBusy] = useState(false);
  const [slipScanError, setSlipScanError] = useState<string | null>(null);

  const refreshSlipScan = useCallback(async (requestPermission = false) => {
    const run = ++slipScanRun.current;
    setSlipScanBusy(true);
    setSlipScanError(null);
    try {
      const result = await scanSlipAlbums(requestPermission);
      if (slipScanRun.current === run) setSlipScan(result);
    } catch (cause) {
      console.error("[slip-album-scan]", cause);
      if (slipScanRun.current === run) {
        setSlipScan(null);
        setSlipScanError(errorMessage(cause));
      }
    } finally {
      if (slipScanRun.current === run) setSlipScanBusy(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const initialScan = setTimeout(() => void refreshSlipScan(), 0);
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") void refreshSlipScan();
      });
      return () => {
        clearTimeout(initialScan);
        slipScanRun.current += 1;
        subscription.remove();
      };
    }, [refreshSlipScan])
  );

  const completedScan = slipScan?.status === "complete" ? slipScan : null;
  const needsSettings = slipScan?.status === "limited" || slipScan?.status === "denied";

  return (
    <Page>
      <FloatingBack onBack={() => router.back()} />
      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: Math.max(16, height * 0.025),
          paddingBottom: 18,
        }}
      >
        <View style={{ alignItems: "center", paddingHorizontal: 20 }}>
          <View style={{ width: 214, height: 178, alignItems: "center" }}>
            <OnboardingIllustration variant="slips" size={214} />
            <View
              style={{
                position: "absolute",
                top: 5,
                right: 6,
                width: 76,
                height: 42,
                borderRadius: 24,
                backgroundColor: theme.dangerFill,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {completedScan ? (
                <Text style={{ color: theme.onAccent, fontSize: 24, fontWeight: "900" }}>
                  {completedScan.total > 99 ? "99+" : completedScan.total}
                </Text>
              ) : (
                <MaterialCommunityIcons name="image-multiple-outline" size={26} color={theme.onAccent} />
              )}
            </View>
          </View>
          <Text
            style={{
              color: theme.text,
              fontSize: 25,
              fontWeight: "800",
              textAlign: "center",
              marginTop: 8,
            }}
          >
            {completedScan ? `เจอ ${completedScan.total} รูปในอัลบั้มสลิป` : "หมูจดช่วยอ่านสลิปได้"}
          </Text>
          <Text
            style={{
              color: theme.text,
              fontSize: 18,
              textAlign: "center",
              marginTop: 20,
              lineHeight: 27,
            }}
          >
            หมูจดนับรูปในอัลบั้มแอปธนาคาร{"\n"}ย้อนหลัง 30 วันบนเครื่องนี้
          </Text>
          <Text style={{ color: theme.muted, fontSize: 15, textAlign: "center", marginTop: 10, lineHeight: 22 }}>
            ขั้นนี้นับอย่างเดียว ยังไม่ส่งรูปไปไหน{"\n"}เมื่อเข้าหน้าแรก หมูจะให้ AI อ่านรูปเหล่านี้และจดสลิปให้อัตโนมัติ
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ alignSelf: "stretch", flexGrow: 0, marginTop: 30 }}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 32 }}
        >
          {slipAlbumSources.map((source) => (
            <SlipSourceCard key={source.id} source={{ ...source, count: completedScan?.counts[source.id] }} />
          ))}
        </ScrollView>
        {slipScanBusy ? (
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              marginTop: 17,
            }}
          >
            <ActivityIndicator color={theme.accentText} />
            <Text style={{ color: theme.text, fontSize: 15 }}>กำลังนับรูปในอัลบั้ม…</Text>
          </View>
        ) : slipScanError ? (
          <View style={{ alignItems: "center", marginTop: 17, paddingHorizontal: 24, gap: 5 }}>
            <Text style={{ color: theme.text, textAlign: "center", fontSize: 15 }}>
              ค้นหาอัลบั้มไม่สำเร็จ: {slipScanError}
            </Text>
            <PrimaryButton label="ลองอีกครั้ง" onPress={() => void refreshSlipScan()} />
          </View>
        ) : slipScan?.status === "permission-required" ? (
          <View style={{ alignItems: "center", marginTop: 17, paddingHorizontal: 24, gap: 8 }}>
            <Text style={{ color: theme.text, textAlign: "center", fontSize: 15 }}>
              อนุญาตให้เข้าถึงรูปภาพทั้งหมดเพื่อค้นหาและนับรูปในอัลบั้มสลิป
            </Text>
            <Text style={{ color: theme.muted, textAlign: "center", fontSize: 14 }}>
              ข้ามได้ จดรายการเองได้ตามปกติ และอนุญาตภายหลังจากหน้าแรกได้
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void refreshSlipScan(true)} style={{ padding: 9 }}>
              <Text style={{ color: theme.accentText, fontSize: 16, fontWeight: "800" }}>อนุญาตและค้นหาสลิป</Text>
            </Pressable>
          </View>
        ) : needsSettings ? (
          <View style={{ alignItems: "center", marginTop: 17, paddingHorizontal: 24, gap: 8 }}>
            <Text style={{ color: theme.text, textAlign: "center", fontSize: 15 }}>
              {slipScan?.status === "limited"
                ? "ต้องอนุญาตให้เข้าถึงรูปภาพทั้งหมด จึงจะค้นหาอัลบั้มได้"
                : "ยังไม่ได้รับสิทธิ์เข้าถึงรูปภาพทั้งหมด"}
            </Text>
            <Text style={{ color: theme.muted, textAlign: "center", fontSize: 14 }}>
              ไปต่อได้เลย จดรายการเองได้ตามปกติ และเปิดสิทธิ์ภายหลังจากหน้าแรกได้
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void Linking.openSettings().catch((cause: unknown) => {
                  setSlipScanError(errorMessage(cause));
                });
              }}
              style={{ padding: 9 }}
            >
              <Text style={{ color: theme.accentText, fontSize: 16, fontWeight: "800" }}>เปิดการตั้งค่ารูปภาพ</Text>
            </Pressable>
          </View>
        ) : completedScan?.matchedAlbums === 0 ? (
          <Text style={{ color: theme.text, textAlign: "center", fontSize: 15, marginTop: 17 }}>
            ยังไม่พบอัลบั้มของแอปธนาคารที่รองรับ
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="หมูจดอ่านสลิปอะไรได้บ้าง"
          onPress={() => setSlipInfo("supported")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            paddingHorizontal: 20,
            paddingVertical: 10,
            marginTop: 16,
          }}
        >
          <MaterialCommunityIcons name="information-outline" size={22} color={theme.accentText} />
          <Text style={{ color: theme.accentText, fontSize: 16, fontWeight: "700" }}>หมูจดอ่านสลิปอะไรได้บ้าง?</Text>
        </Pressable>
        <View style={{ flexGrow: 1, minHeight: 20 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ไม่พบสลิปบางธนาคาร ดูวิธีแก้ไข"
          onPress={() => setSlipInfo("help")}
          style={{ alignSelf: "center", paddingHorizontal: 15, paddingVertical: 10 }}
        >
          <Text style={{ color: theme.text, fontSize: 15, textAlign: "center" }}>
            ไม่พบสลิปบางธนาคาร?{"  "}
            <Text style={{ color: theme.accentText, fontWeight: "700" }}>ดูวิธีแก้ไข</Text>
          </Text>
        </Pressable>
      </ScrollView>
      <Footer label="ต่อไป" onPress={() => router.push("/onboarding/reasons")} />
      <Modal transparent animationType="fade" visible={slipInfo !== null} onRequestClose={() => setSlipInfo(null)}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 24,
            backgroundColor: "rgba(0, 0, 0, 0.55)",
          }}
        >
          <View style={{ backgroundColor: theme.surface, borderRadius: 20, padding: 22, gap: 16 }}>
            <Text style={{ color: theme.text, fontSize: 21, fontWeight: "800" }}>
              {slipInfo === "supported" ? "หมูจดนับรูปอะไรบ้าง?" : "ไม่พบสลิปบางธนาคาร?"}
            </Text>
            <Text style={{ color: theme.text, fontSize: 16, lineHeight: 25 }}>
              {slipInfo === "supported"
                ? "ขั้นนี้หมูจดนับรูปที่สร้างในช่วง 30 วันย้อนหลังจากอัลบั้ม Krungthai NEXT, K PLUS, Paotang และ TrueMoney บนเครื่องเท่านั้น จำนวนนี้ยังไม่ได้ตรวจว่าแต่ละภาพเป็นสลิปจริง และยังไม่ใช่รายการที่บันทึก เมื่อเข้าหน้าแรก หมูจดจะส่งรูปเหล่านี้ผ่านเซิร์ฟเวอร์หมูจดไปให้ Google Gemini อ่าน แล้วบันทึกรายการจากสลิปที่อ่านได้ครบให้อัตโนมัติ รูปที่ไม่ใช่สลิปหรือข้อมูลไม่ครบจะถูกข้าม"
                : "ตรวจว่าในแอปรูปภาพมีอัลบั้มชื่อ Krungthai NEXT, K PLUS, Paotang หรือ TrueMoney และอนุญาตให้หมูจดเข้าถึงรูปภาพทั้งหมด รูปที่เก่ากว่า 30 วันจะไม่ถูกนับ"}
            </Text>
            <PrimaryButton label="เข้าใจแล้ว" onPress={() => setSlipInfo(null)} />
          </View>
        </View>
      </Modal>
    </Page>
  );
}

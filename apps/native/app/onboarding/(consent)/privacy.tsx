import { useRouter } from "expo-router";
import { ScrollView, useWindowDimensions } from "react-native";

import { OnboardingIllustration } from "@/components/ui/onboarding-illustrations";
import { Text } from "@/components/ui/typography";
import { Footer, Header, Page } from "@/features/onboarding/components/onboarding-controls";
import { useAppTheme } from "@/lib/use-app-theme";

export default function OnboardingPrivacyRoute() {
  const theme = useAppTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  return (
    <Page backgroundColor={theme.background}>
      <Header title="การจัดการข้อมูลส่วนบุคคล" onBack={() => router.back()} />
      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 30, paddingBottom: 50, gap: 20 }}
      >
        <Text style={{ color: theme.text, fontSize: 25, lineHeight: 36, fontWeight: "800" }}>
          ข้อมูลของพี่มนุษย์สำคัญกับเรา
        </Text>
        <Text style={{ color: theme.text, fontSize: 17, lineHeight: 28 }}>
          หมูจดเก็บรายการที่คุณบันทึก อีเมล และการตั้งค่าบนเซิร์ฟเวอร์ โดยใช้อีเมลที่กรอกเพื่อแยกชุดข้อมูลของแต่ละคน
        </Text>
        <Text style={{ color: theme.text, fontSize: 17, lineHeight: 28 }}>
          หากอนุญาตให้เข้าถึงรูปภาพทั้งหมด ระหว่างเริ่มใช้งานหมูจดจะอ่านชื่ออัลบั้มและวันที่สร้างรูป เพื่อนับรูปย้อนหลัง 30 วันบนเครื่อง
          ขั้นนี้ยังไม่ส่งรูปไปไหน
        </Text>
        <Text style={{ color: theme.text, fontSize: 17, lineHeight: 28 }}>
          เมื่อเปิดหน้าแรก หมูจดจะส่งรูปย้อนหลัง 30 วันจากอัลบั้ม Krungthai NEXT, K PLUS, Paotang และ TrueMoney ผ่านเซิร์ฟเวอร์หมูจดไปให้
          Google Gemini อ่าน แล้วบันทึกรายการจากสลิปที่อ่านได้ครบให้อัตโนมัติ คุณเลือกหมวด แก้ไข หรือลบรายการได้ภายหลัง
        </Text>
        <OnboardingIllustration variant="privacy" size={Math.min(width * 0.62, 245)} />
      </ScrollView>
      <Footer label="ต่อไป" onPress={() => router.push("/onboarding/personalization")} />
    </Page>
  );
}

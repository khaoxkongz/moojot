import { useRouter } from "expo-router";
import { ScrollView, useWindowDimensions } from "react-native";

import { OnboardingIllustration } from "@/components/ui/onboarding-illustrations";
import { Text } from "@/components/ui/typography";
import { Footer, Header, Page } from "@/features/onboarding/components/onboarding-controls";
import { color } from "@/features/onboarding/theme";

export default function OnboardingPrivacyRoute() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  return (
    <Page backgroundColor={color.navy}>
      <Header title="การจัดการข้อมูลส่วนบุคคล" onBack={() => router.back()} />
      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 30, paddingBottom: 50, gap: 20 }}
      >
        <Text style={{ color: color.white, fontSize: 25, lineHeight: 36, fontWeight: "800" }}>
          ข้อมูลของพี่มนุษย์สำคัญกับเรา
        </Text>
        <Text style={{ color: color.white, fontSize: 17, lineHeight: 28 }}>
          หมูจดเก็บรายการที่คุณบันทึก อีเมล และการตั้งค่าบนเซิร์ฟเวอร์ โดยใช้อีเมลที่กรอกเพื่อแยกชุดข้อมูลของแต่ละคน
        </Text>
        <Text style={{ color: color.white, fontSize: 17, lineHeight: 28 }}>
          หากอนุญาตให้เข้าถึงรูปภาพทั้งหมด หมูจดจะอ่านชื่ออัลบั้มและวันที่สร้างรูป เพื่อนับรูปย้อนหลัง 30 วันบนเครื่อง โดยไม่ส่งรูปไปยังเซิร์ฟเวอร์
        </Text>
        <Text style={{ color: color.white, fontSize: 17, lineHeight: 28 }}>
          เมื่อคุณเลือกนำเข้าสลิปหรือไฟล์ ข้อมูลในไฟล์จะถูกส่งผ่านเซิร์ฟเวอร์เพื่อวิเคราะห์รายการด้วย Google Gemini คุณจะได้ตรวจผลก่อนยืนยันบันทึก
        </Text>
        <OnboardingIllustration variant="privacy" size={Math.min(width * 0.62, 245)} />
      </ScrollView>
      <Footer label="ต่อไป" onPress={() => router.push("/onboarding/personalization")} />
    </Page>
  );
}

import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";

import { Text } from "@/components/ui/typography";
import { Footer, Header, Page } from "@/features/onboarding/components/onboarding-controls";
import { useOnboardingFlow } from "@/features/onboarding/flow-context";
import { color } from "@/features/onboarding/theme";

export default function OnboardingTermsRoute() {
  const router = useRouter();
  const { acceptedTerms, setAcceptedTerms } = useOnboardingFlow();

  return (
    <Page backgroundColor={color.navy}>
      <Header title="ข้อตกลงและเงื่อนไข" onBack={() => router.back()} />
      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 30, paddingBottom: 50, gap: 20 }}
      >
        <Text style={{ color: color.white, fontSize: 25, lineHeight: 36, fontWeight: "800" }}>
          ข้อตกลงและเงื่อนไขการใช้งานหมูจด
        </Text>
        <Text style={{ color: color.white, fontSize: 17, lineHeight: 28 }}>
          หมูจดเป็นแอปบันทึกรายรับรายจ่ายส่วนตัว ข้อมูลและผลสรุปขึ้นอยู่กับรายการที่คุณบันทึก โปรดตรวจความถูกต้องก่อนใช้ประกอบการตัดสินใจทางการเงิน
        </Text>
        <Text style={{ color: color.white, fontSize: 17, lineHeight: 28 }}>
          รายการและการตั้งค่าจะถูกบันทึกบนเซิร์ฟเวอร์หมูจดโดยผูกกับอีเมลที่กรอก ใช้อีเมลเดียวกันบนอุปกรณ์อื่นเพื่อเปิดข้อมูลชุดเดิมได้
        </Text>
        <Text style={{ color: color.white, fontSize: 17, lineHeight: 28 }}>
          คุณสามารถส่งออกข้อมูลเป็น CSV จากหน้าโปรไฟล์เพื่อเก็บสำรองไว้ รูปสลิปที่เก็บไว้ในเครื่องเดิมจะไม่ย้ายตามไปยังอุปกรณ์อื่น
        </Text>
      </ScrollView>
      <Footer
        label="ต่อไป"
        onPress={() => router.push("/onboarding/privacy")}
        disabled={!acceptedTerms}
        extra={
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acceptedTerms }}
            onPress={() => setAcceptedTerms((value) => !value)}
            style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10 }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                borderWidth: 2,
                borderColor: acceptedTerms ? color.blue : color.muted,
                backgroundColor: acceptedTerms ? color.blue : color.white,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {acceptedTerms ? <MaterialCommunityIcons name="check" size={17} color={color.white} /> : null}
            </View>
            <Text style={{ color: color.ink, fontSize: 15 }}>ฉันได้อ่านและยอมรับข้อตกลงข้างต้น</Text>
          </Pressable>
        }
      />
    </Page>
  );
}

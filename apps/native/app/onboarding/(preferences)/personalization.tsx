import { useRouter } from "expo-router";
import { ScrollView, View, useWindowDimensions } from "react-native";

import { OnboardingIllustration } from "@/components/ui/onboarding-illustrations";
import { Text } from "@/components/ui/typography";
import { ConsentChoice, Footer, Header, Page } from "@/features/onboarding/components/onboarding-controls";
import { useOnboardingFlow } from "@/features/onboarding/flow-context";
import { useAppTheme } from "@/lib/use-app-theme";

export default function OnboardingPersonalizationRoute() {
  const theme = useAppTheme();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { personalization, setPersonalization } = useOnboardingFlow();

  return (
    <Page backgroundColor={theme.background}>
      <Header title="พี่มนุษย์อนุญาตไหม?" onBack={() => router.back()} />
      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 36 }}
      >
        <View
          style={{
            minHeight: Math.min(height * 0.3, 250),
            backgroundColor: theme.accent,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <OnboardingIllustration variant="welcome" size={Math.min(width * 0.55, 230)} />
        </View>
        <View style={{ padding: 20, gap: 16 }}>
          <Text style={{ color: theme.text, fontSize: 21, fontWeight: "800", lineHeight: 31 }}>
            ให้หมูจดใช้ข้อมูลรายการเพื่อแสดงคำแนะนำที่ตรงกับคุณไหม?
          </Text>
          <Text style={{ color: theme.muted, fontSize: 16, lineHeight: 26 }}>
            ตัวเลือกนี้บันทึกความต้องการของคุณไว้ในแอป เปลี่ยนใจได้ภายหลัง และไม่มีผลต่อการจดรายจ่าย
          </Text>
        </View>
      </ScrollView>
      <Footer
        label="ต่อไป"
        onPress={() => router.push("/onboarding/updates")}
        disabled={personalization === null}
        extra={<ConsentChoice value={personalization} onChange={setPersonalization} />}
      />
    </Page>
  );
}

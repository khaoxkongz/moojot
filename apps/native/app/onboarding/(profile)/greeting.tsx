import { useRouter } from "expo-router";
import { View, useWindowDimensions } from "react-native";

import { OnboardingIllustration } from "@/components/ui/onboarding-illustrations";
import { Text } from "@/components/ui/typography";
import { Footer, Header, Page } from "@/features/onboarding/components/onboarding-controls";
import { color } from "@/features/onboarding/theme";

export default function OnboardingGreetingRoute() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const illustrationSize = Math.min(width * 0.78, 330);

  return (
    <Page>
      <Header title="" onBack={() => router.back()} />
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 25,
          gap: 18,
        }}
      >
        <Text style={{ color: color.ink, fontSize: 34, fontWeight: "900", textAlign: "center" }}>สวัสดีพี่มนุษย์!</Text>
        <Text style={{ color: color.ink, fontSize: 23, textAlign: "center" }}>ยินดีที่ได้รู้จักกันนะ</Text>
        <OnboardingIllustration variant="welcome" size={illustrationSize} />
      </View>
      <Footer label="สวัสดี หมูจด!" onPress={() => router.push("/onboarding/terms")} />
    </Page>
  );
}

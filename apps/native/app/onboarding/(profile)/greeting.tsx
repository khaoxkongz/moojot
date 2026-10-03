import { useRouter } from "expo-router";
import { View, useWindowDimensions } from "react-native";

import { OnboardingIllustration } from "@/components/ui/onboarding-illustrations";
import { Text } from "@/components/ui/typography";
import { Footer, Page } from "@/features/onboarding/components/onboarding-controls";
import { useAppTheme } from "@/lib/use-app-theme";

export default function OnboardingGreetingRoute() {
  const theme = useAppTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const illustrationSize = Math.min(width * 0.78, 330);

  return (
    <Page>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 25,
          gap: 18,
        }}
      >
        <Text style={{ color: theme.text, fontSize: 34, fontWeight: "900", textAlign: "center" }}>สวัสดีพี่มนุษย์!</Text>
        <Text style={{ color: theme.text, fontSize: 23, textAlign: "center" }}>ยินดีที่ได้รู้จักกันนะ</Text>
        <OnboardingIllustration variant="welcome" size={illustrationSize} />
      </View>
      <Footer label="สวัสดี หมูจด!" onPress={() => router.push("/onboarding/birthday")} />
    </Page>
  );
}

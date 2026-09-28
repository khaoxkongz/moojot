import { useRouter } from "expo-router";
import { View, useWindowDimensions } from "react-native";

import { OnboardingIllustration } from "@/components/ui/onboarding-illustrations";
import { Text } from "@/components/ui/typography";
import { Footer, Page } from "@/features/onboarding/components/onboarding-controls";
import { useAppTheme } from "@/lib/use-app-theme";

export default function OnboardingLandingRoute() {
  const theme = useAppTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  return (
    <Page>
      <View style={{ alignItems: "flex-end", paddingHorizontal: 23, paddingTop: 12 }}>
        <View
          style={{
            backgroundColor: theme.raised,
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 99,
          }}
        >
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: "700" }}>🇹🇭 ไทย</Text>
        </View>
      </View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
        <OnboardingIllustration variant="logo" size={Math.min(width * 0.46, 195)} />
        <Text style={{ color: theme.text, fontSize: 48, fontWeight: "900", marginTop: -6 }}>หมูจด</Text>
        <Text
          style={{
            color: theme.text,
            fontSize: 25,
            fontWeight: "800",
            marginTop: 54,
            textAlign: "center",
          }}
        >
          เริ่มจดรายจ่ายกันเลย!
        </Text>
      </View>
      <Footer label="เริ่มตั้งค่าโปรไฟล์" onPress={() => router.push("/onboarding/birthday")} white={false} />
    </Page>
  );
}

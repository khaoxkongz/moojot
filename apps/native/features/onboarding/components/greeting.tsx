import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OnboardingIllustration } from "@/components/ui/onboarding-illustrations";
import { Text } from "@/components/ui/typography";
import { useAppTheme } from "@/lib/use-app-theme";

import { StepButton } from "./step-parts";

/** "สวัสดีพี่มนุษย์!": the first screen after signup. Nothing is behind it, so it has no back button. */
export function Greeting({ onStart }: { onStart: () => void }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flex: 1,
        paddingTop: insets.top + 16,
        paddingHorizontal: 24,
        paddingBottom: insets.bottom + 16,
      }}
    >
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <OnboardingIllustration variant="welcome" height={260} />
        <Text
          accessibilityRole="header"
          style={{ marginTop: 14, color: theme.text, fontSize: 30, lineHeight: 41, textAlign: "center" }}
        >
          สวัสดีพี่มนุษย์!
        </Text>
        <Text style={{ marginTop: 6, color: theme.muted, fontSize: 16, lineHeight: 26, textAlign: "center" }}>
          ยินดีที่ได้รู้จักกันนะ{"\n"}เริ่มจดรายจ่ายกันเลย!
        </Text>
      </View>
      <Text style={{ marginBottom: 12, color: theme.muted, fontSize: 13, lineHeight: 20, textAlign: "center" }}>
        ตั้งค่า 4 ขั้นสั้น ๆ ก่อนเริ่มใช้
      </Text>
      <StepButton label="สวัสดี หมูจด!" onPress={onStart} />
    </View>
  );
}

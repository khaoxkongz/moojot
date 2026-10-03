import { Image } from "expo-image";
import type { DimensionValue } from "react-native";

export type OnboardingIllustrationVariant = "logo" | "welcome" | "privacy" | "slips" | "reasons" | "final";

const illustrations = {
  logo: require("../../assets/generated/brand-mascot.png"),
  welcome: require("../../assets/generated/onboarding-welcome.png"),
  privacy: require("../../assets/generated/onboarding-privacy.png"),
  slips: require("../../assets/generated/onboarding-slips.png"),
  reasons: require("../../assets/generated/onboarding-reasons.png"),
  final: require("../../assets/generated/onboarding-final.png"),
};

/** The handoff's alt text for each picture. */
const labels: Record<OnboardingIllustrationVariant, string> = {
  logo: "มาสคอตหมูจด",
  welcome: "น้องหมูโบกมือทักทาย",
  privacy: "น้องหมูดูแลข้อมูลของพี่มนุษย์",
  slips: "น้องหมูกับรูปสลิป",
  reasons: "น้องหมูคิดถึงเป้าหมายการเงิน",
  final: "น้องหมูพร้อมจดรายจ่าย",
};

/** A handoff pig picture, fitted inside its box like the handoff's `object-fit: contain`. */
export function OnboardingIllustration({
  variant,
  height,
  width = "100%",
}: {
  variant: OnboardingIllustrationVariant;
  height: number;
  width?: DimensionValue;
}) {
  return (
    <Image
      source={illustrations[variant]}
      style={{ width, height }}
      contentFit="contain"
      accessibilityLabel={labels[variant]}
      accessible
    />
  );
}

import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Animated, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useAppTheme } from "@/lib/use-app-theme";

export type OnboardingIllustrationVariant =
  | "logo"
  | "welcome"
  | "privacy"
  | "slips"
  | "reasons"
  | "motivation"
  | "final";

export type OnboardingIllustrationProps = {
  variant: OnboardingIllustrationVariant;
  /** The rendered width in points. The illustration keeps its 320:260 aspect ratio. */
  size?: number;
  /** A value from 0 to 1 that reveals the six symbols on the reasons card. */
  progress?: number;
  /** Selected answers also reveal symbols, one per answer. */
  selectedReasons?: readonly string[];
};

const illustrations = {
  logo: require("../../assets/generated/brand-mascot.png"),
  welcome: require("../../assets/generated/onboarding-welcome.png"),
  privacy: require("../../assets/generated/onboarding-privacy.png"),
  slips: require("../../assets/generated/onboarding-slips.png"),
  reasons: require("../../assets/generated/onboarding-reasons.png"),
  motivation: require("../../assets/generated/onboarding-motivation.png"),
  final: require("../../assets/generated/onboarding-final.png"),
};

const labels: Record<OnboardingIllustrationVariant, string> = {
  logo: "มาสคอตหมูจด",
  welcome: "หมูจดทักทาย",
  privacy: "หมูจดดูแลข้อมูลส่วนตัว",
  slips: "หมูจดตรวจสลิป",
  reasons: "หมูจดกับเป้าหมายการจดรายจ่าย",
  motivation: "หมูจดให้กำลังใจ",
  final: "หมูจดพร้อมเริ่มใช้งาน",
};

const reasonKeys = ["reduce", "dream", "save", "mindful", "budget", "debt"] as const;
const reasonPaths = [
  "M4 12h16",
  "m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z",
  "M4 19 19 4m-9 0h9v9",
  "m4 12 5 5L20 6",
  "M5 5h14v14H5zM9 5v14m6-14v14",
  "M12 2 22 12 12 22 2 12Z",
] as const;

function ReasonMark({ shown, size, index }: { shown: boolean; size: number; index: number }) {
  const theme = useAppTheme();
  const [opacity] = useState(() => new Animated.Value(shown ? 1 : 0));

  useEffect(() => {
    const animation = Animated.timing(opacity, { toValue: shown ? 1 : 0, duration: 320, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [opacity, shown]);

  const column = index % 2;
  const row = Math.floor(index / 2);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: size * (0.55 + column * 0.18),
        top: size * (0.43 + row * 0.08),
        width: size * 0.07,
        height: size * 0.07,
        borderRadius: size * 0.035,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.accent,
        alignItems: "center",
        justifyContent: "center",
        opacity,
      }}
    >
      <Svg width="70%" height="70%" viewBox="0 0 24 24" accessible={false}>
        <Path
          d={reasonPaths[index]}
          fill="none"
          stroke={theme.accentText}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
}

/** New textured pig artwork; the reasons card retains its six animated answers. */
export function OnboardingIllustration({
  variant,
  size = 280,
  progress = 0,
  selectedReasons,
}: OnboardingIllustrationProps) {
  const revealCount = Math.floor(Math.max(0, Math.min(1, progress)) * reasonKeys.length);
  const visible = reasonKeys.map((key, index) =>
    selectedReasons ? selectedReasons.includes(key) : index < revealCount
  );

  return (
    <View style={{ width: size, height: (size * 260) / 320 }}>
      <Image
        source={illustrations[variant]}
        style={{ width: "100%", height: "100%" }}
        contentFit="contain"
        accessibilityLabel={labels[variant]}
        accessible
      />
      {variant === "reasons"
        ? visible.map((shown, index) => <ReasonMark key={reasonKeys[index]} shown={shown} index={index} size={size} />)
        : null}
    </View>
  );
}

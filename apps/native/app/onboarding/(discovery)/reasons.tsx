import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OnboardingIllustration } from "@/components/ui/onboarding-illustrations";
import { Text } from "@/components/ui/typography";
import { FloatingBack, Footer, Page } from "@/features/onboarding/components/onboarding-controls";
import { useOnboardingFlow } from "@/features/onboarding/flow-context";
import { color } from "@/features/onboarding/theme";

const reasonOptions = [
  { key: "reduce", label: "ลดรายจ่าย" },
  { key: "dream", label: "เก็บเงินซื้อของ ตามฝัน" },
  { key: "save", label: "ออมเงินเพิ่ม" },
  { key: "mindful", label: "ใช้จ่ายอย่างมีสติ" },
  { key: "budget", label: "คุมงบใช้จ่าย" },
  { key: "debt", label: "ปลดหนี้" },
] as const;

export default function OnboardingReasonsRoute() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { reasons, setReasons } = useOnboardingFlow();
  const [reasonFooterOpacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(reasonFooterOpacity, {
      toValue: reasons.length ? 1 : 0,
      duration: 260,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [reasonFooterOpacity, reasons.length]);

  function toggleReason(key: string) {
    setReasons((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  return (
    <Page>
      <FloatingBack onBack={() => router.back()} />
      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: Math.max(32, height * 0.055),
          paddingBottom: 24,
        }}
      >
        <OnboardingIllustration variant="reasons" size={Math.min(width * 0.9, 345)} selectedReasons={reasons} />
        <Text
          style={{
            color: color.ink,
            fontSize: 28,
            lineHeight: 38,
            fontWeight: "900",
            textAlign: "center",
            marginTop: 15,
          }}
        >
          พี่มนุษย์อยากจดรายจ่าย{`\n`}เพราะอะไรเหรอ?
        </Text>
        <Text style={{ color: "#7B8492", fontSize: 17, marginTop: 12 }}>เลือกได้หลายคำตอบ</Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 10,
            marginTop: 26,
          }}
        >
          {reasonOptions.map((reason) => {
            const selected = reasons.includes(reason.key);
            return (
              <Pressable
                key={reason.key}
                accessibilityRole="checkbox"
                accessibilityLabel={reason.label}
                accessibilityState={{ checked: selected }}
                onPress={() => toggleReason(reason.key)}
                style={({ pressed }) => ({
                  borderRadius: 999,
                  borderWidth: 1.5,
                  borderColor: selected ? color.lightBlue : color.blue,
                  backgroundColor: selected ? color.lightBlue : color.yellow,
                  paddingHorizontal: 17,
                  paddingVertical: 10,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ color: color.blue, fontSize: 16, fontWeight: "800" }}>{reason.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <Animated.View
        importantForAccessibility={reasons.length ? "auto" : "no-hide-descendants"}
        style={{
          pointerEvents: reasons.length ? "auto" : "none",
          opacity: reasonFooterOpacity,
          minHeight: Math.max(insets.bottom, 16) + 76,
        }}
      >
        <Footer
          label="ต่อไป"
          onPress={() => router.push("/onboarding/motivation")}
          disabled={!reasons.length}
          white={false}
        />
      </Animated.View>
    </Page>
  );
}

import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Animated, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OnboardingIllustration } from "@/components/ui/onboarding-illustrations";
import { Text } from "@/components/ui/typography";
import { FloatingBack, Footer, Page } from "@/features/onboarding/components/onboarding-controls";
import { useOnboardingFlow } from "@/features/onboarding/flow-context";
import { color } from "@/features/onboarding/theme";

export default function OnboardingMotivationRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { reasons } = useOnboardingFlow();
  const illustrationSize = Math.min(width * 0.78, 330);
  const [motivationDone, setMotivationDone] = useState(false);
  const [motivationAnimating, setMotivationAnimating] = useState(false);
  const [pulse] = useState(() => new Animated.Value(1));
  const [motivate] = useState(() => new Animated.Value(0));

  useFocusEffect(
    useCallback(() => {
      motivate.setValue(0);
      setMotivationDone(false);
      setMotivationAnimating(false);
      return () => motivate.stopAnimation();
    }, [motivate])
  );

  useEffect(() => {
    if (motivationDone) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [motivationDone, pulse]);

  function startMotivation() {
    if (motivationAnimating || motivationDone) return;
    setMotivationAnimating(true);
    Animated.timing(motivate, { toValue: 1, duration: 1350, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setMotivationDone(true);
      setMotivationAnimating(false);
    });
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
          flexGrow: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 55,
          paddingBottom: 25,
          gap: 8,
        }}
      >
        <View
          style={{
            backgroundColor: motivationDone ? color.white : "#FFECA6",
            borderRadius: 17,
            paddingHorizontal: 20,
            paddingVertical: 14,
            maxWidth: 310,
          }}
        >
          <Text
            style={{
              color: color.ink,
              fontSize: motivationDone ? 20 : 17,
              fontWeight: "800",
              textAlign: "center",
              lineHeight: motivationDone ? 29 : 25,
            }}
          >
            {motivationDone ? "แค่พี่มนุษย์ตั้งใจ\nอะไรก็เป็นไปได้!" : "พร้อมเริ่มจดรายจ่าย\nไปด้วยกันไหม?"}
          </Text>
        </View>
        <Animated.View
          style={{
            transform: [
              {
                translateY: motivate.interpolate({ inputRange: [0, 1], outputRange: [20, -12] }),
              },
              {
                scale: motivate.interpolate({
                  inputRange: [0, 0.55, 1],
                  outputRange: [1, 1.13, 1],
                }),
              },
            ],
            alignItems: "center",
          }}
        >
          <OnboardingIllustration
            variant={motivationDone ? "motivation" : "reasons"}
            size={Math.min(illustrationSize, height * 0.43)}
            selectedReasons={motivationDone || motivationAnimating ? [] : reasons}
          />
        </Animated.View>
        {!motivationDone ? (
          <Animated.View
            style={{
              transform: [{ scale: pulse }],
              opacity: motivate.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
              marginTop: -20,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="ได้เลย หมูจด"
              accessibilityState={{ disabled: motivationAnimating }}
              disabled={motivationAnimating}
              onPress={startMotivation}
              style={{
                width: 112,
                height: 112,
                borderRadius: 56,
                backgroundColor: color.blue,
                justifyContent: "center",
                alignItems: "center",
                boxShadow: "0 5px 13px rgba(25, 120, 242, .28)",
              }}
            >
              <Text
                style={{
                  color: color.white,
                  fontSize: 19,
                  fontWeight: "800",
                  textAlign: "center",
                }}
              >
                ได้เลย{`\n`}หมูจด!
              </Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </ScrollView>
      <View style={{ minHeight: Math.max(insets.bottom, 16) + 76 }}>
        {motivationDone ? <Footer label="ต่อไป" onPress={() => router.push("/onboarding/ready")} white={false} /> : null}
      </View>
    </Page>
  );
}

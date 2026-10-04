import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable } from "react-native";

import { OnboardingIllustration } from "@/components/ui/onboarding-illustrations";
import { fontFaces } from "@/constants/fonts";
import { useAppTheme } from "@/lib/use-app-theme";

/** The handoff's splash curve: the mascot overshoots a little as it grows to full size. */
const springIn = Easing.bezier(0.2, 1.5, 0.4, 1);

/** Splash before auth: it opens the signup / sign-in screen after two seconds, or at once on a tap. */
export default function SplashRoute() {
  const theme = useAppTheme();
  const router = useRouter();
  const left = useRef(false);
  const leave = useCallback(() => {
    if (left.current) return;
    left.current = true;
    router.replace("/auth");
  }, [router]);
  const [mascotScale] = useState(() => new Animated.Value(0.6));
  const [mascotOpacity] = useState(() => new Animated.Value(0));
  const [titleOpacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(mascotScale, { toValue: 1, duration: 800, easing: springIn, useNativeDriver: true }),
      Animated.timing(mascotOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(titleOpacity, { toValue: 1, duration: 500, delay: 400, useNativeDriver: true }),
    ]);
    animation.start();
    const timer = setTimeout(leave, 2000);
    return () => {
      animation.stop();
      clearTimeout(timer);
    };
  }, [leave, mascotScale, mascotOpacity, titleOpacity]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="เข้าสู่หมูจด"
      onPress={leave}
      style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 2, backgroundColor: theme.background }}
    >
      <Animated.View style={{ opacity: mascotOpacity, transform: [{ scale: mascotScale }] }}>
        <OnboardingIllustration variant="logo" width={170} height={170} />
      </Animated.View>
      <Animated.Text
        style={{
          color: theme.text,
          fontFamily: fontFaces.regular,
          fontSize: 40,
          lineHeight: 52,
          opacity: titleOpacity,
        }}
      >
        หมูจด
      </Animated.Text>
    </Pressable>
  );
}

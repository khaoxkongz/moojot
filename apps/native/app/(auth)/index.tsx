import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, useWindowDimensions } from "react-native";

import { OnboardingIllustration } from "@/components/ui/onboarding-illustrations";
import { fontFaces } from "@/constants/fonts";
import { Page } from "@/features/onboarding/components/onboarding-controls";
import { useAppTheme } from "@/lib/use-app-theme";

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
  const { width } = useWindowDimensions();
  const [splashOpacity] = useState(() => new Animated.Value(0));
  const [splashScale] = useState(() => new Animated.Value(0.55));
  const [penTravel] = useState(() => new Animated.Value(0));
  const [titleOpacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(splashOpacity, { toValue: 1, duration: 750, useNativeDriver: true }),
      Animated.spring(splashScale, { toValue: 1, friction: 7, useNativeDriver: true }),
      Animated.timing(penTravel, { toValue: 1, duration: 1050, delay: 150, useNativeDriver: true }),
      Animated.timing(titleOpacity, { toValue: 1, duration: 550, delay: 650, useNativeDriver: true }),
    ]);
    animation.start();
    const timer = setTimeout(leave, 2000);
    return () => {
      animation.stop();
      clearTimeout(timer);
    };
  }, [leave, splashOpacity, splashScale, penTravel, titleOpacity]);

  return (
    <Page>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="เข้าสู่หมูจด"
        onPress={leave}
        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
      >
        <Animated.View
          style={{
            opacity: splashOpacity,
            transform: [{ scale: splashScale }],
            alignItems: "center",
          }}
        >
          <OnboardingIllustration variant="logo" size={Math.min(width * 0.52, 210)} />
          <Animated.View
            style={{
              pointerEvents: "none",
              position: "absolute",
              left: 5,
              top: 5,
              opacity: penTravel.interpolate({
                inputRange: [0, 0.12, 0.72, 1],
                outputRange: [0, 1, 1, 0],
              }),
              transform: [
                {
                  translateX: penTravel.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-40, 115],
                  }),
                },
                {
                  translateY: penTravel.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-25, 38],
                  }),
                },
                {
                  rotate: penTravel.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["-30deg", "26deg"],
                  }),
                },
              ],
            }}
          >
            <MaterialCommunityIcons name="pencil" size={42} color={theme.accentText} />
          </Animated.View>
          <Animated.Text
            style={{
              color: theme.text,
              fontFamily: fontFaces.regular,
              fontSize: 42,
              marginTop: -10,
              opacity: titleOpacity,
            }}
          >
            หมูจด
          </Animated.Text>
        </Animated.View>
      </Pressable>
    </Page>
  );
}

import { useEffect, useMemo, useState } from "react";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/lib/use-app-theme";
import { Animated, Easing, StyleSheet, View } from "react-native";

const CARD_WIDTH = 82;
const CARD_HEIGHT = 56;
const DURATION = 1800; // Time for one full cycle

interface FlowCardProps {
  initialPhase: number; // 0.0, 0.333, or 0.667
}

function FlowCard({ initialPhase }: FlowCardProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [anim] = useState(() => new Animated.Value(initialPhase));

  useEffect(() => {
    anim.setValue(initialPhase);

    // Run from initialPhase to 1.0, then loop from 0.0 to 1.0 continuously
    const initialDuration = (1 - initialPhase) * DURATION;
    let loopAnim: Animated.CompositeAnimation | null = null;
    const initialAnim = Animated.timing(anim, {
      toValue: 1,
      duration: initialDuration,
      easing: Easing.linear,
      useNativeDriver: true,
    });

    initialAnim.start(({ finished }) => {
      if (!finished) return;
      anim.setValue(0);
      loopAnim = Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: DURATION,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loopAnim.start();
    });

    return () => {
      initialAnim.stop();
      if (loopAnim) {
        loopAnim.stop();
      }
    };
  }, [anim, initialPhase]);

  // Phase 0.0 -> 0.333: Left -> Center (เล็ก ค่อย ๆ ขึ้นมา)
  // Phase 0.333 -> 0.667: Center -> Right (ขนาดปกติ)
  // Phase 0.667 -> 1.0: Right -> Exit (เล็ก ค่อย ๆ ลงและหายไป)
  const translateX = anim.interpolate({
    inputRange: [0, 0.333, 0.667, 1],
    outputRange: [-85, 0, 85, 140],
  });

  const translateY = anim.interpolate({
    inputRange: [0, 0.333, 0.667, 1],
    outputRange: [10, 0, 0, 10],
  });

  const scale = anim.interpolate({
    inputRange: [0, 0.333, 0.667, 1],
    outputRange: [0.65, 1.0, 1.0, 0.65],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.15, 0.333, 0.667, 0.9, 1],
    outputRange: [0, 0.8, 1.0, 1.0, 0.5, 0],
  });

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          transform: [{ translateX }, { translateY }, { scale }],
          opacity,
        },
      ]}
    >
      <View style={styles.card}>
        <View style={styles.topBar} />
        <View style={styles.subBar} />
        <View style={styles.bottomRow}>
          <View style={styles.miniIcon} />
          <View style={styles.miniBar} />
        </View>
      </View>
    </Animated.View>
  );
}

export function SlipFlowCards() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.wrapper}>
      {/* 3 cards with phase offsets: 0, 1/3, 2/3 */}
      <FlowCard initialPhase={0} />
      <FlowCard initialPhase={0.333} />
      <FlowCard initialPhase={0.667} />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrapper: {
      height: CARD_HEIGHT + 14,
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      marginVertical: 4,
    },
    cardContainer: {
      position: "absolute",
    },
    card: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: 8,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 8,
      justifyContent: "space-between",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 5,
      elevation: 4,
    },
    topBar: {
      height: 6,
      width: "68%",
      borderRadius: 3,
      backgroundColor: theme.raised,
    },
    subBar: {
      height: 4,
      width: "46%",
      borderRadius: 2,
      backgroundColor: theme.raised,
      marginTop: 3,
    },
    bottomRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginTop: 4,
    },
    miniIcon: {
      width: 12,
      height: 12,
      borderRadius: 2.5,
      backgroundColor: theme.raised,
    },
    miniBar: {
      height: 5,
      width: "42%",
      borderRadius: 2.5,
      backgroundColor: theme.raised,
    },
  });
}

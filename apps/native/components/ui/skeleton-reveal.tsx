import React, { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View, ViewStyle } from "react-native";

export interface SkeletonRevealProps {
  loading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  revealDuration?: number; // 400ms
  style?: ViewStyle;
}

/**
 * Transitions.dev — Skeleton loader and reveal
 * Stacks two layers on the same coordinates:
 * - Skeleton owns the loading pulse and the fade-out side of the reveal.
 * - Content owns the fade-in side.
 * Both cross-fade over revealDuration (400ms) with ease-in-out for a seamless swap.
 */
export function SkeletonReveal({ loading, skeleton, children, revealDuration = 400, style }: SkeletonRevealProps) {
  // revealProgress: 0 = fully skeleton, 1 = fully revealed content
  const [revealProgress] = useState(() => new Animated.Value(loading ? 0 : 1));
  const [revealState, setRevealState] = useState({ loading, showSkeleton: loading });

  if (revealState.loading !== loading) {
    setRevealState({ loading, showSkeleton: true });
  }

  const showSkeleton = loading || revealState.showSkeleton;

  useEffect(() => {
    if (loading) {
      revealProgress.stopAnimation();
      revealProgress.setValue(0);
    } else {
      const animation = Animated.timing(revealProgress, {
        toValue: 1,
        duration: revealDuration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      });
      animation.start(({ finished }) => {
        if (finished) {
          setRevealState((current) => (current.loading ? current : { loading: false, showSkeleton: false }));
        }
      });
      return () => animation.stop();
    }
  }, [loading, revealDuration, revealProgress]);

  if (!loading && !showSkeleton) {
    return <View style={style}>{children}</View>;
  }

  const skeletonOpacity = revealProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const contentOpacity = revealProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={[styles.container, style]}>
      {/* Real Content Layer */}
      <Animated.View
        style={[styles.contentLayer, { opacity: contentOpacity }]}
        pointerEvents={loading ? "none" : "auto"}
      >
        {children}
      </Animated.View>

      {/* Skeleton Layer */}
      {showSkeleton ? (
        <Animated.View style={[styles.skeletonLayer, { opacity: skeletonOpacity }]} pointerEvents="none">
          {skeleton}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  contentLayer: {
    width: "100%",
  },
  skeletonLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
});

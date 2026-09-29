import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

const rowNavy = "#071D30";

export function TimelineSkeletonRow() {
  const [pulseAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <Animated.View style={[styles.transaction, { opacity: pulseAnim }]}>
      <View style={styles.categoryCircle} />
      <View style={styles.transactionCopy}>
        <View style={styles.kindBar} />
        <View style={styles.titleBar} />
      </View>
      <View style={styles.amountBar} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  transaction: {
    minHeight: 86,
    backgroundColor: rowNavy,
    paddingLeft: 18,
    paddingRight: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  categoryCircle: {
    width: 37,
    height: 37,
    borderRadius: 21,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  transactionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  kindBar: {
    height: 12,
    width: 72,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.20)",
  },
  titleBar: {
    height: 11,
    width: 145,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    marginTop: 5,
  },
  amountBar: {
    height: 16,
    width: 65,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
});

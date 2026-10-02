import { useEffect, useMemo, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/lib/use-app-theme";

/** A day-card row while a slip is being read: 34 circle, two text bars and an amount bar, pulsing. */
export function TimelineSkeletonRow() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [pulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.5, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View accessibilityLabel="กำลังอ่านสลิป" style={[styles.row, { opacity: pulse }]}>
      <View style={styles.circle} />
      <View style={styles.copy}>
        <View style={styles.titleBar} />
        <View style={styles.metaBar} />
      </View>
      <View style={styles.amountBar} />
    </Animated.View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      minHeight: 62,
      paddingVertical: 10,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    circle: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.raised },
    copy: { flex: 1, gap: 7 },
    titleBar: { height: 10, width: "58%", borderRadius: 5, backgroundColor: theme.raised },
    metaBar: { height: 8, width: "36%", borderRadius: 4, backgroundColor: theme.raised },
    amountBar: { width: 44, height: 10, borderRadius: 5, backgroundColor: theme.raised },
  });
}

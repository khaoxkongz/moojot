import { useEffect, useState, useSyncExternalStore } from "react";
import { AccessibilityInfo, Animated, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/typography";
import { shadow } from "@/constants/theme";
import { toast } from "@/lib/toast";
import { useAppTheme } from "@/lib/use-app-theme";

/**
 * The app-wide toast from `lib/toast`: `inverse` fill, radius 12, at least 48 tall, text 14, action in
 * `inverseAccent`. It sits above the tab bar and the floating “จดเพิ่ม” button.
 */
export function ToastHost({ bottomOffset = 132 }: { bottomOffset?: number }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const current = useSyncExternalStore(toast.subscribe, toast.getSnapshot, toast.getSnapshot);
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(opacity, { toValue: current ? 1 : 0, duration: 200, useNativeDriver: true }).start();
    if (current) AccessibilityInfo.announceForAccessibility(current.message);
  }, [current, opacity]);

  if (!current) return null;
  const actionLabel = current.busy ? (current.action?.busyLabel ?? current.action?.label) : current.action?.label;
  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", left: 0, right: 0, bottom: insets.bottom + bottomOffset }}
    >
      <Animated.View
        accessibilityLiveRegion="polite"
        style={{
          opacity,
          alignSelf: "center",
          width: "100%",
          maxWidth: 680,
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            minHeight: 48,
            borderRadius: 12,
            paddingLeft: 16,
            paddingRight: current.action ? 6 : 16,
            paddingVertical: 6,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: theme.inverse,
            ...shadow.toast,
          }}
        >
          <Text style={{ flex: 1, color: theme.onInverse, fontSize: 14, lineHeight: 20 }}>{current.message}</Text>
          {current.action ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={actionLabel}
              accessibilityState={{ busy: current.busy }}
              onPress={current.busy ? undefined : () => void toast.runAction()}
              hitSlop={4}
              style={({ pressed }) => ({
                minHeight: 44,
                minWidth: 44,
                paddingHorizontal: 10,
                justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ color: theme.inverseAccent, fontSize: 14, lineHeight: 20 }}>{actionLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

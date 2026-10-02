import type React from "react";
import { useMemo } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/components/ui/controls";
import { Text } from "@/components/ui/typography";
import { radius, type AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/lib/use-app-theme";

/** The shade behind a bottom sheet; tapping it closes the sheet. */
export function SheetBackdrop({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[StyleSheet.absoluteFill, { backgroundColor: theme.shade }]}
    />
  );
}

export type SheetPanelProps = {
  title: string;
  /** Next to the title, such as the queue's "2 จาก 3". */
  accessory?: React.ReactNode;
  onClose: () => void;
  /** The tallest the sheet grows, as a share of the window height. */
  maxHeightRatio: number;
  /** Below the content, above the home indicator. */
  bottomGap?: number;
  /** For a sheet that slides itself (an animated transform). */
  style?: Animated.WithAnimatedValue<StyleProp<ViewStyle>>;
  children: React.ReactNode;
};

/** A bottom sheet's surface: rounded top, handle, a 17 title with the close button, then the sheet's own content. */
export function SheetPanel({
  title,
  accessory,
  onClose,
  maxHeightRatio,
  bottomGap = 16,
  style,
  children,
}: SheetPanelProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <Animated.View
      accessibilityViewIsModal
      style={[styles.sheet, { maxHeight: height * maxHeightRatio, paddingBottom: insets.bottom + bottomGap }, style]}
    >
      <View style={styles.handle} />
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {accessory}
        <View style={{ flex: 1 }} />
        <IconButton icon="close" size={24} label="ปิด" onPress={onClose} style={{ marginRight: -10 }} />
      </View>
      {children}
    </Animated.View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    sheet: {
      width: "100%",
      maxWidth: 680,
      alignSelf: "center",
      backgroundColor: theme.surface,
      borderTopLeftRadius: radius.sheet,
      borderTopRightRadius: radius.sheet,
      paddingTop: 10,
      paddingHorizontal: 16,
    },
    handle: {
      alignSelf: "center",
      width: 36,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.border,
      marginBottom: 6,
    },
    header: { flexDirection: "row", alignItems: "center", gap: 8 },
    title: { color: theme.text, fontSize: 17, lineHeight: 24 },
  });
}

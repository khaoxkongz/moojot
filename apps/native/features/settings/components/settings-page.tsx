import { router } from "expo-router";
import { useMemo, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/typography";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/lib/use-app-theme";

function navigateBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/settings");
}

export function SettingsPage({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  const styles = useSettingsPageStyles();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="กลับไปหน้าพี่มนุษย์"
          onPress={navigateBack}
          hitSlop={10}
          style={styles.back}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {title}
        </Text>
        {right ?? <View style={{ width: 46 }} />}
      </View>
      {children}
    </View>
  );
}

export function SettingsScroll({ children }: { children: ReactNode }) {
  const styles = useSettingsPageStyles();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(32, insets.bottom + 30) }]}
    >
      <View style={styles.contentWidth}>{children}</View>
    </ScrollView>
  );
}

export function SettingsAction({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  const styles = useSettingsPageStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.action, secondary && styles.secondaryAction, disabled && { opacity: 0.48 }]}
    >
      <Text style={[styles.actionText, secondary && styles.secondaryActionText]}>{label}</Text>
    </Pressable>
  );
}

export function SettingsPanel({ title, children }: { title?: string; children: ReactNode }) {
  const styles = useSettingsPageStyles();
  return (
    <View style={styles.panel}>
      {title ? <Text style={styles.panelTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function SettingsBullet({ children }: { children: ReactNode }) {
  const styles = useSettingsPageStyles();
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bullet} />
      <Text style={styles.copy}>{children}</Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    header: {
      backgroundColor: theme.accent,
      paddingHorizontal: 17,
      minHeight: 105,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    back: { width: 46, minHeight: 52, alignItems: "center", justifyContent: "center" },
    backText: { color: theme.onAccent, fontSize: 44, lineHeight: 49, fontWeight: "300" },
    headerTitle: {
      flex: 1,
      color: theme.onAccent,
      fontSize: 20,
      lineHeight: 28,
      fontWeight: "900",
      textAlign: "center",
    },
    scrollContent: { alignItems: "center", paddingHorizontal: 18, paddingTop: 24 },
    contentWidth: { width: "100%", maxWidth: 640, gap: 18 },
    panel: { backgroundColor: theme.surface, borderRadius: 22, padding: 20, gap: 15 },
    panelTitle: { color: theme.text, fontSize: 19, lineHeight: 26, fontWeight: "800" },
    copy: { color: theme.text, fontSize: 14, lineHeight: 23 },
    caption: { color: theme.muted, fontSize: 13, lineHeight: 20 },
    bulletRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
    bullet: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.accent, marginTop: 8 },
    action: {
      minHeight: 51,
      borderRadius: 999,
      backgroundColor: theme.accent,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 11,
    },
    actionText: {
      color: theme.onAccent,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: "800",
      textAlign: "center",
    },
    secondaryAction: { backgroundColor: theme.raised, borderWidth: 1, borderColor: theme.border },
    secondaryActionText: { color: theme.text },
    rowTitle: { color: theme.text, fontSize: 15, fontWeight: "700", lineHeight: 22 },
    themePreview: { height: 125, flexDirection: "row", overflow: "hidden", borderRadius: 16 },
    selectedRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderColor: theme.accent,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 15,
      paddingVertical: 12,
    },
    faqCard: { backgroundColor: theme.surface, borderRadius: 18, padding: 18 },
    faqHeader: { flexDirection: "row", gap: 10, alignItems: "center" },
    error: { color: theme.dangerText, fontSize: 14, lineHeight: 21, textAlign: "center", padding: 10 },
  });
}

export function useSettingsPageStyles() {
  const theme = useAppTheme();
  return useMemo(() => createStyles(theme), [theme]);
}

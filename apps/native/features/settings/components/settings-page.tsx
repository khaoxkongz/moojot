import { router } from "expo-router";
import { useMemo, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ui/controls";
import { Text } from "@/components/ui/typography";
import { raisedRing, type AppTheme } from "@/constants/theme";
import { useAppTheme } from "@/lib/use-app-theme";

function navigateBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/settings");
}

export function SettingsPage({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  const styles = useSettingsPageStyles();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title={title} onBack={navigateBack} backLabel="กลับไปหน้าพี่มนุษย์" right={right} />
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
    scrollContent: { alignItems: "center", paddingHorizontal: 16, paddingTop: 12 },
    contentWidth: { width: "100%", maxWidth: 640, gap: 18 },
    panel: { backgroundColor: theme.surface, borderRadius: 16, padding: 16, gap: 14, ...raisedRing(theme) },
    panelTitle: { color: theme.text, fontSize: 17, lineHeight: 24 },
    copy: { color: theme.text, fontSize: 14, lineHeight: 23 },
    caption: { color: theme.muted, fontSize: 13, lineHeight: 20 },
    bulletRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
    bullet: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.accent, marginTop: 8 },
    action: {
      minHeight: 52,
      borderRadius: 26,
      backgroundColor: theme.accent,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 11,
    },
    actionText: {
      color: theme.onAccent,
      fontSize: 16,
      lineHeight: 22,
      textAlign: "center",
    },
    secondaryAction: { backgroundColor: theme.raised, borderWidth: 1, borderColor: theme.border },
    secondaryActionText: { color: theme.text },
    rowTitle: { color: theme.text, fontSize: 15, lineHeight: 22 },
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

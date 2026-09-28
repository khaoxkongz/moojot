import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/typography";

export const settingsColors = {
  navy: "#0B243B",
  dark: "#071D30",
  yellow: "#FFDA60",
  blue: "#1778F7",
  muted: "#A7B8C9",
  white: "#FFFFFF",
};

function navigateBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/settings");
}

export function SettingsPage({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={settingsPageStyles.screen}>
      <View style={[settingsPageStyles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="กลับไปหน้าพี่มนุษย์"
          onPress={navigateBack}
          hitSlop={10}
          style={settingsPageStyles.back}
        >
          <Text style={settingsPageStyles.backText}>‹</Text>
        </Pressable>
        <Text numberOfLines={1} style={settingsPageStyles.headerTitle}>
          {title}
        </Text>
        {right ?? <View style={{ width: 46 }} />}
      </View>
      {children}
    </View>
  );
}

export function SettingsScroll({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[settingsPageStyles.scrollContent, { paddingBottom: Math.max(32, insets.bottom + 30) }]}
    >
      <View style={settingsPageStyles.contentWidth}>{children}</View>
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        settingsPageStyles.action,
        secondary && settingsPageStyles.secondaryAction,
        disabled && { opacity: 0.48 },
      ]}
    >
      <Text style={[settingsPageStyles.actionText, secondary && settingsPageStyles.secondaryActionText]}>{label}</Text>
    </Pressable>
  );
}

export function SettingsPanel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={settingsPageStyles.panel}>
      {title ? <Text style={settingsPageStyles.panelTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function SettingsBullet({ children }: { children: ReactNode }) {
  return (
    <View style={settingsPageStyles.bulletRow}>
      <View style={settingsPageStyles.bullet} />
      <Text style={settingsPageStyles.copy}>{children}</Text>
    </View>
  );
}

export const settingsPageStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: settingsColors.navy },
  header: {
    backgroundColor: settingsColors.yellow,
    paddingHorizontal: 17,
    minHeight: 105,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  back: { width: 46, minHeight: 52, alignItems: "center", justifyContent: "center" },
  backText: { color: settingsColors.navy, fontSize: 44, lineHeight: 49, fontWeight: "300" },
  headerTitle: {
    flex: 1,
    color: "#152235",
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "900",
    textAlign: "center",
  },
  scrollContent: { alignItems: "center", paddingHorizontal: 18, paddingTop: 24 },
  contentWidth: { width: "100%", maxWidth: 640, gap: 18 },
  panel: { backgroundColor: settingsColors.dark, borderRadius: 22, padding: 20, gap: 15 },
  panelTitle: { color: settingsColors.white, fontSize: 19, lineHeight: 26, fontWeight: "800" },
  copy: { color: "#D3DFEA", fontSize: 14, lineHeight: 23 },
  caption: { color: settingsColors.muted, fontSize: 13, lineHeight: 20 },
  bulletRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  bullet: { width: 7, height: 7, borderRadius: 4, backgroundColor: settingsColors.blue, marginTop: 8 },
  action: {
    minHeight: 51,
    borderRadius: 999,
    backgroundColor: settingsColors.blue,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  actionText: {
    color: settingsColors.white,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800",
    textAlign: "center",
  },
  secondaryAction: { backgroundColor: "#20384E", borderWidth: 1, borderColor: "#3D5A74" },
  secondaryActionText: { color: "#D9E8F6" },
  rowTitle: { color: settingsColors.white, fontSize: 15, fontWeight: "700", lineHeight: 22 },
  themePreview: { height: 125, flexDirection: "row", overflow: "hidden", borderRadius: 16 },
  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderColor: settingsColors.blue,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  faqCard: { backgroundColor: settingsColors.dark, borderRadius: 18, padding: 18 },
  faqHeader: { flexDirection: "row", gap: 10, alignItems: "center" },
  error: { color: "#FFB5B5", fontSize: 14, lineHeight: 21, textAlign: "center", padding: 10 },
});

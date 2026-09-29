import { View } from "react-native";

import { Text } from "@/components/ui/typography";
import { themes } from "@/constants/theme";
import type { AppThemeMode } from "@/constants/theme";
import { useAppTheme } from "@/lib/use-app-theme";
import {
  SettingsPage,
  SettingsPanel,
  SettingsScroll,
  useSettingsPageStyles,
} from "@/features/settings/components/settings-page";

function ThemeSample({ mode, label }: { mode: AppThemeMode; label: string }) {
  const colors = themes[mode];
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>{label}</Text>
      <View
        style={{
          flexDirection: "row",
          gap: 6,
          padding: 7,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        {[colors.accent, colors.success, colors.danger].map((color) => (
          <View key={color} style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: color }} />
        ))}
      </View>
    </View>
  );
}

export default function ThemeSettingsScreen() {
  const theme = useAppTheme();
  const settingsPageStyles = useSettingsPageStyles();
  return (
    <SettingsPage title="เปลี่ยนธีม">
      <SettingsScroll>
        <SettingsPanel title="ธีมหมูจด">
          <Text style={settingsPageStyles.copy}>ธีมหมูจดใช้โทนเทาอุ่น ครีม และส้มอิฐ โดยปรับสว่าง–มืดตามระบบเครื่อง</Text>
          <View style={settingsPageStyles.themePreview}>
            <ThemeSample mode="light" label="สว่าง" />
            <ThemeSample mode="dark" label="มืด" />
          </View>
          <Text style={settingsPageStyles.caption}>
            ขณะนี้ใช้โหมด{theme.background === themes.dark.background ? "มืด" : "สว่าง"}ตามการตั้งค่าเครื่อง
          </Text>
        </SettingsPanel>
      </SettingsScroll>
    </SettingsPage>
  );
}

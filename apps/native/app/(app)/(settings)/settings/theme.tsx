import { Pressable, View } from "react-native";

import { InfoBox, RadioCard } from "@/components/ui/controls";
import { Text } from "@/components/ui/typography";
import { themes, type AppThemeMode } from "@/constants/theme";
import { themePreference, useColorScheme, useThemePreference } from "@/lib/use-color-scheme";
import { useAppTheme } from "@/lib/use-app-theme";
import {
  SettingsPage,
  SettingsPanel,
  SettingsScroll,
  useSettingsPageStyles,
} from "@/features/settings/components/settings-page";

const OPTIONS: readonly { value: AppThemeMode; label: string; sub: string }[] = [
  { value: "light", label: "สว่าง", sub: "พื้นครีม ตัวอักษรเทาเข้ม" },
  { value: "dark", label: "มืด", sub: "พื้นเทาเข้ม ตัวอักษรครีม" },
];
const LABEL = Object.fromEntries(OPTIONS.map((option) => [option.value, option.label])) as Record<AppThemeMode, string>;

function Swatch({ mode }: { mode: AppThemeMode }) {
  const colors = themes[mode];
  return (
    <View
      style={{
        width: 44,
        height: 32,
        borderRadius: 10,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
      }}
    >
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.text }} />
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }} />
    </View>
  );
}

export default function ThemeSettingsScreen() {
  const theme = useAppTheme();
  const styles = useSettingsPageStyles();
  const { colorScheme } = useColorScheme();
  const { choice, loadFailed, saveFailed } = useThemePreference();

  // The snapshot already records a failed save; the screen shows it from there.
  const choose = (next: AppThemeMode) => void themePreference.choose(next).catch(() => {});

  return (
    <SettingsPage title="ธีม">
      <SettingsScroll>
        <SettingsPanel>
          <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
            {OPTIONS.map((option) => (
              <RadioCard
                key={option.value}
                label={option.label}
                sub={option.sub}
                selected={choice === option.value}
                onPress={() => choose(option.value)}
                trailing={<Swatch mode={option.value} />}
              />
            ))}
          </View>
          <Text style={styles.caption}>
            {choice
              ? `ทุกหน้าใช้ธีม${LABEL[choice]} หมูจำไว้ในเครื่องนี้`
              : `ยังไม่ได้เลือก ตอนนี้ใช้ธีม${LABEL[colorScheme]}ตามการตั้งค่าเครื่อง`}
          </Text>
        </SettingsPanel>
        {saveFailed ? (
          <InfoBox
            tone="danger"
            icon="alert-circle-outline"
            title={`บันทึกธีม${LABEL[saveFailed]}ไม่สำเร็จ`}
            body={`ยังใช้ธีม${LABEL[colorScheme]}อยู่`}
            action={
              <Pressable
                accessibilityRole="button"
                onPress={() => choose(saveFailed)}
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Text style={{ color: theme.accentText, fontSize: 14 }}>ลองบันทึกอีกครั้ง ›</Text>
              </Pressable>
            }
          />
        ) : null}
        {loadFailed && !saveFailed ? (
          <InfoBox
            tone="danger"
            icon="alert-circle-outline"
            title="โหลดธีมที่เลือกไว้ไม่สำเร็จ"
            body="ตอนนี้ใช้ธีมตามการตั้งค่าเครื่อง เลือกธีมอีกครั้งเพื่อบันทึกใหม่"
          />
        ) : null}
      </SettingsScroll>
    </SettingsPage>
  );
}

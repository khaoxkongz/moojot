import { View } from "react-native";

import { Text } from "@/components/ui/typography";
import {
  SettingsPage,
  SettingsPanel,
  SettingsScroll,
  settingsColors,
  settingsPageStyles,
} from "@/features/settings/components/settings-page";

export default function LanguageSettingsScreen() {
  return (
    <SettingsPage title="ภาษา / Language">
      <SettingsScroll>
        <SettingsPanel title="ภาษาที่ใช้">
          <View style={settingsPageStyles.selectedRow}>
            <Text style={settingsPageStyles.rowTitle}>ภาษาไทย</Text>
            <Text style={{ color: settingsColors.blue, fontSize: 24, fontWeight: "800" }}>✓</Text>
          </View>
          <Text style={settingsPageStyles.copy}>หมูจดเวอร์ชันนี้แสดงเมนูและข้อความเป็นภาษาไทย</Text>
          <Text style={settingsPageStyles.caption}>ภาษาอังกฤษยังไม่พร้อมให้เลือก</Text>
        </SettingsPanel>
      </SettingsScroll>
    </SettingsPage>
  );
}

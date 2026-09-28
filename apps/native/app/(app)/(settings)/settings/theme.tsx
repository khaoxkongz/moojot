import { View } from "react-native";

import { Text } from "@/components/ui/typography";
import {
  SettingsPage,
  SettingsPanel,
  SettingsScroll,
  settingsColors,
  settingsPageStyles,
} from "@/features/settings/components/settings-page";

export default function ThemeSettingsScreen() {
  return (
    <SettingsPage title="เปลี่ยนธีม">
      <SettingsScroll>
        <SettingsPanel title="ธีมหมูจด">
          <Text style={settingsPageStyles.copy}>สีเหลืองสดใสและน้ำเงินเข้มคือธีมหลักของหมูจดในเวอร์ชันนี้</Text>
          <View style={settingsPageStyles.themePreview}>
            <View
              style={{
                flex: 1,
                backgroundColor: settingsColors.yellow,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: settingsColors.navy, fontSize: 20, fontWeight: "800" }}>หมูจด</Text>
            </View>
            <View
              style={{ flex: 1, backgroundColor: settingsColors.navy, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: settingsColors.white, fontSize: 20, fontWeight: "800" }}>หมูจด</Text>
            </View>
          </View>
          <Text style={settingsPageStyles.caption}>ตอนนี้ยังไม่มีธีมอื่นให้เลือก</Text>
        </SettingsPanel>
      </SettingsScroll>
    </SettingsPage>
  );
}

import { router } from "expo-router";

import { Text } from "@/components/ui/typography";
import {
  SettingsAction,
  SettingsPage,
  SettingsPanel,
  SettingsScroll,
  useSettingsPageStyles,
} from "@/features/settings/components/settings-page";

export default function SupportedCardsSettingsScreen() {
  const settingsPageStyles = useSettingsPageStyles();
  return (
    <SettingsPage title="บัตรเครดิตที่หมูจดได้">
      <SettingsScroll>
        <SettingsPanel title="จดรายการบัตรเครดิต">
          <Text style={settingsPageStyles.copy}>
            จดรายจ่ายจากบัตรเครดิตเองได้ทุกบัตร รายการจากใบแจ้งยอดที่เคยบันทึกไว้ยังดูและแก้ไขได้ตามปกติ
          </Text>
          <Text style={settingsPageStyles.caption}>ตอนนี้หมูจดยังไม่อ่านไฟล์ใบแจ้งยอด PDF</Text>
        </SettingsPanel>
        <SettingsAction label="จดรายการเอง" onPress={() => router.push("/entry")} secondary />
      </SettingsScroll>
    </SettingsPage>
  );
}

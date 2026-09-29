import { router } from "expo-router";

import { Text } from "@/components/ui/typography";
import {
  SettingsAction,
  SettingsBullet,
  SettingsPage,
  SettingsPanel,
  SettingsScroll,
  useSettingsPageStyles,
} from "@/features/settings/components/settings-page";

export default function SlipHelpSettingsScreen() {
  const settingsPageStyles = useSettingsPageStyles();
  return (
    <SettingsPage title="หมูไม่อ่านสลิป?">
      <SettingsScroll>
        <SettingsPanel title="ตรวจไฟล์ก่อน">
          <SettingsBullet>ใช้ภาพสลิปต้นฉบับที่เห็นวันที่ ยอดเงิน และชื่อผู้รับชัดเจน</SettingsBullet>
          <SettingsBullet>หากเป็น PDF ให้ลองไฟล์ใบแจ้งยอดต้นฉบับและใส่รหัสผ่านเมื่อไฟล์ถูกล็อก</SettingsBullet>
          <SettingsBullet>ถ้ายังอ่านไม่ได้ คุณสามารถจดรายการเองได้</SettingsBullet>
        </SettingsPanel>
        <SettingsPanel title="บริการอ่านเอกสาร">
          <Text style={settingsPageStyles.copy}>
            หมูจดส่งเฉพาะไฟล์ที่คุณเลือกผ่านเซิร์ฟเวอร์หมูจดไปยัง Google Gemini 3.8 Flash เพื่อวิเคราะห์ข้อมูล
            ต้องเชื่อมต่ออินเทอร์เน็ตและตรวจผลก่อนบันทึกทุกครั้ง
          </Text>
        </SettingsPanel>
        <SettingsAction label="ไปหน้านำเข้า" onPress={() => router.push("/import")} secondary />
      </SettingsScroll>
    </SettingsPage>
  );
}

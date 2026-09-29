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

export default function SlipsSettingsScreen() {
  const settingsPageStyles = useSettingsPageStyles();
  return (
    <SettingsPage title="สลิปที่หมูจดอ่านได้">
      <SettingsScroll>
        <SettingsPanel title="การนับสลิปในอัลบั้ม">
          <Text style={settingsPageStyles.copy}>
            เมื่ออนุญาตให้เข้าถึงรูปภาพทั้งหมด หมูจดจะนับรูปย้อนหลัง 30 วันจากอัลบั้ม Krungthai NEXT, K PLUS, Paotang และ TrueMoney
            บนเครื่อง จำนวนนี้ยังไม่ได้ตรวจว่าทุกรูปเป็นสลิปจริง
          </Text>
        </SettingsPanel>
        <SettingsPanel title="ไฟล์ที่นำเข้าได้">
          <SettingsBullet>รูปภาพสลิปที่เลือกจากคลังรูปภาพ</SettingsBullet>
          <SettingsBullet>ใบแจ้งยอดบัตรเครดิตไฟล์ PDF</SettingsBullet>
          <Text style={settingsPageStyles.copy}>
            ผลการอ่านด้วย AI ขึ้นอยู่กับความชัดของภาพและรูปแบบไฟล์ หมูจดจะแสดงรายการให้คุณตรวจและเลือกบันทึกทุกครั้ง
          </Text>
        </SettingsPanel>
        <SettingsAction label="ดูวิธีแก้เมื่ออ่านไม่สำเร็จ" onPress={() => router.push("/settings/slip-help")} secondary />
      </SettingsScroll>
    </SettingsPage>
  );
}

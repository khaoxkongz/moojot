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
        <SettingsPanel title="ตอนเริ่มใช้งาน: นับรูปในอัลบั้ม">
          <Text style={settingsPageStyles.copy}>
            เมื่ออนุญาตให้เข้าถึงรูปภาพทั้งหมด หมูจดจะนับรูปย้อนหลัง 30 วันจากอัลบั้ม Krungthai NEXT, K PLUS, Paotang และ TrueMoney
            บนเครื่อง จำนวนนี้ยังไม่ได้ตรวจว่าทุกรูปเป็นสลิปจริง และยังไม่ใช่รายการที่บันทึก
          </Text>
        </SettingsPanel>
        <SettingsPanel title="หน้าแรก: อ่านและจดให้อัตโนมัติ">
          <SettingsBullet>รูปสลิป JPEG หรือ PNG ย้อนหลัง 30 วันจากอัลบั้มข้างบน</SettingsBullet>
          <SettingsBullet>ต้องอนุญาตให้เข้าถึงรูปภาพทั้งหมด</SettingsBullet>
          <Text style={settingsPageStyles.copy}>
            เมื่อเปิดหน้าแรก หมูจดจะส่งรูปเหล่านี้ผ่านเซิร์ฟเวอร์หมูจดไปให้ Google Gemini อ่าน
            แล้วบันทึกรายการจากสลิปที่อ่านได้ครบให้อัตโนมัติโดยยังไม่เลือกหมวด รูปที่ไม่ใช่สลิปหรือข้อมูลไม่ครบจะถูกข้าม คุณเลือกหมวด แก้ไข
            หรือลบรายการได้ภายหลัง
          </Text>
        </SettingsPanel>
        <SettingsAction label="ดูวิธีแก้เมื่ออ่านไม่สำเร็จ" onPress={() => router.push("/settings/slip-help")} secondary />
      </SettingsScroll>
    </SettingsPage>
  );
}

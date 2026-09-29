import { Text } from "@/components/ui/typography";
import {
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
        <SettingsPanel title="ตรวจก่อน">
          <SettingsBullet>อนุญาตให้หมูจดเข้าถึงรูปภาพทั้งหมด ถ้าให้เฉพาะบางรูป หน้าแรกจะมีปุ่มไปที่การตั้งค่า</SettingsBullet>
          <SettingsBullet>ให้แอปธนาคารบันทึกสลิปลงอัลบั้ม Krungthai NEXT, K PLUS, Paotang หรือ TrueMoney</SettingsBullet>
          <SettingsBullet>สลิปต้องเป็นรูปในช่วง 30 วันย้อนหลัง และเห็นวันที่ ยอดเงิน และชื่อผู้รับชัดเจน</SettingsBullet>
          <SettingsBullet>ถ้ายังอ่านไม่ได้ คุณสามารถจดรายการเองได้</SettingsBullet>
        </SettingsPanel>
        <SettingsPanel title="บริการอ่านสลิป">
          <Text style={settingsPageStyles.copy}>
            เมื่อเปิดหน้าแรก หมูจดส่งรูปจากอัลบั้มที่รองรับผ่านเซิร์ฟเวอร์หมูจดไปให้ Google Gemini อ่าน แล้วบันทึกรายการให้อัตโนมัติ
            ต้องเชื่อมต่ออินเทอร์เน็ต รูปที่อ่านไม่สำเร็จชั่วคราวจะลองใหม่ภายหลัง
          </Text>
        </SettingsPanel>
      </SettingsScroll>
    </SettingsPage>
  );
}

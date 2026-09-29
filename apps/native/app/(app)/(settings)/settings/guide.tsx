import { router } from "expo-router";

import {
  SettingsAction,
  SettingsBullet,
  SettingsPage,
  SettingsPanel,
  SettingsScroll,
} from "@/features/settings/components/settings-page";

export default function GuideSettingsScreen() {
  return (
    <SettingsPage title="แนะนำการใช้งาน">
      <SettingsScroll>
        <SettingsPanel title="เริ่มจดใน 3 ขั้นตอน">
          <SettingsBullet>กด “จดเพิ่ม” เพื่อบันทึกรายรับ รายจ่าย หรือย้ายเงิน</SettingsBullet>
          <SettingsBullet>เลือกหมวดหมู่และแท็ก เพื่อให้หน้าสรุปแยกยอดได้ชัดเจน</SettingsBullet>
          <SettingsBullet>เปิดหน้าสถิติเพื่อดูวันต่อเนื่องและให้แครอตน้องหมู</SettingsBullet>
        </SettingsPanel>
        <SettingsAction label="เริ่มจดรายการ" onPress={() => router.push("/entry")} />
        <SettingsAction label="ดูหน้าสรุป" onPress={() => router.push("/summary")} secondary />
      </SettingsScroll>
    </SettingsPage>
  );
}

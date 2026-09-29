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
        <SettingsPanel title="ใบแจ้งยอดที่นำเข้าได้">
          <Text style={settingsPageStyles.copy}>
            หมูจดรับไฟล์ PDF และให้ Gemini ช่วยแยกรายการ ความสามารถในการอ่านแต่ละผู้ให้บริการขึ้นอยู่กับรูปแบบ PDF ที่ใช้
          </Text>
          <Text style={settingsPageStyles.caption}>แอปยังไม่มีรายชื่อผู้ให้บริการบัตรที่รับประกันการอ่านได้ทุกไฟล์</Text>
        </SettingsPanel>
        <SettingsAction
          label="ลองนำเข้าใบแจ้งยอด PDF"
          onPress={() => router.push({ pathname: "/import", params: { type: "statement" } })}
        />
        <SettingsAction label="จดรายการเอง" onPress={() => router.push("/entry")} secondary />
      </SettingsScroll>
    </SettingsPage>
  );
}

import { useState } from "react";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/typography";
import { useAppTheme } from "@/lib/use-app-theme";
import { SettingsPage, SettingsScroll, useSettingsPageStyles } from "@/features/settings/components/settings-page";

const faqs = [
  {
    question: "ข้อมูลรายรับรายจ่ายเก็บไว้ที่ไหน?",
    answer: "รายการ หมวดหมู่ แท็ก และงบประมาณเก็บบนเซิร์ฟเวอร์หมูจด โดยผูกกับอีเมลบัญชีที่ใช้งานอยู่ คุณสามารถส่งออกไฟล์ CSV เพื่อเก็บสำเนาได้",
  },
  {
    question: "หมูจดอ่านรูปในเครื่องเองหรือไม่?",
    answer:
      "หากคุณให้สิทธิ์เข้าถึงรูปภาพทั้งหมด แอปจะอ่านชื่ออัลบั้มและวันที่สร้างรูป เพื่อนับรูปในอัลบั้มสลิปย้อนหลัง 30 วันบนเครื่อง โดยไม่ส่งภาพไปยังเซิร์ฟเวอร์ เฉพาะรูปหรือไฟล์ที่คุณเลือกนำเข้าจึงจะถูกส่งผ่านเซิร์ฟเวอร์หมูจดไปยัง Google Gemini เพื่อวิเคราะห์รายการ และคุณต้องตรวจรายการก่อนบันทึกเสมอ",
  },
  {
    question: "ทำไมสลิปหรือใบแจ้งยอดบางไฟล์อ่านไม่ได้?",
    answer: "รูปที่ไม่ชัด ถูกครอบตัด PDF ที่ซับซ้อน หรือการเชื่อมต่อขัดข้องอาจทำให้อ่านไม่ได้ ลองใช้ไฟล์ต้นฉบับแล้วนำเข้าใหม่ หรือจดรายการเองได้เสมอ",
  },
  {
    question: "การย้ายเงินนับเป็นรายรับหรือรายจ่ายไหม?",
    answer: "ไม่นับ รายการย้ายเงินระหว่างบัญชีของตัวเองจะแสดงแยกจากยอดรายรับและรายจ่าย เพื่อไม่ให้ยอดรวมซ้ำ",
  },
  {
    question: "แครอตและวันต่อเนื่องนับอย่างไร?",
    answer:
      "เมื่อจดรายรับหรือรายจ่ายในวันนั้น คุณสามารถให้อาหารน้องหมูได้วันละหนึ่งครั้ง วิธีนับความต่อเนื่องเลือกได้ในหน้าสถิติ ส่วนรายการย้ายเงินไม่ทำให้วันนั้นนับเป็นวันที่จด",
  },
];

export default function FaqSettingsScreen() {
  const theme = useAppTheme();
  const settingsPageStyles = useSettingsPageStyles();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <SettingsPage title="คำถามที่พบบ่อย">
      <SettingsScroll>
        {faqs.map((item, index) => (
          <Pressable
            key={item.question}
            accessibilityRole="button"
            accessibilityState={{ expanded: openFaq === index }}
            onPress={() => setOpenFaq(openFaq === index ? null : index)}
            style={settingsPageStyles.faqCard}
          >
            <View style={settingsPageStyles.faqHeader}>
              <Text style={[settingsPageStyles.rowTitle, { flex: 1 }]}>{item.question}</Text>
              <Text style={{ color: theme.accentText, fontSize: 25 }}>{openFaq === index ? "−" : "+"}</Text>
            </View>
            {openFaq === index ? (
              <Text style={[settingsPageStyles.copy, { paddingTop: 12 }]}>{item.answer}</Text>
            ) : null}
          </Pressable>
        ))}
      </SettingsScroll>
    </SettingsPage>
  );
}

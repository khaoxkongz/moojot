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
    question: "หมูจดอ่านสลิปจากรูปในเครื่องอย่างไร?",
    answer:
      "ตอนเริ่มใช้งาน หมูจดนับรูปย้อนหลัง 30 วันในอัลบั้ม Krungthai NEXT, K PLUS, Paotang และ TrueMoney บนเครื่องเท่านั้น เมื่อเปิดหน้าแรก หมูจดจะส่งรูปจากอัลบั้มเหล่านี้ผ่านเซิร์ฟเวอร์หมูจดไปให้ Google Gemini อ่าน แล้วบันทึกรายการจากสลิปที่อ่านได้ครบให้อัตโนมัติโดยยังไม่เลือกหมวด คุณเลือกหมวด แก้ไข หรือลบรายการได้ภายหลัง รูปเดิมจะไม่ถูกบันทึกซ้ำ",
  },
  {
    question: "ทำไมสลิปบางรูปไม่ถูกจด?",
    answer:
      "หมูจดอ่านเฉพาะรูป JPEG หรือ PNG ย้อนหลัง 30 วันในอัลบั้มที่รองรับ รูปที่ไม่ใช่สลิป ไม่ชัด ถูกครอบตัด หรือข้อมูลไม่ครบจะถูกข้าม ส่วนรูปที่อ่านไม่สำเร็จเพราะการเชื่อมต่อหรือระบบขัดข้อง หมูจดจะลองใหม่ภายหลังเมื่อคุณเปิดหน้าแรก คุณจดรายการเองได้เสมอ",
  },
  {
    question: "ถ้าไม่ให้สิทธิ์รูปภาพทั้งหมด ยังใช้หมูจดได้ไหม?",
    answer:
      "ได้ คุณยังดูรายการเดิม จดรายการเอง และเลือกหมวดได้ตามปกติ หมูจดจะพักการอ่านสลิปอัตโนมัติไว้ และหน้าแรกจะมีปุ่มไปเปิดสิทธิ์เข้าถึงรูปภาพทั้งหมด เมื่อเปิดแล้วกลับมาที่หน้าแรก หมูจดจะเริ่มอ่านสลิปต่อเอง",
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

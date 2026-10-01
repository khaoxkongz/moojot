# 23: ปุ่มคีย์บอร์ดจริงกับ keypad จำนวนเงินบน iOS

**What to build:** ต่อคีย์บอร์ดจริง (Bluetooth/iPad keyboard) กับ keypad จำนวนเงินในหน้าจดรายการบน iOS ให้กดตัวเลข เครื่องหมาย ⌫ และ Enter ได้เหมือนบนเว็บ

**Blocked by:** 04 — [จดเองและแก้รายการ](04-manual-entry.md)

**Status:** needs-triage

**Source:** [Spec: ปรับแอปหมูจดตามดีไซน์ใหม่ — ตรวจรับ iOS ก่อน](../spec.md) (Keypad “พร้อม hardware keys”)

**Why blocked:** ใช้ calculator และ keypad จากงานจดเอง ซึ่งรับปุ่มคีย์บอร์ดบนเว็บแล้ว

**Why deferred from 04:** บน iOS (Expo Go) React Native ไม่ส่ง key event ถ้าไม่มีช่องพิมพ์ที่ focus อยู่ จึงต้องใช้ native module (เช่น `UIKeyCommand`) ซึ่งต้องใช้ dev build แทน Expo Go หรือหาทางที่ไม่ต้องเปิดคีย์บอร์ดบนจอ

- [ ] เลือกวิธีรับปุ่มบน iOS (native module/dev build หรือช่องพิมพ์ซ่อน) และบอกผลต่อการทดสอบด้วย Expo Go
- [ ] ใช้ `calculatorKeyForHardware` เดิม ให้ปุ่มตรงกับเว็บ (ตัวเลข + − \* x / % , . Backspace Delete Enter =)
- [ ] keypad บนจอยังใช้ได้ตามเดิม และคีย์บอร์ดบนจอไม่เด้งขึ้นเอง
- [ ] ตรวจบน iPhone/iPad ที่ต่อคีย์บอร์ดจริง

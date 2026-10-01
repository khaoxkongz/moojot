# 04: จดเองและแก้รายการ

**What to build:** กดจดเพิ่ม ใส่ยอด เลือกวัน หมวด/แท็ก ธนาคาร และบันทึก/แก้/ลบ/เอารายการกลับคืนได้ครบกับ API

**Blocked by:** 01 — [ตัวอักษรและธีมบน iOS](01-ios-theme-foundation.md)

**Status:** draft — awaiting breakdown approval

**Source:** [Spec: ปรับแอปหมูจดตามดีไซน์ใหม่ — ตรวจรับ iOS ก่อน](../spec.md)

**User stories:** 6, 8–10, 36–46

**Why blocked:** ใช้ฐาน controls/typography/theme; ทดสอบด้วยบัญชีที่เข้าสู่ระบบอยู่แล้วได้ ไม่ต้องรอ flow สมัครใหม่

- [ ] จดเพิ่มเปิด modal โดยตรง รายจ่าย/รายรับ/ย้ายเงินเป็นคำไทย Type switch ล้างหมวดที่ไม่เข้ากัน และย้ายเงินไม่นับรายรับรายจ่าย
- [ ] Keypad คำนวณ AC/%/พื้นฐาน/paste/hardware keys รองรับสองทศนิยม/12 digits พร้อม error; ยืนยันยอดใหม่เปิด category sheet
- [ ] เลือกวันย้อนหลัง/วันนี้และห้ามเลือกอนาคต ไม่มีช่องกรอกเวลา; title fallback, note, category/tags และ bank selection บันทึกเป็น satang/วันรายการถูกต้อง
- [ ] เลือกบัตรที่มีอยู่ด้วยชื่อ+last4 ได้; flow เพิ่มบัตรใบแรกเป็นงานเพิ่มและเลือกบัตร ไม่ hardcode บัตรตัวอย่าง
- [ ] Close เปลี่ยน draft แสดง save/discard; save failure รักษา draft และยังแก้ได้ พร้อม duplicate-submit guard
- [ ] ลบ entry ทันทีและ toast ล่าสุด 5 วินาที เอากลับคืนคืน ID/fields เดิมผ่าน server โดยไม่สร้าง clone; delete/restore failure แสดงตามจริง
- [ ] Query consumers เห็นผลหลัง create/edit/delete/restore และตรวจ UI keyboard/back/ข้อความยาว/ยอดยาว light-dark บน iOS

# 05: หน้าแรก ตัวกรอง และคิวเลือกหมวด

**What to build:** ดูรายการรายวันตามรอบบัญชี กรองธนาคาร/บัตร และจัดหมวดเป็นคิวหรือเปิดแก้รายการได้จาก Home

**Blocked by:** 04 — [จดเองและแก้รายการ](04-manual-entry.md)

**Status:** draft — awaiting breakdown approval

**Source:** [Spec: ปรับแอปหมูจดตามดีไซน์ใหม่ — ตรวจรับ iOS ก่อน](../spec.md)

**User stories:** 28–35, 69

**Why blocked:** คิวมี action แก้รายการและจดเพิ่มที่ใช้ editor ในงานจดเองและแก้รายการ

- [ ] Hero ยอดรายจ่าย วัน/ยอดรายวัน รายรับ +, sources, pending, badge/empty/loading/error และจดล่าสุดจากเวลาบันทึกจริงตรง copy
- [ ] เดือน/สัปดาห์/สองสัปดาห์และ custom month start ใช้ขอบเขตจริง next รอบปัจจุบัน disabled พร้อม label ที่ตรง
- [ ] Filter ธนาคารรวมตามชื่อ บัตรชื่อ+last4 และไม่ระบุมี identity เดียวกับ entry; manual ที่เลือกธนาคารไม่ถูกนับในไม่ระบุ
- [ ] Select all/clear/notice count และ filter state ใช้ร่วม Summary ได้ โดยไม่มี seed bank/card กลายเป็นข้อมูลผู้ใช้
- [ ] คิวหมวด count/next/skip/edit/completion ตรง scope ที่เปิด เลือกหมวดบันทึกจริงและ refresh; ย้ายเงินไม่เป็น pending
- [ ] ข้อมูลเกิน 1,000 แถวไม่ทำให้ counts/day totals แสดงเฉพาะหน้าแรกเป็นทั้งหมด
- [ ] เดิน Home→create/edit→filter→queue บน iOS พร้อม read/update failure และ recovery

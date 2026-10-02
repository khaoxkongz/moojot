# 20: หน้า พี่มนุษย์ และคำแนะนำ

**What to build:** ใช้โปรไฟล์ที่รวมเครื่องมือพร้อมสถานะจริง การตั้งค่า/consent และความช่วยเหลือ โดยทุกลิงก์หลักพาไป flow ที่ทำงานแล้ว

**Blocked by:** 07 — [ผลอ่านสลิปและงานต้องช่วยหมู](07-slip-work-queue.md)

**Status:** ready-for-agent

**Source:** [Spec: ปรับแอปหมูจดตามดีไซน์ใหม่ — ตรวจรับ iOS ก่อน](../spec.md)

**User stories:** 95–98

**Why blocked:** ใช้ route/สถานะผลอ่านสลิปแบบใหม่จากงานผลอ่านสลิป ส่วน auth, consent, planning, calendar, streak และ card queries/routes เดิมเป็นฐานที่ยังใช้งานได้ จึงเริ่มปรับหน้าโปรไฟล์ได้ก่อนเปลี่ยนหน้าตาของปลายทางทั้งหมด

- [ ] Sections/copy/assets ตรง handoff เครื่องมืออยู่ก่อนพร้อม budget/over/rule/streak/import/card status จริง (story 95)
- [ ] Email จาก session และสอง consent switches ใช้ค่าเดียวกับ onboarding จัดการ pending/failure ไม่กลับค่าเก่าผิดลำดับ (story 96)
- [ ] ทุก row ไปหน้าหรือ sheet ที่ทำงานแล้ว: หมวด/แท็ก ปฏิทิน ธีม งบ/กฎ แครอต สลิป บัตร และ CSV
- [ ] FAQ accordion/guide/terms/slip help เปิดเป็น sheets และข้อความตรงการอ่านอัตโนมัติ/งานค้าง/พักแอปจริง (story 97)
- [ ] ภาษาเป็น info ไทย Version จริง social links ที่ยังไม่พร้อมเป็น caption ตามแบบ ไม่เป็นปุ่มไม่มี handler
- [ ] Signout confirm ไป auth พร้อม email ล่าสุด และยกเลิก/แยก scan/query/attachments ของบัญชีที่ออก (story 98)
- [ ] ตรวจ dynamic states/consent contracts และเดิน profile→เครื่องมือ/help/logout บน iOS ทั้ง light/dark

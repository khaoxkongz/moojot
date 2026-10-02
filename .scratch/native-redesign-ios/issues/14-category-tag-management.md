# 14: สร้างและจัดการหมวดกับแท็ก

**What to build:** ใช้หน้าหมวด/แท็กแบบ tabs เพื่อสร้าง แก้ และเลือกใช้ พร้อมจำนวนรายการที่ใช้และ validation ที่สอดคล้องทุกทาง

**Blocked by:** 04 — [จดเองและแก้รายการ](04-manual-entry.md)

**Status:** ready-for-agent

**Source:** [Spec: ปรับแอปหมูจดตามดีไซน์ใหม่ — ตรวจรับ iOS ก่อน](../spec.md)

**User stories:** 85–87

**Why blocked:** ต้องกลับเข้า editor พร้อม draft และเลือกข้อมูลที่เพิ่งแก้จากงานจดเองได้

- [ ] Expense/income tabs, custom list/usage counts และ system grid ตรงดีไซน์ ข้อมูลมากกว่า 1,000 แถวมี counts ครบ (story 85)
- [ ] Custom category เลือก emoji และ tags มี suggestions/one-tap add; ไม่มี color picker ตาม handoff (story 86)
- [ ] Name duplicates และ tag ≤20 ตรวจทั้ง create/update/inline editor paths ไม่ขึ้นกับ UI เพียงทางเดียว (story 87)
- [ ] System category แก้/ลบไม่ได้ทั้ง UI และ API (story 87)
- [ ] Editor เปิด manager ซ้อนแล้วกลับมายัง draft เดิมได้ ตัวเลือกใหม่/แก้ refresh และเลือกไปบันทึกรายการจริง
- [ ] Loading/error/save failure ไม่กลายเป็น empty/success และรักษาข้อมูลกรอก
- [ ] ตรวจ server validation/usage counts กับ fixtures และ manager→editor บน iOS; cascade undo เป็นงานแยกที่ต้องเสร็จก่อนรับ feature ทั้งชุด

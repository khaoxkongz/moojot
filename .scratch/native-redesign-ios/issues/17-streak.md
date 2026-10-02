# 17: แครอต สตรีค และบทสอน

**What to build:** ดูความต่อเนื่อง ให้อาหารหมู เปลี่ยนเกณฑ์นับ และเรียนผ่านบทสอนสี่หน้าโดยข้อมูลจริงไม่ถูกรีเซ็ต

**Blocked by:** 05 — [หน้าแรก ตัวกรอง และคิวเลือกหมวด](05-home-filter-queue.md)

**Status:** ready-for-agent

**Source:** [Spec: ปรับแอปหมูจดตามดีไซน์ใหม่ — ตรวจรับ iOS ก่อน](../spec.md)

**User stories:** 99–102

**Why blocked:** ต้องใช้คิวหมวด/จดเพิ่มและรายการวันจริงจาก Home เพื่อทำเกณฑ์ก่อน feed

- [ ] Today status, 7-day row, streak และ carrots ใช้วันรายการ/setting จริง ไม่ใช้ตัวเลข seed (story 99)
- [ ] Feed วันละหนึ่งครั้งเมื่อเข้าเกณฑ์ recorded/categorized และ enabled; รอผล server ก่อนเพิ่ม/แจ้งสำเร็จ (story 100)
- [ ] ไม่เข้าเกณฑ์พาไปจดหรือคิวหมวด และ error/retry ไม่เพิ่มแครอตซ้ำ
- [ ] สาม options recorded/categorized/off และเปิดกลับได้ ปิดไม่ลบ entries/reset progress โดยปริยาย (story 101)
- [ ] Tutorial 4 illustrations พร้อม back/next ตาม handoff และ help sheet อธิบายเกณฑ์จริง (story 102)
- [ ] ตรวจ API day/timezone/count/ownership และ feed/settings/tutorial บน iOS

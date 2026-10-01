# 16: ตั้งค่าปฏิทินแล้วใช้ทันที

**What to build:** แตะเลือกรอบ วันเริ่มสัปดาห์/เดือน และ anchor ได้ทันที พร้อมช่วงจริงและคืนค่าเริ่มต้น/เอาค่าก่อนหน้ากลับคืน

**Blocked by:** 05 — [หน้าแรก ตัวกรอง และคิวเลือกหมวด](05-home-filter-queue.md)

**Status:** ready-for-agent

**Source:** [Spec: ปรับแอปหมูจดตามดีไซน์ใหม่ — ตรวจรับ iOS ก่อน](../spec.md)

**User stories:** 91–94

**Why blocked:** ใช้ period/consumer refresh ของ Home ที่พร้อม; API Summary/งบเดิมใช้ทดสอบขอบเขตได้โดยไม่ต้องรอเปลี่ยนหน้าตาของสองหน้า

- [ ] Radio cards/chips/day grid ครบ month/week/fortnight, weekday, anchor this/last week และ month day1–31 ไม่มี save-confirm
- [ ] Changing weekday reset anchor ตามต้นแบบ ใช้ actual ranges/capped month days และ labels start month
- [ ] Apply จริงและ refresh Home/summary/budget consumers ให้ตรงกัน มี caption ระบุ month start มีผลกับหน้าใด
- [ ] Rapid changes/คำตอบเก่าที่มาทีหลังไม่ย้อนค่า และ failure จัดการ optimistic rollback/pending ตามจริง
- [ ] Reset default แสดงเฉพาะเมื่อค่าไม่ default พร้อม undo คืน preferences ก่อน reset ไม่ reset financial entries
- [ ] ตรวจ contracts/order/ranges/leap month และ tap→Home range/reset/undo บน iOS

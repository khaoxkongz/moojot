# 08: สรุปยอดและแนวโน้ม

**What to build:** จาก Home เปิด Summary ของเดือนที่สัมพันธ์กับช่วงที่ดู เห็นยอด สัดส่วนแท่ง และแนวโน้มหกเดือน พร้อมจัดหมวดใน scope ได้

**Blocked by:** 05 — [หน้าแรก ตัวกรอง และคิวเลือกหมวด](05-home-filter-queue.md)

**Status:** draft — awaiting breakdown approval

**Source:** [Spec: ปรับแอปหมูจดตามดีไซน์ใหม่ — ตรวจรับ iOS ก่อน](../spec.md)

**User stories:** 60–63

**Why blocked:** ใช้ period/filter state และคิวหมวดที่เสร็จในงานหน้าแรก

- [ ] Monthly/custom bounds, income/expense/net และเหลือ/ใช้เกินรายรับตรงข้อมูลและตัวกรอง
- [ ] Category/tag bars แสดงยอด/share จริงและ pending group เปิดคิวเฉพาะ period/filter; transfer แยกจาก income/expense
- [ ] Tag หลายแท็กใช้ kind total เป็นฐาน ไม่ normalize shares ให้รวม 100% โดยผิดความหมาย
- [ ] Trend หกเดือนสิ้นสุดเดือนที่เลือกพร้อม comparison และ zero/empty/error states
- [ ] ลิงก์วางแผนงบคงเดือนที่เกี่ยวข้องและไม่อ้าง budget เป็นของ wallet filter โดยไม่มี contract
- [ ] ตรวจ API totals กับ fixtures หลายเดือน/หลายแท็ก/custom dates และ Home→Summary→queue บน iOS

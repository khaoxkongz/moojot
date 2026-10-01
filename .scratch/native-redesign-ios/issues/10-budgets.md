# 10: ตั้งงบและเอางบกลับคืน

**What to build:** ตั้งงบรวม/หมวด/แท็ก ดูวงเงินกับยอดจริง แก้แทนวงเงินเดิม และลบแล้วเอางบเดิมกลับคืนได้

**Blocked by:** 01 — [ตัวอักษรและธีมบน iOS](01-ios-theme-foundation.md)

**Status:** ready-for-agent

**Source:** [Spec: ปรับแอปหมูจดตามดีไซน์ใหม่ — ตรวจรับ iOS ก่อน](../spec.md)

**User stories:** 70–74

**Why blocked:** ใช้ controls/theme ร่วม; operations ข้อมูลเดือน/งบเดิมมีแล้ว จึงไม่ต้องรอ Summary

- [ ] หน้าแผน/ฟอร์มงบ แสดง all/category/tag, selected month/custom bounds, empty state และยอด spent/remaining จริง
- [ ] Warning chips 50/70/80/90 แสดงจำนวนบาท; spent เท่าวงเงินไม่แสดงเกิน แต่ spent มากกว่าวงเงินแสดงเกิน พร้อมคำ/ไอคอน
- [ ] Target ที่มีอยู่แสดง notice และ upsert แทนวงเงินเดิม; เปลี่ยน target หรือ save failure ไม่ทำให้ข้อมูลสูญหาย/แจ้งสำเร็จผิด
- [ ] ลบงบทันทีและ undo 5 วินาทีคืน ID/fields/target เดิมพร้อมยอดจากรายการที่ยังอยู่
- [ ] วางขอบเขต delete/restore operation ที่ server เก็บผลเพื่อให้กู้ได้ครบ รองรับ ownership, repeated requests และ conflict โดยไม่สร้าง clone ใช้ต่อสำหรับ rule/category/tag slices ได้
- [ ] Query status/summary consumers refresh หลังสำเร็จ ตรวจ contract กับ temporary DB และ create/edit/delete/undo/recovery บน iOS

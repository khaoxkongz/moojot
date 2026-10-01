# 15: ลบหมวดหรือแท็กแล้วกู้คืนครบ

**What to build:** ลบหมวด/แท็กแล้วจัดการรายการ กฎ และงบที่ผูกให้สอดคล้องกัน และเอากลับคืนได้ครบโดยไม่ทับการแก้ข้อมูลอื่น

**Blocked by:** 13 — [แก้ หยุด และเปิดกฎจดซ้ำ](13-recurring-lifecycle.md); 14 — [สร้างและจัดการหมวดกับแท็ก](14-category-tag-management.md)

**Status:** draft — awaiting breakdown approval

**Source:** [Spec: ปรับแอปหมูจดตามดีไซน์ใหม่ — ตรวจรับ iOS ก่อน](../spec.md)

**User stories:** 88–90

**Why blocked:** ต้องมี UI/identity ของหมวด-แท็ก และ schedule/rule กับ restore operation ของกฎ/งบที่พร้อม

- [ ] ลบ custom category แล้ว entry/rule links ถูกถอด รายการยังอยู่กลับ pending และงบที่ผูกถูกลบ ไม่มีชื่อ fallback ค้าง
- [ ] ลบ tag แล้วถอด links ในรายการ/กฎและลบงบที่ผูกโดยคง fields/แท็กอื่น
- [ ] Undo ล่าสุด 5 วินาทีคืนตัว category/tag กับ ID เดิม งบเดิม และ affected entry/rule relationships รวม schedule data ที่เกี่ยวข้อง
- [ ] Restore เป็น operation ที่คืนครบใน transaction หรืออธิบาย conflict/error ไม่สร้าง clone และไม่ย้อนสมุดข้อมูลทั้งชุด
- [ ] การแก้ amount/title/แท็กอื่นระหว่างนั้นยังอยู่ หลังคืน repeated requests ไม่เพิ่มข้อมูลซ้ำและผู้ใช้อื่นคืน receipt ไม่ได้
- [ ] Counts/pending/budget/rule/search consumers refresh หลังผลจริง และ failure ไม่หายเงียบ
- [ ] พิสูจน์ cascade+restore+concurrent edits ในฐานทดสอบ และลบหมวดกาแฟที่มีงบแล้ว undo บน iOS

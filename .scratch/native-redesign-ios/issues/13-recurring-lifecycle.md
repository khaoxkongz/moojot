# 13: แก้ หยุด และเปิดกฎจดซ้ำ

**What to build:** แก้รายการประจำให้มีผลครั้งถัดไป หยุด/เปิดโดยข้ามช่วงหยุด และลบ/เอากฎกลับคืนได้โดยประวัติยังอยู่

**Blocked by:** 10 — [ตั้งงบและเอางบกลับคืน](10-budgets.md); 12 — [ตั้งกฎจดซ้ำและจดย้อนตามกำหนด](12-recurring-create.md)

**Status:** ready-for-agent

**Source:** [Spec: ปรับแอปหมูจดตามดีไซน์ใหม่ — ตรวจรับ iOS ก่อน](../spec.md)

**User stories:** 81–84

**Why blocked:** ใช้ schedule/identity จากงานตั้งกฎ และขอบเขต server delete/restore จากงานงบ

- [ ] แก้วัน/ยอด/details มีผลครั้งถัดไป ไม่สร้างย้อนหลังด้วยค่าที่แก้หรือเปลี่ยนรายการเดิม (story 81)
- [ ] หยุดสองเดือนแล้วเปิดกลับมา ข้ามวันที่ในช่วงหยุดและเริ่มตามวันครบกำหนดถัดไป; รองรับหลายช่วงหยุดจริง (story 82)
- [ ] ไม่เพิ่ม timer เปิดกฎกลับอัตโนมัติ การไม่เข้าแอปไม่กลายเป็นช่วงหยุด (stories 82, 83)
- [ ] Persist effective schedule/version/interval ที่ generator ใช้จริงและไม่อาศัย isActive ปัจจุบันย้อนทั้งประวัติ
- [ ] ลบกฎคงรายการที่เคยสร้างไว้; undo คืน ID/fields/references ที่ได้รับผล และการเรียก generation ซ้ำไม่เพิ่มสำเนารายการ (story 84)
- [ ] คำขอซ้ำ/failure/conflict/account ownership ไม่ทำให้ history ผิดหรือแจ้งว่าคืนครบโดยไม่ครบ
- [ ] ตรวจ generation หลายเดือน/edit/resume/delete/restore ด้วย clock/ฐานทดสอบ และเดิน lifecycle บน iOS

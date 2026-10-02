# 12: ตั้งกฎจดซ้ำและจดย้อนตามกำหนด

**What to build:** ตั้งรายการประจำใหม่จากหน้าแผนหรือ editor แล้วเห็นวันที่แรก/ถัดไป รายการที่ถึงกำหนด และความเชื่อมโยงกับกฎโดยไม่จด original ซ้ำ

**Blocked by:** 11 — [เพิ่มและเลือกบัตร](11-first-card.md)

**Status:** ready-for-agent

**Source:** [Spec: ปรับแอปหมูจดตามดีไซน์ใหม่ — ตรวจรับ iOS ก่อน](../spec.md)

**User stories:** 75–80, 83

**Why blocked:** ใช้ตัวเลือกธนาคาร/บัตรกับ editor ที่ครบจากงานเพิ่มและเลือกบัตร

- [ ] ฟอร์ม type/title/amount/day1–31/end month หรือ forever/category/tags/bank/card/note ใช้ controls และ validation ตามดีไซน์
- [ ] Day 29–31 capped เดือนสั้นและแสดง first/next due จริง ไม่ใช้ accounting month start เปลี่ยนวันครบกำหนด
- [ ] สร้างกฎใหม่ backfill เฉพาะช่วง start/end ถึงวันนี้และแสดง created count จากระบบจริง Retry หลัง partial save ไม่สร้างกฎ/รายการซ้ำ
- [ ] สร้างจาก existing entry เริ่มหลังวัน original และผูก ID เดิม; draft ที่ได้รายการจากกฎแล้วไม่ save manual ซ้ำ
- [ ] รายการที่สร้างรักษา bank/card/category/tags/note และ identity ต่อ rule+due date
- [ ] ขยาย schedule representation ให้รองรับผลมีผลครั้งถัดไปและช่วงหยุดในงานถัดไป โดยรักษา callers/กฎเดิมให้ทำงานได้
- [ ] กฎที่ active สร้างวันที่ถึงกำหนดเมื่อกลับเข้าแอปพร้อมทำงาน ภายใน start/end ไม่ถือ app inactivity เป็น pause
- [ ] ตรวจ API generation/dedupe/fixtures leap month และ editor→rule→generated entry บน iOS

## Comments

**จากงาน 04 (review):** "จดซ้ำล่วงหน้า" ใน editor ส่ง params `cardName` และ `cardLast4` ไป `/recurring-form` แล้ว (พร้อม kind/amount/title/note/occurredOn/categoryId/tagIds/bank) แต่ฟอร์มและ schema ของกฎยังไม่มีบัตร งานนี้ต้องอ่านสอง params นี้และเก็บในกฎ ธนาคารส่งเป็น identity (เช่น "KBank") ใช้ `bankDisplayName` แสดง

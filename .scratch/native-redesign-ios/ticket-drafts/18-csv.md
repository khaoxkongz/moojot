# 18: ส่งออก CSV พร้อมวันเวลาจริง

**What to build:** ส่งออกข้อมูลครบทุกเดือนเป็นไฟล์ภาษาไทยสิบคอลัมน์ โดยบัญชี/บัตรและเวลาที่แสดงตรงกับหลักฐานจริง

**Blocked by:** 06 — [อ่านสลิปและดูหลักฐานจริง](06-slip-evidence.md); 11 — [เพิ่มและเลือกบัตร](11-first-card.md)

**Status:** draft — awaiting breakdown approval

**Source:** [Spec: ปรับแอปหมูจดตามดีไซน์ใหม่ — ตรวจรับ iOS ก่อน](../spec.md)

**User stories:** 107–108

**Why blocked:** ต้องมี actual-time/evidence fields และ card/bank identity ที่ครบก่อนตรวจไฟล์

- [ ] Export/share ไฟล์จริง UTF-8 BOM เปิด Excel/Sheets ได้ และ data ครบทุกหน้าตาม scope
- [ ] คอลัมน์เรียง วันที่ เวลา ประเภท ชื่อรายการ หมวด จำนวนเงิน (บาท) บัญชี แท็ก โน้ต ที่มา ตรง spec
- [ ] Actual time เมื่อมีหลักฐานจริง; unknown/manual/recurring ที่มีเพียงวันให้ช่องเวลาว่าง ไม่ใช้ createdAt/เวลารูป/seed
- [ ] Bank/card name+last4/tag names/note/source/satang precision ถูกต้อง และ Thai text/escaping/formula guard ยังอยู่
- [ ] Server/native formatters ให้ผลความหมายเดียวกัน และ save/share failure มีทางลองใหม่ไม่แจ้งไฟล์สำเร็จเทียม
- [ ] ตรวจ fixture >1,000 rows, CSV dangerous text/unknown time และ export/share/open บน iOS

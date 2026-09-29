# 05: ตัด Import API เดิมและยืนยันการย้ายครบ

**What to build:** server เปิด import operation ใหม่เพียงตัวเดียวและถอดทางอ่านสลิป/statement/PDF เดิมออก โดยรักษาข้อมูล statement ที่เคยบันทึกไว้และยืนยันว่า API ใหม่ทำงานครบผ่าน HTTP, ฐานข้อมูลทดสอบ และ build ของ API/server

**Blocked by:** 04 — จำกัดงาน Gemini คิว และเวลาให้ผลลัพธ์เชื่อถือได้

**Status:** done

**Done in:** `aa8cc3b` Implement authenticated slip auto-import with Effect; `304de8a` Document slip import validation and native follow-up

- [ ] Import router ชี้ไป operation ใหม่เท่านั้น; old slip และ statement RPC URLs ได้ 404; ถอดโค้ด PDF, password/model override และ dependency ที่ไม่มีผู้ใช้ใน API/server แล้ว
- [ ] server เลิก bypass session และ user identification สำหรับ import, ย้าย 14 MiB body guard ไป path ใหม่, เอา statement 28 MiB guard ออก และคง native development CORS กับ `no-store`/`nosniff`
- [ ] ประวัติ `FinanceTransaction` ที่มี `source = statement` ยังอ่านได้ตามเดิม; ไม่ลบข้อมูลหรือ source value จาก Ledger/schema
- [ ] HTTP integration suite พิสูจน์ 401/413, created/skipped/error, 404 ของทางเก่า และหลายรูปที่เป็นคำขออิสระ: created ยังคงอยู่เมื่อรูปอื่น skipped หรือ failed; error/log ไม่เปิดเผยข้อมูลลับ
- [ ] ผ่าน `vp check`, `vp test`, API/server type checks, server build และ MongoDB integration tests; เตรียมขั้นตอน live Gemini smoke ด้วยข้อมูลทดสอบและที่บันทึกผลหลัง deploy แยกจาก automated gate
- [ ] บันทึกให้ชัดว่า native caller เวอร์ชันเดิมยังเรียก operation ที่ถูกถอด จึงมี native/repo-wide type failures และใช้ import ไม่ได้จนกว่าจะทำ native follow-up; ห้ามรายงานว่าแอปทั้งชุดเข้ากันได้แล้ว

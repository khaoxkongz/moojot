# วางทางย้าย Import API เข้า Feature และ Effect

Label: wayfinder:map

## Destination

ได้แผนที่ตัดสินใจครบสำหรับย้าย API อ่านสลิปเข้า `packages/api/src/features/import/` โดยทุกฟังก์ชันใน feature ใช้ Effect, API บันทึกรายการให้ผู้ใช้ที่เข้าสู่ระบบโดยอัตโนมัติ, ยุติ API statement/PDF เดิม และพร้อมส่งต่อให้ลงมือ migrate ในรอบถัดไป

## Handed off

- ถึงปลายทางแล้ว: ส่งต่อให้ [Spec: นำเข้าสลิปอัตโนมัติด้วย Effect](../slip-auto-import-effect/spec.md) ซึ่งแตกเป็น ticket ลงมือทำในโฟลเดอร์นั้น
- งาน `apps/native` ที่อยู่นอกขอบเขต map นี้ ทำต่อใน [Spec: ปรับ Home มือถือให้รองรับการนำเข้าสลิปอัตโนมัติ](../native-slip-auto-import/spec.md)

## Notes

- งานรอบนี้เป็นการวางแผนตาม Wayfinder; ยังไม่แก้ implementation
- ขอบเขตคือ API สลิปที่ Home autoScan จะเรียกหนึ่งรูปต่อหนึ่งคำขอ รวมการเชื่อม `features/index.ts`, runtime และ server ที่จำเป็นต่อ API; ไม่มี flow จากหน้า plan, review หรือ import เรียก API ใหม่นี้ การปรับ `apps/native` อยู่นอกขอบเขต และยอมให้ client เดิมใช้ API ใหม่ไม่ได้ชั่วคราว
- เปลี่ยน path, input, output และ error contract ของ API ได้
- `features/import/import.route.ts`, `import.schema.ts`, `import.service.ts`, `import.error.ts` เป็น boilerplate ว่าง; logic เดิมอยู่ใน `packages/api/src/import/*`
- ปัจจุบัน import คืน candidate เพื่อ review โดยไม่บันทึก; candidate อาจไม่มีวันที่หรือยอดเงิน แต่ `FinanceTransaction` ต้องมีทั้งสองค่า
- ทุก session ที่ทำงานกับ map นี้ควรใช้ `grilling` และ `domain-modeling`; ก่อนเขียน Effect code ต้องอ่าน `node_modules/effect/AGENTS.md` ทั้งไฟล์ตาม `AGENTS.md` ของ repo
- Tracker: local Markdown ตาม `docs/agents/issue-tracker.md`; tickets เป็นไฟล์ลูกใน `issues/`

## Decisions so far

<!-- เติมเฉพาะ ticket ที่ปิดแล้ว พร้อม gist และลิงก์ไปยังคำตอบใน ticket -->

- [กำหนดนโยบายบันทึกรายการที่ AI อ่านได้](issues/01-automatic-persistence-policy.md): บันทึกเฉพาะ candidate ที่มีฟิลด์จำเป็นครบ ข้ามรายการที่ไม่ครบหรือพิสูจน์ว่าซ้ำ พร้อมรายงานเหตุผล; `issues` เป็นคำเตือนและไม่ใช้ `confidence`
- [กำหนดเจ้าของการบันทึกและผลลัพธ์เมื่อบันทึกได้บางรายการ](issues/02-persistence-ownership-and-atomicity.md#answer): ImportService ใช้ทางสร้างรายการของ LedgerService; Home autoScan บันทึกแยกต่อรูป ใช้ asset ID กันส่งซ้ำ และรายงานผลสร้าง/ข้าม/ล้มเหลวต่อรูป
- [กำหนดสัญญา API นำเข้าที่บันทึกอัตโนมัติ](issues/03-authenticated-import-api-contract.md#answer): `import.autoImportSlip` รับภาพกับ asset ID ของผู้ใช้ที่เข้าสู่ระบบ แล้วคืนผลสร้างหรือข้ามพร้อมเหตุผล โดยให้ผู้ใช้จัดหมวดหมู่เอง
- [ออกแบบขอบเขต Effect สำหรับ Import Feature](issues/04-effect-service-boundaries.md#answer): ImportService คุมงานผ่าน Effect, Gemini/config อยู่ใน Layer, LedgerService บันทึกและตรวจ key ซ้ำ, route แปลง error เป็น oRPC
- [กำหนดนโยบายทรัพยากรและความล้มเหลวของ Import](issues/05-import-resource-and-failure-policy.md#answer): จำกัด Gemini ด้วย Effect Semaphore 2 งานและคิวสั้น 2 งาน, กำหนด deadline/การยกเลิก, เพดานภาพ และ code/retry ที่แยก `skipped` จาก system error
- [กำหนดหลักฐานความถูกต้องและการตัดระบบ Import เดิม](issues/06-migration-proof-and-cutover.md#answer): ใช้ fixture/fake และ MongoDB ชั่วคราวพิสูจน์ API, ถอด route/import/PDF เดิม, และรับรู้ native incompatibility ชั่วคราวตามขอบเขต

## Not yet specified

## Out of scope

- การปรับ `apps/native` ให้รองรับ API ใหม่ในงาน migration นี้
- การรองรับ statement/PDF ใน API ใหม่ และ flow นำเข้าจากหน้า plan, review หรือ import
- flow สำหรับแก้ไขหรือย้อนกลับรายการที่สร้างจากสลิป; ข้อมูลแหล่งนำเข้าที่ API ต้องรับอยู่ใน ticket “กำหนดสัญญา API นำเข้าที่บันทึกอัตโนมัติ” แล้ว
- การออกแบบอัตลักษณ์สลิปสำหรับ autoScan หลายอุปกรณ์; การย้ายครั้งนี้คง `slip:<assetId>` เดิมและบันทึกข้อจำกัดไว้ใน ticket “กำหนดเจ้าของการบันทึกและผลลัพธ์เมื่อบันทึกได้บางรายการ”
- การย้าย feature อื่นหรือปรับโครงสร้าง ledger โดยรวม

# กำหนดหลักฐานความถูกต้องและการตัดระบบ Import เดิม

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: 02, 03, 04, 05

## Question

จะพิสูจน์พฤติกรรม API สลิปใหม่ด้วยกรณีทดสอบหรือ fixture ใด และยุติ `packages/api/src/import/*` รวมถึง API statement เดิม พร้อมเปลี่ยน router, runtime, auth/session และ server middleware อย่างไร จึงถือว่าการ migrate สำเร็จ? ระบุเกณฑ์สำหรับผลลัพธ์ปกติ, ภาพเสีย, AI ตอบผิดรูป, การส่งรูปซ้ำ, ผลลัพธ์หลายรูปที่สำเร็จบางส่วน และการยืนยันว่าขอบเขต API ทำงานได้โดยไม่ต้องแก้ `apps/native`

## Answer

**นิยามว่าย้ายสำเร็จ:** `import.autoImportSlip` เป็น operation เดียวของ import API ใน `appRouter`; `POST /rpc/import/slip/auto-import` ต้องมี session และคืน `created`/`skipped` หรือ error ตามสัญญาใน tickets ก่อนหน้า. ทาง API เก่า `POST /rpc/import/slip` และ `POST /rpc/import/statement` หายไป (404) และไม่มี route public สำหรับอ่านสลิปหรือ statement. งานรอบนี้ส่งต่อเป็นแผนลงมือ migrate; ยังไม่แก้ implementation.

**หลักฐานที่ต้องผ่านก่อนรับ migration implementation**

1. เพิ่มชุดทดสอบ deterministic ผ่าน `vp test` โดยใช้ภาพ JPEG/PNG fixture ขนาดเล็กที่ถูกต้อง, ภาพว่าง/เสีย/ผิดชนิด/ผิด MIME, และ Gemini response fixtures ที่ถูกต้อง, ว่าง, ข้อมูลไม่ครบ, JSON หรือ schema ผิด, `kind` ไม่รู้จัก และเกินหนึ่ง candidate. ใช้ fake Gemini แบบควบคุมผลและเวลาได้; ไม่เรียกบริการจริงใน automated gate. ตรวจผล `status`, `reason`, `transactionId`, `reasons`, `warnings`, HTTP status และ machine-readable `code` ตามที่ tickets ก่อนหน้ากำหนด ไม่ยึดข้อความ error ภาษาไทยหรือผล OCR ที่ไม่แน่นอน.
2. Service tests ต้องพิสูจน์: ภาพและ `assetId` ถูกตรวจ **ก่อน** เรียก Gemini; `created` มีรายการเดียวด้วย `source: "slip"`, `categoryId: null`, `slipImageUri: null` และ `dedupeKey: slip:<assetId>`; ชื่อว่างใช้ชื่อสำรองพร้อม warning; `issues` เป็น warning ไม่กันบันทึก; ไม่มี candidate หรือ candidate ขาดวันที่/ยอดเป็น `skipped` พร้อมเหตุผลและไม่เขียน DB; AI ผิดรูป/ส่งหลาย candidate เป็น `AI_INVALID_RESPONSE` และไม่เขียน DB; AI/DB ล้มเหลวเป็น error ไม่ใช่ `skipped`. ทดสอบ input/error matrix ทั้ง 400, 401, 413, 415, 429, 5xx และ 504 รวม `Retry-After` ของ `BUSY`/`AI_RATE_LIMITED`.
3. ทดสอบผ่าน Hono → RPC → `protectedProcedure` ด้วย session ผู้ใช้ทดสอบ: ไม่มี session ได้ 401; request ใช้ `userId` จาก session เท่านั้น; old routes ได้ 404; body จริงเกิน 14 MiB ได้ `PAYLOAD_TOO_LARGE` ก่อน parse; header `Cache-Control: no-store` และ `X-Content-Type-Options: nosniff` ยังอยู่; ไม่มี base64, key หรือ raw AI response หลุดไปใน error body/log. ทดสอบ startup ล้มเหลวเมื่อ Gemini config ขาด/ผิดรูป และตรวจว่า runtime ใช้ config จาก Layer ไม่ผ่าน request context.
4. ใช้ **MongoDB สำหรับทดสอบที่แยกจากข้อมูลจริง** เป็น gate ของ persistence: สร้างครั้งแรกสำเร็จ; ส่ง `assetId` เดิมซ้ำได้ `skipped: duplicate` โดยไม่สร้างเพิ่มหรือเรียก Gemini; แถวที่ soft-delete แล้วยังกันซ้ำ; `assetId` เดียวกันของคนละผู้ใช้เป็นคนละ identity; ต่าง `assetId` แต่ข้อมูลธุรกรรมเหมือนกันไม่ถูกข้ามจากการเดา; คำขอแข่งกันด้วย key เดียวกันสร้างได้เพียงหนึ่งรายการและอีกคำขอได้ duplicate; unique conflict ที่ตรวจแล้วไม่พบ key เดิมเป็น persistence error; เขียนสำเร็จแต่คำตอบสูญหายแล้ว retry ด้วย key เดิมไม่สร้างซ้ำ. Fake Ledger ไม่ใช้แทนหลักฐาน unique constraint/race นี้.
5. ทดสอบคิวและเวลาแบบควบคุม clock/SDK: Gemini ทำพร้อมกันไม่เกิน 2, รอ FIFO ได้อีก 2, คำขอที่ 5 หรือรอเกิน 10 วินาทีได้ `BUSY`, การยกเลิกคืน permit/ที่คิว, timeout 110/140 วินาทีแยก `AI_TIMEOUT`/`IMPORT_TIMEOUT`, SDK ไม่ retry เอง, และหลังเริ่มเขียน DB แล้วไม่มี timeout ที่ทำให้รายงานผลเท็จ. สำหรับหลายภาพ ให้ยิงคำขออิสระ 3 รูป เช่น `created`, `skipped`, AI/DB error; ยืนยันรายการที่สร้างแล้วคงอยู่, ไม่มี rollback ข้ามรูป และผลต่อรูปใช้คำนวณสร้าง/ข้าม/ล้มเหลวได้. ไม่ต้องเรียก `apps/native` เพื่อพิสูจน์ API นี้.
6. ผ่าน `vp check`, `vp test`, `vp run --filter @moojot/api check-types`, `vp run --filter server check-types` และ `vp run --filter server build` พร้อมผลทดสอบ MongoDB ข้างต้น. ทำ live smoke กับ Gemini ด้วยบัญชี/ข้อมูลทดสอบเพื่อสังเกตผลและ config หลัง deploy แต่ **ไม่ใช้เป็น gate อัตโนมัติ** เพราะเครือข่าย, quota และผลโมเดลเปลี่ยนได้. บันทึกผล live smoke แยกจาก fixture gate.

**ลำดับตัดระบบเดิมใน implementation รอบถัดไป**

- เปลี่ยน `packages/api/src/features/index.ts` ให้ชี้ `features/import/import.route.ts` และประกอบ Import/Gemini/config Layer ใน `createAppRuntime` ที่ server สร้างครั้งเดียว. ย้าย Gemini key/model จาก oRPC `Context` ไป server configuration ตอน startup; เอา `geminiApiKey` ออกจาก `packages/api/src/context.ts` และ `apps/server/src/context.ts`.
- เอา session bypass ของ `/rpc/import/slip` และ `/rpc/import/statement` ออกจาก `apps/server/src/context.ts`; เอา `/rpc/import/**` ออกจาก evlog auth-exclusion เพื่อให้ endpoint ใหม่ผูกผู้ใช้ที่เข้าสู่ระบบ. คง CORS สำหรับ native dev, no-store/nosniff สำหรับ import path และย้าย Hono body limit 14 MiB ไป `/rpc/import/slip/auto-import`; เอา limit 28 MiB ของ statement ออก. ตรวจ 401/413 ผ่าน HTTP จริง.
- ถอด `packages/api/src/import/procedures.ts`, `gemini.ts`, `result.ts`, `types.ts` และ `pdf-parse` เมื่อไม่มี import ที่ใช้อีก; เอา `import.slip`/`import.statement` และ PDF/password/model override contract ออกจาก router/type ที่ server เปิด. คง `source: "statement"` และรายการ statement เดิมใน ledger/schema/DB ไว้เพื่ออ่านข้อมูลย้อนหลัง; การยุติ API ไม่ได้ลบประวัติผู้ใช้. ตรวจ dependency/reference ใน API/server หลังถอด และตรวจ old routes เป็น 404.
- `apps/native` ยังอ้าง `client.import.slip`/`statement` ใน Home autoScan และหน้า import/review; **ไม่แก้ใน migration นี้** ตามขอบเขต map. จึงคาดว่า `vp run --filter native check-types` และ repo-wide `vp run check-types` ไม่ผ่านหลังถอด operation เก่า และ client ที่ติดตั้งอยู่เรียก import ไม่สำเร็จชั่วคราว. บันทึกเป็น incompatibility ที่ทราบชัดและส่งต่อการปรับ native เป็นงานถัดไป; ห้ามรายงานว่า checks ทั้ง repo ผ่าน. เกณฑ์รับ API migration คือ API/server gates ข้างต้นผ่านโดยไม่แตะ native.

ไม่มี fog ใหม่ที่ต้องสร้าง ticket เพิ่มก่อนส่งต่อ implementation; การปรับ native และการรองรับ statement/PDF ถูกวางไว้นอกขอบเขตใน map แล้ว.

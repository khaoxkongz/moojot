# 02: API สลิปที่เข้าสู่ระบบสร้างรายการได้

**What to build:** ผู้ใช้ที่เข้าสู่ระบบส่ง JPEG/PNG หนึ่งรูปกับ asset ID ไปยัง `import.autoImportSlip` แล้วได้รับ `created` กับ ID ของ `FinanceTransaction` ที่สร้างผ่าน Ledger เพียงรายการเดียว โดย Import Feature ใช้ Effect ตลอดงาน, Gemini รับ configuration จาก Layer ตอน server เริ่ม และ HTTP บังคับเพดานภาพก่อนทำงานหนัก

**Blocked by:** 01 — Ledger ตรวจอัตลักษณ์สลิปของผู้ใช้

**Status:** done

**Done in:** `aa8cc3b` Implement authenticated slip auto-import with Effect

- [ ] `POST /rpc/import/slip/auto-import` ใช้ session เท่านั้นและตอบ 401 เมื่อไม่มี session; client เลือก user ID, dedupe key, source, category, model หรือ PDF options ไม่ได้
- [ ] Input รับเพียง asset ID, base64 bytes และ MIME JPEG/PNG; asset ID, base64, ขนาดภาพ 10 MiB, signature/MIME และ HTTP JSON body 14 MiB ถูกตรวจตาม spec ก่อนเรียก Gemini; input ผิดได้ 400/413/415 พร้อม machine code ที่ตรงกรณี
- [ ] คำขอภาพที่อ่านได้เป็นรายการพร้อมบันทึกสร้างหนึ่งแถวผ่าน Ledger ด้วย `source = slip`, `categoryId = null`, `slipImageUri = null`, `dedupeKey = slip:<assetId>` และคืน `created` พร้อม transaction ID
- [ ] Gemini provider จริงขอ candidate ไม่เกินหนึ่งรายการ, ใช้ `store: false`, ปิด SDK retry, อ่าน key/model จาก Layer ที่ตรวจตอน startup; key ไม่อยู่ใน request context และ config ขาด/ผิดรูปทำให้เริ่ม server ไม่ได้
- [ ] Route เป็นจุดแปลง Effect เป็น Promise และ oRPC error; helper ใน Import Feature ใช้ Effect และไม่มีการเขียนฐานข้อมูลตรงจาก Import Service
- [ ] HTTP test ใช้ Gemini จำลองและฐานข้อมูลทดสอบเพื่อพิสูจน์ happy path, user binding, header `no-store`/`nosniff`, input rejection ก่อน AI และผล `created`; API/server type checks ผ่าน

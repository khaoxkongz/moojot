# 04: จำกัดงาน Gemini คิว และเวลาให้ผลลัพธ์เชื่อถือได้

**What to build:** API รับงานอ่านสลิปได้ตามกำลัง server ที่กำหนด ตอบ `BUSY` เมื่อคิวเต็มหรือรอนาน และยกเลิกงานที่ยังไม่เริ่มเขียนเมื่อผู้เรียกหายไป โดยไม่รายงาน timeout เท็จหลังฐานข้อมูลเริ่มบันทึก

**Blocked by:** 03 — API แยกผลข้ามและข้อผิดพลาดอย่างถูกต้อง

**Status:** done

**Done in:** `4ed613e` Implement authenticated slip auto-import with Effect

- [ ] Effect Semaphore หนึ่งชุดต่อ server instance จำกัด Gemini สอง calls และคิว FIFO อีกสองคำขอหลัง input/dedupe preflight; คิวเต็มหรือรอเกิน 10 วินาทีได้ `BUSY` 429 กับ `Retry-After: 30`
- [ ] Permit และที่คิวคืนเมื่อสำเร็จ, error, timeout หรือยกเลิก; client disconnect ระหว่างคิว/Gemini ยกเลิกงานและไม่เริ่มสร้างรายการใหม่
- [ ] Gemini timeout 110 วินาทีได้ `AI_TIMEOUT` 504; deadline 140 วินาทีก่อนเริ่มเขียนได้ `IMPORT_TIMEOUT` 504; Gemini 429 ได้ `AI_RATE_LIMITED` 429 พร้อม `Retry-After` ที่ใช้ได้; network/5xx/upstream 4xx อื่นแยก code ตาม spec
- [ ] เมื่อเริ่ม Ledger creation แล้วรอผล commit จริงแม้ผู้เรียก disconnect หรือ deadline ก่อนเขียนผ่านไป; server ไม่ retry Gemini หรือ Ledger เอง
- [ ] Tests ที่ควบคุมเวลาและ fake Gemini พิสูจน์ active 2/waiting 2, FIFO, request ที่ 5, queue timeout, cancellation cleanup, deadlines, no SDK retry และ no false timeout after write

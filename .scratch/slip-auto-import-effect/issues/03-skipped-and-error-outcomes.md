# 03: API แยกผลข้ามและข้อผิดพลาดอย่างถูกต้อง

**What to build:** คำขอ import เดิมคืน `skipped` พร้อมเหตุผลเมื่อไม่มีรายการ, ข้อมูลจำเป็นไม่ครบ หรือ asset ID ถูกใช้แล้ว และคืน error ที่ลองใหม่ได้เฉพาะเมื่อระบบอ่านหรือบันทึกมีปัญหา ผู้ใช้เห็น warning โดยไม่ต้องตรวจ candidate เอง

**Blocked by:** 02 — API สลิปที่เข้าสู่ระบบสร้างรายการได้

**Status:** done

**Done in:** `4ed613e` Implement authenticated slip auto-import with Effect

- [ ] ไม่มี candidate ได้ `skipped: no_candidate`; candidate ที่จำนวนเงินไม่ใช่จำนวนเต็มบวกที่ปลอดภัยหรือวันที่ ISO ไม่ถูกต้องได้ `skipped: incomplete_candidate` พร้อมเหตุผลของฟิลด์; ไม่เขียนรายการในทั้งสองกรณี
- [ ] ชื่อว่างใช้ “รายการจากสลิป” พร้อม warning; `issues` และคำเตือนจาก AI ถูกส่งกลับแม้สร้างสำเร็จ; ไม่มี `confidence`, candidate หรือ review state ในผลลัพธ์ใหม่
- [ ] ส่ง asset ID เดิมซ้ำ รวม soft-deleted row ได้ `skipped: duplicate` และไม่เรียก Gemini หากตรวจพบก่อน; ข้อมูลชนิด/ยอด/วัน/ชื่อที่เหมือนกันแต่ asset ID ต่างกันยังสร้างได้
- [ ] เมื่อคำขอแข่งกันแล้ว Ledger แจ้ง conflict ให้ตรวจ identity เดียวกันอีกครั้ง; พบ key เดิมจึงเป็น duplicate ส่วน conflict อื่นเป็น persistence error; คำตอบสูญหายหลัง commit แล้วลองใหม่ไม่สร้างซ้ำ
- [ ] JSON/schema จาก Gemini ผิด, kind ไม่รู้จัก, ไม่มีผล parse ได้ หรือมากกว่าหนึ่ง candidate ได้ `AI_INVALID_RESPONSE` 502 โดยไม่บันทึก; AI และฐานข้อมูลล้มเหลวได้ code/status 5xx ที่จำแนกได้ ไม่กลายเป็น skipped
- [ ] HTTP fixture tests ครอบคลุมผล created/skipped/error, warnings, model/persistence 5xx, MongoDB race/soft-delete/user isolation และไม่มี image bytes, key, raw model result หรือ DB details ใน response/log

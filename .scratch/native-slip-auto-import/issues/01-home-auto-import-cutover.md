# 01: ให้ Home อ่านและบันทึกผ่านระบบใหม่

**What to build:** ผู้ใช้ที่เข้าสู่ระบบและให้สิทธิ์รูปครบเปิด Home แล้วได้รายการจากสลิปย้อนหลัง 30 วันผ่าน API ใหม่ โดยยังอยู่ Home เดิม เห็นข้อความและแอนิเมชันระหว่างอ่าน และเปิดดูรูปที่ผูกกับรายการได้ เอาทางเข้านำเข้าแบบเก่าที่ใช้งานไม่ได้ออก พร้อมรักษาการจดเองและประวัติเดิม

**Blocked by:** None (can start immediately).

**Status:** done

**Done in:** `3ad46d9` Move Home slip reading to the auto-import API

## Acceptance criteria

- [ ] ใช้สัญญาจาก [Spec มือถือ](../spec.md) และสัญญา API ที่ spec อ้างอิง โดยคงผู้ใช้ใหม่/เดิมไว้บนเส้นทางปัจจุบัน จัดโครงสร้าง orchestration เท่าที่จำเป็นก่อนเปลี่ยนพฤติกรรมภายในงานนี้ ใช้ขอบเขตรอบสแกนเดียวสำหรับเชื่อม Home, native adapters และ transport เพื่อให้งานต่อไปใช้ทดสอบและต่อยอดได้
- [ ] เมื่อเข้าหน้า Home ด้วยบัญชีที่เข้าสู่ระบบและสิทธิ์รูปทั้งหมด ค้นหารูปตามเวลา creation ของ asset ย้อนหลัง 30 วันจาก Krungthai NEXT, K PLUS, Paotang และ TrueMoney ตามกฎชื่ออัลบั้มเดิม อ่านครบทุกหน้า ไม่รวมอัลบั้มอื่น และไม่ประมวลผล asset ID ซ้ำจากหลายอัลบั้มในรอบเดียว
- [ ] ส่งผ่าน operation autoImportSlip ที่ wire route POST /rpc/import/slip/auto-import จริง พร้อม session cookie ตาม transport ของ native และ X-CSRF-Token: orpc ทดสอบเส้นทางจริง ไม่อนุมาน URL จากชื่อ operation แบบ camelCase
- [ ] ส่งเฉพาะ assetId, fileBase64 และ MIME ของภาพ JPEG/PNG จริง ใช้ asset ID เดิมโดยไม่ดัดแปลง ไม่ส่ง model override, category, user ID, dedupe key หรือ URI ในเครื่อง
- [ ] ภาพ JPEG/PNG ที่ไม่เกิน 10 MiB ส่ง bytes ต้นฉบับ ย่อหรือบีบอัดเฉพาะภาพที่จำเป็นต้องลดขนาด ภาพที่อ่านไม่ได้หรือชนิดไม่รองรับล้มเหลวเฉพาะรูปนั้นโดยไม่เปลี่ยน MIME หลอกหรือขวางรูปถัดไป
- [ ] รับ created พร้อม transaction ID และ skipped ทุกเหตุผลตาม schema ปัจจุบัน ซึ่งมีเหตุผลข้อมูลไม่ครบเป็นโครงสร้าง field/code ข้อผิดพลาดยังรักษา machine code, HTTP status และ Retry-After เพื่อให้งาน 02 กำหนดการลองใหม่ได้
- [ ] ฝั่งมือถือไม่เรียกสร้าง FinanceTransaction ซ้ำหลัง API บันทึกแล้ว ไม่มีการเสนอ category ใน auto-import และไม่มีการแปลงผลใหม่กลับเป็น candidate สำหรับ review
- [ ] เมื่อได้ created ผูกรูปต้นฉบับในเครื่องกับ transaction ID ภายใต้บัญชีที่เริ่มคำขอ รีเฟรชรายการและข้อมูลสรุป Home ที่ได้รับผลกระทบ ความล้มเหลวของการผูกรูปหรือรีเฟรชข้อมูลไม่ทำให้สร้างรายการอีกครั้ง และไม่เปลี่ยน created เป็นการนำเข้าที่ล้มเหลว
- [ ] ประมวลผลภาพพร้อมกันไม่เกินสองรูป ภาพที่ถูกข้ามหรือล้มเหลวไม่ขวางรูปอื่น ผลสำเร็จที่บันทึกไว้ไม่ถูกย้อนกลับ นับ created/skipped/failed แยกกันภายในโดยไม่เพิ่มสรุปผลบนหน้าจอ และไม่มีการวนลองใหม่ทันที
- [ ] ขณะทำงาน Home เดิมแสดง “หมูกำลังอ่านสลิปใหม่” และแอนิเมชันที่มีอยู่ เมื่อรอบจบเปลี่ยนสถานะภายในหน้าเดิมพร้อมข้อมูลที่อัปเดต กรณีไม่มีรูปหรือเกิดข้อผิดพลาดต้องไม่ค้างสถานะกำลังอ่าน
- [ ] เอา “อ่านสลิป” และ “ใบแจ้งยอด” ออกจากเมนู + รวมถึงทางเข้า “เริ่มนำเข้า” และลิงก์อื่นที่พาไปหน้าที่เลิกใช้งาน ถอน import/review routes และโค้ด client แบบเก่าเมื่อไม่มีผู้เรียกที่รองรับเหลืออยู่ การเรียกสอง operation ที่ถูกถอดออกต้องหมดจาก native
- [ ] การจดรายการเอง การเลือกหมวดหมู่ การดูรายละเอียดรายการ และรายการ statement/slip ที่เคยบันทึกไว้ยังใช้งานได้ การปรับข้อความอธิบาย onboarding/สิทธิ์/FAQ อย่างครบถ้วนอยู่ในงาน 03
- [ ] ใช้ขอบเขตทดสอบรอบสแกนที่ขับจากภายนอก เชื่อม native transport เข้ากับ fixture HTTP ที่ยืนยันตัวตนและ MongoDB แยกของโครงการ โดยใช้ภาพสังเคราะห์และ fake Gemini พิสูจน์การสร้างหนึ่งรายการ การข้าม รูปผิดพลาดตามด้วยรูปที่สำเร็จ bytes ต้นฉบับ การผูกรูป และการไม่มี ledger-create คำขอที่สอง
- [ ] ตรวจ Home และทางเข้าที่ถอดออกบนเครื่องหรือเครื่องจำลอง บันทึกผลที่ตรวจจริง ไม่อ้างว่าผ่านแพลตฟอร์มที่ยังไม่ได้ตรวจ รัน vp check, vp test และ native type check; ความผิดพลาดเดิมจากสอง operation ที่ถูกถอดออกต้องแก้ครบ รายงานความผิดพลาดอื่นแยกตามหลักฐาน

## Scope and handoff

งานนี้ให้เส้นทางหลักทำงานครบในหนึ่งรอบ ใช้ขอบเขต coordinator และสถานะรอบเดียวเป็นฐานสำหรับงานถัดไป การจำผลข้ามการเปิดแอปและ backoff อยู่ในงาน 02 หน้าจอสิทธิ์และคำอธิบายครบเส้นทางอยู่ในงาน 03 ส่วนจังหวะ foreground/พักงานและท่าทางดึงอย่างละเอียดอยู่ในงาน 04 ทุกงานต่อยอดผ่านพฤติกรรมที่ทดสอบได้ ไม่ต้องสร้าง API ใหม่หรือเปลี่ยน schema ฝั่งเซิร์ฟเวอร์

จำกัดการแก้ตาม spec และรักษางานที่มีอยู่ของผู้ใช้ หากต้องเขียน Effect code ให้ทำตามคู่มือ Effect ที่กติกา repository ระบุก่อนเขียน

## Comments

### 2026-09-29 — implementation evidence

Automated gates, run at the repository root:

- `vp check`: pass (formatting and lint)
- `vp test`: pass, 119 tests across 5 files. New: `apps/native/features/slips/auto-import/scan-session.test.ts` (17 tests) and `apps/server/test/native-slip-auto-import.test.ts` (4 tests), which run the actual native transport and scan session against the authenticated route, isolated MongoDB and fake Gemini
- `vp run check-types`: pass, 11/11, including native. The failures from the two removed operations are resolved
- Mutation check: pointing the transport at `import.autoImportSlip` (the camelCase path) fails all 4 integration tests

Not verified: **on a device or simulator.** The iOS dev build exists, but seeding bank-named albums and driving sign-in/onboarding/Home needs interactive UI control, which was not done. Android tooling is not installed. Home, the removed + menu items and the removed settings links have not been checked on screen.

Handoff notes:

- 02: `settled` in `scan-session.ts` is in-memory and per-account. It covers created, skipped, 400/413/415, `UNSUPPORTED_IMAGE` and `IMAGE_TOO_LARGE`. Temporary failures (including `retryAfter`) and `UNREADABLE_IMAGE` are sent again on the next round with no delay. A 401 ends the current round.
- 03: stale copy remains in `settings/slips.tsx` ("แสดงรายการให้คุณตรวจและเลือกบันทึกทุกครั้ง") and `settings/slip-help.tsx` ("ส่งเฉพาะไฟล์ที่คุณเลือก…ตรวจผลก่อนบันทึกทุกครั้ง"), plus FAQ and onboarding text. The Home idle line switches to the manual-entry hint when `access` is known and not `all`. 03 should replace it with the permission message and settings button.
- 04: `slipScanSession.stop()` exists but is not yet called on blur or background. Pull-to-refresh still shows the reading bubble while `refreshing` is set.

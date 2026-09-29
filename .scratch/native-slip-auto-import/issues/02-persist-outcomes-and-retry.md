# 02: จำผลแต่ละรูปและลองใหม่ให้ถูกต้อง

**What to build:** ผู้ใช้เปิด Home อีกครั้งแล้วระบบจำได้ว่ารูปไหนบันทึกแล้ว ข้ามแล้ว หรือควรลองใหม่เมื่อไร รูปที่ผิดพลาดไม่หยุดรูปอื่น และการลองใหม่หรือเปิดแอปซ้ำไม่สร้างรายการซ้ำ รวมถึงกรณีเซิร์ฟเวอร์บันทึกแล้วแต่คำตอบมาไม่ถึงมือถือ

**Blocked by:** 01 — [ให้ Home อ่านและบันทึกผ่านระบบใหม่](01-home-auto-import-cutover.md).

**Status:** done

**Done in:** `d53a85c` Remember slip import outcomes per photo and retry on a schedule; review fixes in `e265cf0` Fix Home slip reading on the iPhone and stop rounds that never end

## Acceptance criteria

- [ ] ต่อจากรอบสแกนและ transport ของงาน 01 ตาม [Spec มือถือ](../spec.md) ให้ Home ใช้ผลรายรูปที่บันทึกไว้จริงเมื่อเริ่มรอบถัดไป ไม่ใช่เพียงสร้าง utility ที่ยังไม่ถูกเรียกจาก flow
- [ ] จำสถานะที่จำเป็นต่อ asset ภายใต้แต่ละบัญชี ได้แก่ผลสุดท้าย จำนวนครั้งที่ล้มเหลว เวลาที่ลองได้อีก และ transaction ID/ข้อมูลผูกรูปที่จำเป็น สถานะคงอยู่หลังปิดเปิดแอป โดยไม่เก็บ bytes รูป session secret หรือ raw AI output
- [ ] รูปที่ได้ created หรือ skipped แล้วไม่ถูกส่งใหม่อัตโนมัติเมื่อ asset เดิมไม่เปลี่ยน รวม skipped แบบ duplicate, no_candidate และ incomplete_candidate คงการนับผลภายในให้ตรงกับผลจริงโดยไม่เพิ่มสรุปผลหรือหน้ารายละเอียดสแกน
- [ ] รูปที่ได้ BUSY, AI_RATE_LIMITED หรือ 5xx/504 ถูกเลื่อนไปลองในรอบถัดไปด้วย asset ID เดิม หลังอย่างน้อย 30 วินาที ใช้ exponential backoff พร้อม jitter ที่ไม่ต่ำกว่าระยะขั้นต่ำและไม่เกิน 15 นาที เคารพ Retry-After ที่ถูกต้องและยาวกว่านั้น
- [ ] ไม่ลอง 400/413/415 ด้วย input เดิมซ้ำอัตโนมัติ ส่วน 401 พักการส่งจนกว่าจะกลับมายืนยันตัวตนได้ ภาพหนึ่งที่ผิดพลาดไม่ขวางรูปอื่นยกเว้นเงื่อนไขระดับบัญชี/สิทธิ์ที่ทำให้ส่งต่อไม่ได้จริง
- [ ] รอบที่มีแต่งานซึ่งยังไม่ถึงเวลาลองใหม่จบได้ตามปกติ Home ไม่ค้างแอนิเมชันรอเวลา ไม่มี tight retry loop หรือ timer ที่เริ่มรอบใหม่เองไม่สิ้นสุด งานกลับมามีสิทธิ์ทำใน trigger รอบถัดไปตาม spec
- [ ] กรณี network failure, client timeout หรือคำตอบหายหลัง commit ใช้การส่ง asset ID เดิมเพื่อให้เซิร์ฟเวอร์ตรวจซ้ำ การยกเลิกคำขอไม่ถูกตีความว่ารายการที่เซิร์ฟเวอร์เขียนแล้วถูกย้อนกลับ
- [ ] ผลและ callbacks ถูกผูกกับบัญชีและรอบที่เริ่มงาน การสลับบัญชีไม่แชร์ประวัติรูปหรือ retry state และผลที่กลับมาช้าจากบัญชีเก่าไม่แก้สถานะหน้าจอหรือผูกรูปให้บัญชีใหม่
- [ ] เซิร์ฟเวอร์ยังเป็นผู้ตัดสินตัวตนซ้ำ รวมรายการที่ soft-delete ไม่ใช้ URI หรือการเทียบชื่อ/จำนวนเงิน/วันที่แทน asset identity เมื่อสถานะในเครื่องหาย การขอใหม่ต้องไม่สร้างรายการเพิ่มหรือสร้างรายการที่ผู้ใช้ลบกลับมา
- [ ] เมื่อเซิร์ฟเวอร์บันทึกสำเร็จแต่เก็บ image binding ไม่สำเร็จ ให้จำ transaction ID ที่รู้แล้วเพื่อซ่อม binding ภายหลัง ไม่เรียกสร้างรายการอีก หากได้ duplicate ที่ไม่มี transaction ID ให้จับคู่เฉพาะ exact identity ที่ค้นพบได้จากข้อมูล ledger เดิม เมื่อหาไม่ได้ให้คงรายการโดยไม่มีรูปแทนการเดาจับคู่
- [ ] ความผิดพลาดของการรีเฟรชข้อมูลหรือเก็บสถานะในเครื่องไม่เปลี่ยนข้อเท็จจริงว่ารายการถูกบันทึกแล้ว และไม่ทำให้ระบบประมวลผลรูปอื่นทั้งหมดล้มเหลว ต้องมีการกู้คืนที่ยังพึ่ง server identity เมื่อกลับมาใช้งานได้
- [ ] ทดสอบผ่านรอบสแกนและ storage adapter โดยควบคุมนาฬิกา พิสูจน์ระยะรอขั้นต่ำ jitter/backoff เพดาน Retry-After ที่ยาวกว่า การไม่ลองก่อนเวลา การโหลดสถานะใหม่หลังเปิดแอป และการแยกบัญชี
- [ ] ใช้ fixture API เดิมพิสูจน์คำตอบหายหลัง commit, duplicate รวม soft-delete, mixed outcomes และการซ่อม local binding โดยไม่สร้าง transaction เพิ่ม ตรวจจำนวนคำขอและรายการจริง แทนการตรวจลำดับเรียก helper ภายใน
- [ ] รัน vp check, vp test และ native type check ตรวจบนเครื่องหรือเครื่องจำลองว่าการเปิด Home ซ้ำใช้ผลเดิมและสถานะรอจบได้ โดยแยกสิ่งที่ตรวจจริงออกจากส่วนที่ยังตรวจไม่ได้

## Scope and handoff

งานนี้ให้ประวัติผลและคิวที่มีเวลา eligibility สำหรับการกลับมาใช้งานจริง งาน 04 จะนำสถานะนี้ไปใช้เมื่อออกจาก Home หรือแอปไม่ active และกลับมาใหม่ ไม่เพิ่ม OS background tasks, รูปแบบภาพใหม่, cross-device identity หรือหน้ารายละเอียดผลรายรูป งาน 03 ทำได้โดยไม่ต้องรอ ticket นี้

## Comments

### 2026-09-29 — implementation evidence

Automated gates, run at the repository root:

- `vp check`: pass (formatting and lint)
- `vp test`: pass, 153 tests across 5 files. `scan-session.test.ts` has 48 tests (31 new) and drives the scan round against Map-backed device storage with a controlled clock and jitter. `native-slip-auto-import.test.ts` has 7 tests (3 new, 2 updated) and runs the native transport, scan session and ledger identity lookup against the authenticated route, isolated MongoDB and fake Gemini.
- `vp run check-types`: pass, 11/11 including native
- Mutation checks: each test group below was checked against a code mutation it should catch, and failed as expected:
  - Treating a changed asset as settled fails the asset-change test.
  - Dropping the permanent-rejection record fails three tests.
  - Changing the native identity from `slip:` to `slip-` fails two integration tests against the real server.

What is stored: one file per account (`moojot-slip-scan-v1.<account>.json`). For each asset ID it holds the outcome (`saved` with transaction ID and bound flag, `duplicate`, `skipped`, `rejected`, or `retry` with attempts and retryAt) and the asset's `modificationTime`. No bytes, URIs, session data or model output.

Not verified: **on a device or simulator.** Reopening Home with prior results and a round that ends while photos wait for retry were not checked on screen. They were only checked through the scan-session and fixture tests.

Decisions to confirm:

- Local `UNREADABLE_IMAGE` (for example an iCloud original not yet downloaded) is retried with the same backoff and has no attempt limit. The parent spec says unreadable input "must not loop unchanged". The alternative is an attempt limit, or treating it as rejected until the asset changes.
  - **Changed 2026-09-29:** retried with the same backoff for up to 10 attempts on the same `modificationTime`, then recorded as `rejected`. The limit is generous because the failure is local only (no upload, no Gemini call).
- An asset counts as changed when its `modificationTime` changes. On iOS, metadata-only edits can also change it, which re-sends `no_candidate`, `incomplete_candidate` or `rejected` photos once. Saved and duplicate photos are never re-sent.
  - **Confirmed 2026-09-29.** The same rule applies to unreadable photos past their attempt limit and to the other 4xx responses below.
- Clearing account data (`settings/account.tsx`) now forgets scan memory. The server hard-deletes the rows, so the last 30 days of slips are read again on the next Home visit.
  - **Confirmed 2026-09-29.**
- 401 suspension is kept in memory per sign-in session. After an app restart with the same rejected session, one request is sent before sending is suspended again.
- `slip:${assetId}` is duplicated in `ledger-identity.ts`, because `import.service.ts` has unrelated uncommitted edits. The integration test guards it against drift.

Handoff to 04: `slipScanSession.stop()` still is not called on blur or background. Rounds only begin from triggers, and no timers were added.

### 2026-09-29 — review fixes

- Only network failures, timeouts (including a 408), `BUSY`, `AI_RATE_LIMITED` (both 429) and 5xx (including 504) are retried. 401 is unchanged. Every other 4xx, for example 403, 404 or 409, is recorded as `rejected`. Before this, only 400/413/415 were.
- A malformed success body (`INVALID_RESPONSE` on 200) is still retried, because the server may have saved the transaction. The retry reuses the asset ID.
- `Retry-After` stays capped at 24 hours, and `docs/slip-auto-import.md` now says so.
- Device and simulator checks for 01–04 are collected in [05](05-device-check.md).

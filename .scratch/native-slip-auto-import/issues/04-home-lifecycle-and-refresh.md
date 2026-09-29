# 04: ทำจังหวะ Home และการดึงรีเฟรชให้ครบ

**What to build:** Home เริ่มอ่านสลิปเมื่อเข้าใช้งาน พักเมื่อออกจากหน้าหรือแอปไม่ active และทำงานที่เหลือต่อเมื่อกลับมา ผู้ใช้ดึงค้างเพื่อเห็นแอนิเมชันได้โดยยังไม่เริ่มรอบจากท่าทางนั้น เมื่อปล่อยเพื่อรีเฟรชจึงเริ่มงานจริง และเห็น “หมูกำลังอ่านสลิปใหม่” กับแอนิเมชันจนจบรอบบน Home เดิมตลอด

**Blocked by:** 02 — [จำผลแต่ละรูปและลองใหม่ให้ถูกต้อง](02-persist-outcomes-and-retry.md); 03 — [จัดการสิทธิ์รูปและเส้นทางเข้าใช้งาน](03-onboarding-and-photo-access.md).

**Status:** done

**Done in:** `a12f08b` Read slips while Home is in front and refresh only on release

## Acceptance criteria

- [ ] ใช้ coordinator/transport จากงาน 01, ผลและ retry eligibility จากงาน 02 และ permission gate จากงาน 03 ตาม [Spec มือถือ](../spec.md) รวมเป็นรอบสแกนเดียวที่ทุก trigger ใช้ร่วมกัน ไม่มี global busy flag อีกชุดที่ขัดกับสถานะหน้าจอ
- [ ] Home เริ่มค้นหาเมื่อเข้าหน้า และเมื่อแอปกลับเป็น active ขณะที่ Home มี focus รวมกลับจากแอปธนาคารและปลดล็อกแล้วกลับมาใช้งาน เฉพาะบัญชีที่เข้าสู่ระบบและได้ full photo access เท่านั้นที่เริ่มส่งภาพ
- [ ] เมื่อออกจาก Home, แอปไม่ active, หน้าจอล็อก, sign out หรือเสีย full access ให้หยุดเริ่มภาพถัดไปและจัดการการยกเลิก/งานค้างอย่างสอดคล้องกับ transport ผลเขียนที่เซิร์ฟเวอร์ยืนยันแล้วต้องไม่ถูกถือว่าย้อนกลับหรือสูญหาย
- [ ] กลับเข้า Home แล้วเริ่มรอบที่ใช้ผลสะสมและระยะรอของงาน 02 ต่อได้ คง asset ID เดิมสำหรับคำขอที่ผลยังไม่แน่ชัด ไม่ส่งรูปที่เสร็จแล้วซ้ำ และไม่ข้ามเงื่อนไขระยะรอเพราะเกิด foreground event
- [ ] รอบที่ยังทำงานอยู่ถูกใช้ร่วมกันเมื่อ focus, foreground และ refresh เกิดใกล้กัน ไม่เปิดรอบซ้อนหรือส่ง asset เดียวกันพร้อมกันซ้ำ และคำขอเริ่มงานที่มาทีหลังไม่ทำให้ UI แสดงว่าจบก่อนรอบจริง
- [ ] แยกสถานะท่าทางดึงออกจาก scan activity: ดึงลงค้างไว้หรือยกเลิกท่าทางแสดงการเคลื่อนไหวตามการดึงแต่ไม่เริ่มรอบใหม่ การปล่อยเมื่อถึงเงื่อนไขรีเฟรชเท่านั้นจึงร้องขอรอบใหม่หรือเข้าร่วมรอบที่ทำอยู่
- [ ] การดึงค้างไม่หยุดหรือเปลี่ยนความจริงของรอบที่เริ่มจาก auto-scan อยู่ก่อนแล้ว ทดสอบท่าทางทั้งเมื่อ Home ว่างและเมื่อกำลังอ่าน เพื่อไม่สับสนระหว่าง request ที่มีอยู่แล้วกับ request จากการดึง
- [ ] ระหว่างค้นหาและอ่าน แสดง “หมูกำลังอ่านสลิปใหม่” พร้อมแอนิเมชัน Home ที่มีอยู่จนงานที่มีสิทธิ์ทำในรอบนั้นหมดหรือพักงาน เมื่อเสร็จเปลี่ยนสถานะภายใน Home เดิมและอัปเดตรายการ ไม่มี route push/replace หรือหน้ารอใหม่
- [ ] ทุก exit path จบสถานะ busy/refreshing ได้ รวมไม่มีรูปใหม่ ทุกภาพ skipped, ทุกภาพ failed, ภาพที่รอเวลา retry, permission หาย, query/native adapter ผิดพลาด และ cancellation ไม่มี loading ค้างหรือ callback จากรอบเก่าปิด animation ของรอบใหม่
- [ ] ไม่เพิ่มสรุปผลสแกน หน้ารายละเอียดรายรูป หรือ notification คงสถิติ ledger ปกติบน Home และข้อความไปเปิดสิทธิ์ตามงาน 03 ส่วนรูปที่ยังไม่ได้อ่านเพราะรอบหยุดมีสิทธิ์ทำต่อใน trigger ที่เหมาะสม
- [ ] เมื่อหมดงานของรอบให้หยุดตามปกติ ไม่ทำ polling ไม่สิ้นสุด ไม่เพิ่ม OS background task, automatic keep-awake หรือการบังคับห้ามผู้ใช้ออกจากแอป/ล็อกจอ
- [ ] ทดสอบรอบสแกนด้วย events และนาฬิกาที่ควบคุมได้ พิสูจน์จำนวนคำขอ การรวม trigger การพัก/ต่อ การแยกบัญชี late callbacks และ display-state transitions ผ่านพฤติกรรมภายนอก ใช้ขอบเขตทดสอบเดิมแทนการทำชุดทดสอบที่เลียนแบบ helper ทุกตัว
- [ ] ตรวจบนเครื่องหรือเครื่องจำลองด้วยรูปสังเคราะห์และผล AI ที่ควบคุมได้: เข้า Home, ดึงค้าง, ปล่อย, ดึงซ้ำระหว่างอ่าน, ไปแอปธนาคารแล้วกลับ, ล็อกและกลับ, เปลี่ยนสิทธิ์, ปิดเปิดแอป และสลับบัญชี บันทึกหลักฐานว่า Home route เดิมและแอนิเมชันทำงานตรงจังหวะทั้งระหว่างและหลังรอบ
- [ ] ตรวจ flow รวมผู้ใช้ใหม่และเดิมหลังงาน 01–03 ทำครบ: onboarding นับอย่างเดียว, Home บันทึก, ข้อมูลเก่า/manual entry ยังอยู่, ไม่มีทางเข้า import/review เก่า และไม่สร้างรายการซ้ำ ตรวจทั้งแพลตฟอร์มที่รองรับเท่าที่มีเครื่องพร้อม ระบุส่วนที่ยังไม่ตรวจอย่างชัดเจน
- [ ] ปิดงานด้วย vp check, vp test, native type check, API/server type checks และ repository-wide type check ตาม spec แก้ความผิดพลาดที่เกิดจากงานนี้ รักษา API regression suite ให้ผ่าน และรายงานความผิดพลาดอื่นหรือแพลตฟอร์มที่ยังตรวจไม่ได้ตามหลักฐาน ไม่ใช้ type check แทนการตรวจ gesture จริง

## Why these blockers

งาน 02 ให้ผลสะสมและ retry eligibility ที่จำเป็นต่อการพักและทำต่ออย่างไม่สร้างซ้ำ งาน 03 ให้ gate สิทธิ์และเส้นทางกลับจาก settings ที่ต้องใช้ตัดสินว่า Home เริ่มหรือพักได้ จึงต้องครบทั้งสองงานก่อนตรวจจังหวะรวมนี้ งาน 01 เป็น prerequisite ผ่านสองงานนั้นอยู่แล้ว

## Completion evidence

บันทึกผลแต่ละสถานการณ์และคำสั่งตรวจที่รันจริง พร้อมข้อจำกัดของเครื่องทดสอบ การเผยแพร่แอป การ deploy เซิร์ฟเวอร์ และ live Gemini smoke test อยู่นอก ticket นี้

## Comments

### 2026-09-29 — implementation evidence

Automated gates, run at the repository root:

- `vp check`: pass (formatting and lint)
- `vp test`: pass, 183 tests across 7 files.
  - `scan-session.test.ts` has 70 tests (20 new). It drives the session and the new Home controller (`home-scan.ts`) with activity events, pull events and a controlled clock.
  - `native-slip-auto-import.test.ts` has 1 new test against the real route, MongoDB and a held fake Gemini. Leaving Home mid-round keeps both slips the server was reading and starts no third photo. Returning reads the rest with no second row.
- `vp run check-types`: pass, 11/11, including native, server, API and web.
- Mutation checks. Each was caught by at least one test:
  - pause aborting requests in flight
  - not waiting for a paused round's photos
  - no per-photo access check
  - a held pull requesting a round
  - a pushed-back pull still refreshing
  - no pause on leaving
  - no cancel on sign-out

What changed:

- The session's `stop()` is now two operations:
  - `pause()` stops scheduling, lets requests in flight finish and keep their results, and releases the reading state at once. It is used when Home loses focus or the app is not `active`.
  - `cancel()` also aborts requests. It is used on sign-out and account switch.
  - A round started while a paused round's photo is still in flight waits for that answer instead of sending the photo again. Home keeps reading until then.
- A paused round finishing late cannot change what Home shows.
- Photo access is read again before each photo. The round stops scheduling as soon as access is narrowed.
- `createHomeScan` receives Home focus, `AppState` and the account. It requests a round on entry (`home`), on becoming active again (`foreground`) and on a released pull (`refresh`). Requests close together join one round.
  - The retry wait from 02 still applies. A foreground event does not skip it.
  - The narrower Settings-only `AppState` listener from 03 is replaced. Every activation now checks access again.
- The pull gesture is separate from reading:
  - Holding a pull on iOS (RefreshControl fires while the finger is down) shows the slip animation without the “หมูกำลังอ่านสลิปใหม่” text and requests nothing.
  - Lifting the finger at least 32pt below the top requests or joins a round. Pushing back to the top first cancels.
  - A pull during a round never stops it or ends its display.
  - The native indicator is never held open.
- There are no timers, polling or background tasks.

Not verified: **on a device or simulator.**

- Nothing in the checklist was checked on screen: hold, release, a second pull while reading, bank app and back, lock and back, permission changes, restart, account switch, and the combined new/returning-user flow.
- Maestro cannot hold a touch without releasing it. `simctl` cannot create named bank albums. A local server would call live Gemini.

Known limits for the device pass:

- **Android:** `pullStart` and `pullEnd` are not wired. SwipeRefreshLayout fires `onRefresh` on release, which requests a round at once. While a pull is held, only the native indicator moves: a white disc with a transparent arrow. The slip animation does not play.
- **iOS threshold:** the 32pt cancel threshold is a local rule, not the RefreshControl threshold.
- **iOS `inactive`:** Notification Center, Control Center and system alerts make the app `inactive`. That pauses the round and starts a new one on return, which may flicker the bubble.

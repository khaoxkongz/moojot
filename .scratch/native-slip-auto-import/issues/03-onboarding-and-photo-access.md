# 03: จัดการสิทธิ์รูปและเส้นทางเข้าใช้งาน

**What to build:** ผู้ใช้ใหม่สมัครและเข้าสู่ระบบ ผ่าน onboarding ที่ค้นหาและนับรูป แล้วเริ่มอ่านที่ Home ส่วนผู้ใช้ที่ทำ onboarding แล้วเข้า Home ได้เลย หากสิทธิ์รูปไม่ครบยังดูรายการและจดเองได้ พร้อมข้อความและปุ่มไปตั้งค่าที่ช่วยให้กลับมาอ่านสลิปอัตโนมัติได้

**Blocked by:** 01 — [ให้ Home อ่านและบันทึกผ่านระบบใหม่](01-home-auto-import-cutover.md).

**Status:** done

**Done in:** `b4beff1` Pause slip reading without full photo access and explain it on Home

## Acceptance criteria

- [ ] ใช้ routing และสถานะ onboarding เดิมตาม [Spec มือถือ](../spec.md) ผู้ใช้ใหม่เข้าสู่ระบบก่อน onboarding ผู้ใช้ที่ทำ onboarding เสร็จแล้วเข้า Home โดยไม่ต้องทำซ้ำ
- [ ] ขั้นค้นหารูปใน onboarding ขอสิทธิ์เข้าถึงคลังรูปทั้งหมด ค้นหาเฉพาะอัลบั้มที่รองรับและช่วง 30 วันเดิม แสดงจำนวนแยกตามแหล่งและจำนวนรวมที่ไม่ซ้ำ asset ID การนับนี้ไม่ส่งรูปให้ AI และไม่สร้าง FinanceTransaction
- [ ] ข้อความแยกการค้นหาและนับรูปออกจากการอ่านและบันทึกที่ Home ให้เข้าใจได้ จำนวนรูปที่พบไม่ถูกอ้างว่าเป็นจำนวนธุรกรรมที่ AI ยืนยันหรือบันทึกสำเร็จแล้ว
- [ ] การไม่ให้สิทธิ์ ให้เพียงบางรูป หรือถอนสิทธิ์ภายหลัง ไม่ขวางการจบ onboarding ตามเงื่อนไขบัญชีเดิมและไม่ขวางการใช้งาน ledger ด้วยมือ Home พักการส่งรูปจนกว่าจะได้สิทธิ์ทั้งหมด
- [ ] Home มีข้อความว่าเปิดสิทธิ์เข้าถึงรูปเพื่ออ่านสลิปอัตโนมัติ พร้อมปุ่มไปตั้งค่าที่ใช้ได้จริงสำหรับสถานะนั้น คำขอสิทธิ์หรือการเปิดตั้งค่าเกิดจากการกระทำของผู้ใช้ ไม่เด้งซ้ำทุกครั้งที่เริ่มค้นหา
- [ ] ตรวจ permission ปัจจุบันเมื่อเริ่มการใช้งาน Home และเมื่อกลับจากหน้าตั้งค่า คืน full access แล้วเริ่มรอบสแกนผ่าน coordinator ของงาน 01 ได้ ไม่ต้องทำ onboarding ใหม่หรือเพิ่มปุ่มเปิด auto-import แยกอีกครั้ง
- [ ] แยกกรณีสิทธิ์ไม่ครบออกจากกรณีสิทธิ์ครบแต่ไม่พบอัลบั้มหรือรูปใหม่ กรณีไม่มีงานจบเป็นสถานะปกติโดยไม่แสดงคำเตือนสิทธิ์ผิดหรือค้างสถานะกำลังอ่าน
- [ ] ปรับ consent, onboarding, FAQ, settings และ help ที่เกี่ยวข้องให้บอกตรงกันว่า onboarding นับรูปในเครื่อง ส่วน Home ส่งภาพที่เข้าเงื่อนไขให้ AI อ่านและบันทึกอัตโนมัติ ถอนข้อความเดิมที่สัญญาว่าจะส่งเฉพาะรูปที่เลือกเองหรือต้องตรวจทานก่อนบันทึกทุกครั้ง
- [ ] ข้อความและลิงก์ไม่พากลับไป manual slip/statement import ที่งาน 01 ถอดออก คงคำอธิบายและทางใช้การจดเอง เลือกหมวดหมู่ และดูข้อมูลเก่า
- [ ] ทดสอบ flow ผู้ใช้ใหม่/เดิมร่วมกับรอบสแกน โดยควบคุม permission และ photo metadata พิสูจน์ว่า onboarding ไม่เรียก import, limited/denied ไม่ส่งภาพ, full access อ่านได้ และ restore permission แล้วกลับมาสแกนได้
- [ ] ตรวจการตั้งค่าสิทธิ์และ Home บนเครื่องหรือเครื่องจำลอง รวมการไม่ให้สิทธิ์ limited access ถอนสิทธิ์ และกลับมาเปิดใหม่ ตรวจว่า manual entry และข้อมูลเดิมยังใช้ได้ โดยรายงานแพลตฟอร์มและข้อจำกัดที่ตรวจจริง
- [ ] รัน vp check, vp test และ native type check รักษาชุดทดสอบจากงาน 01 ให้ผ่าน โดยไม่ต้องรอระบบ retry ในงาน 02 เพื่อยืนยันพฤติกรรมสิทธิ์

## Scope and handoff

งานนี้เป็นเจ้าของการตัดสินว่า permission พร้อมหรือไม่ และการอธิบายต่อผู้ใช้ โดยต่อถึงการนำเข้าจริงที่ Home งาน 04 จะรวม gate นี้กับสถานะ focus/foreground และการดึงรีเฟรชทั้งหมด การแบ่งงานไม่เพิ่มแหล่งอัลบั้ม รูปแบบภาพ หรือขั้นตอนยินยอมแยกจาก flow ที่ยืนยันไว้

## Comments

### 2026-09-29 — implementation evidence

Automated gates, run at the repository root:

- `vp check`: pass (formatting and lint)
- `vp test`: pass, 162 tests across 7 files. New or changed:
  - `discovery.test.ts` (3 tests): onboarding counts per source, the unique asset-ID total, the 30-day window, all pages, and no matched album.
  - `photo-access.test.ts` (3 tests): which Home action fits each permission state.
  - `scan-session.test.ts` (6 changed or new): no request, no library query and no reading state under limited, denied, undetermined or unsupported access. Restored access reads on the next request, and narrowed access pauses again. Full access with nothing new is an ordinary completed round.
  - `native-slip-auto-import.test.ts` (1 new): against the real route and MongoDB. Onboarding counting sends no request. Denied, limited and undetermined access send nothing to the server or Gemini and save no row. Restored access saves both slips.
- `vp run check-types`: pass, 11/11 including native
- Mutation check: making the session ignore photo access fails 6 tests, 5 unit and 1 integration.

What changed:

- Onboarding and Home now share one album discovery (`discovery.ts`). Onboarding counts only metadata and has no path to import. Counts are labelled as photos, not slips.
- Home shows the reading state only after the permission and sign-in gates pass. A round without access never flashes "หมูกำลังอ่านสลิปใหม่".
- When access is not full, the Home speech bubble explains that automatic reading is paused and that manual entry still works. It offers one action:
  - "อนุญาตเข้าถึงรูปภาพ" while undetermined, which shows the system prompt.
  - "ไปที่การตั้งค่า" when denied or limited.

  Prompts and Settings open only when that button is tapped. Rounds read the permission without prompting.

- While Home is focused and the last known access was not full, returning to the active app starts a Home round, which checks the permission again. This covers returning from Settings.
- Consent, account privacy, FAQ, the slip settings page, slip help and the credit card page now say the same thing:
  - Onboarding counts on the device.
  - Home sends eligible photos through the server to Gemini and saves automatically, uncategorised.

  Promises of selecting or reviewing before saving, and of PDF statement import, are gone.

- Routing is unchanged. `Stack.Protected` still sends signed-in users to onboarding until `onboarding_complete_v1`, then to the app. The onboarding "ต่อไป" button never depends on photo permission.

Not verified: **on a device or simulator.** Permission prompts, Settings round trips, limited access, revoking access and the Home notice were not checked on screen, on either platform. The onboarding screen's `scanSlipAlbums` wrapper and the new/returning routing are not covered by automated tests. Only the shared counting and session they call are tested.

Handoff to 04:

- The `AppState` listener on Home only re-requests when access is not `"all"`. 04's general foreground trigger should replace it, and should recheck on every activation. That also covers access narrowed while the app stayed alive.
- Pull-to-refresh still shows the reading bubble while `refreshing` is set, even when the round ends immediately with `no-access`.

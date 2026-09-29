# Spec: ปรับ Home มือถือให้รองรับการนำเข้าสลิปอัตโนมัติ

Status: ready-for-human

พฤติกรรมผลิตภัณฑ์: ผู้ใช้ยืนยันข้อสรุปรวมแล้ว รวมการอยู่หน้า Home เดิมตลอดการทำงาน

ขอบเขตการทดสอบ: ผู้ใช้เห็นด้วยกับทั้งการทดสอบระบบอัตโนมัติและการตรวจพฤติกรรมหน้าจอบนเครื่องหรือเครื่องจำลองแล้ว

## Problem Statement

ผู้ใช้ผ่าน onboarding หรือกลับเข้าแอปแล้วคาดหวังให้ Home อ่านสลิปจากอัลบั้มธนาคารย้อนหลัง 30 วันและบันทึกให้เอง แต่มือถือยังเรียก Import API เดิมที่ถูกถอดออก ยังคาดหวัง Import Candidate สำหรับตรวจทาน และสร้างรายการบัญชีเองอีกคำขอหนึ่ง จึงไม่เข้ากับ API ใหม่ที่อ่านและบันทึกในคำขอเดียว เมนูและคำแนะนำเดิมยังพาไปสู่การนำเข้าสลิปด้วยมือและ statement/PDF ที่เลิกใช้งานแล้ว

การทำงานเดิมยังแยกรูปที่ข้ามออกจากรูปที่ล้มเหลวไม่ได้ ไม่มีการจำผลและกำหนดเวลาลองใหม่ต่อรูป และเริ่มงานจาก focus ของหน้าโดยไม่ได้จัดการการสลับแอปอย่างครบถ้วน ผู้ใช้จึงอาจไม่เห็นรายการใหม่ตามที่คาดหวัง หรือเสียเวลาประมวลผลรูปเดิมซ้ำ

## Solution

ให้ Home เป็นทั้งหน้าที่เริ่มงานและหน้าที่แสดงสถานะตลอดรอบการนำเข้า ผู้ใช้ใหม่สมัครและเข้าสู่ระบบ ผ่าน onboarding ที่ขอสิทธิ์คลังรูปทั้งหมด ค้นหาอัลบั้มและนับรูป แล้วจึงเข้า Home ผู้ใช้ที่ทำ onboarding เสร็จแล้วเข้า Home ได้เลย ทั้งสองกลุ่มใช้การนำเข้าสลิปอัตโนมัติแบบเดียวกัน

เมื่อเข้า Home หรือกลับมายัง Home ขณะที่แอปอยู่ด้านหน้า ให้ค้นหารูปย้อนหลัง 30 วันในอัลบั้มที่รองรับ ส่งให้ API ใหม่อ่านและบันทึก ระหว่างทำงานแสดง “หมูกำลังอ่านสลิปใหม่” และแอนิเมชันที่มีอยู่จนจบรอบ เมื่อจบเปลี่ยนสถานะภายใน Home เดิมเป็นปกติและแสดงรายการที่บันทึกแล้ว ไม่มีหน้ารอแยก ไม่มีการนำทางเมื่อเริ่มหรือจบ และไม่มีสรุปผลสแกนหรือหน้ารายละเอียดผลรายรูปเพิ่ม

การดึงลงค้างไว้แสดงแอนิเมชันตอบสนองการดึงเท่านั้น แอนิเมชันสลิประหว่างดึงค้างมีเฉพาะบน iOS ส่วน Android แสดงตัวบอกการรีเฟรชของระบบแทน เพราะ SwipeRefreshLayout ไม่รายงานการดึงขณะค้างไว้ (ข้อจำกัดของแพลตฟอร์ม ดู [งาน 04](issues/04-home-lifecycle-and-refresh.md) หัวข้อ Known limits) เมื่อปล่อยนิ้วเพื่อรีเฟรชจึงเริ่มงานจากท่าทางนั้น รูปที่ข้ามหรือล้มเหลวไม่ขวางรูปถัดไป การลองใหม่ใช้กติกาของ API เดิม หากสิทธิ์รูปไม่ครบ ให้พักการอ่านและแสดงปุ่มไปตั้งค่า โดยยังใช้การจดเองและดูรายการได้

## User Stories

1. As a new user, I want to register and sign in before onboarding, so that imported transactions belong to my account.
2. As a new user, I want onboarding to request full photo access, so that the app can discover supported bank albums.
3. As a new user, I want to see photo counts by bank and in total during onboarding, so that I understand which albums were found.
4. As a new user, I want photo discovery during onboarding to remain separate from AI reading, so that automatic saving starts at Home.
5. As a returning user who completed onboarding, I want to enter Home directly, so that I can resume normal use.
6. As a signed-in user, I want Home to discover supported album photos from the past 30 days, so that recent slips can be recorded automatically.
7. As a user, I want automatic reading to begin when I enter Home, so that I do not need to choose individual slips.
8. As a user returning from my bank app, I want Home to discover my newly saved slip, so that I do not need an additional refresh gesture.
9. As a user, I want a held pull gesture to animate without starting a new scan, so that work starts only when I release to refresh.
10. As a user, I want a completed pull-to-refresh gesture to start or join the current scan, so that repeated gestures do not create overlapping work.
11. As a user, I want to remain on Home during the entire scan, so that I see progress in the same screen.
12. As a user, I want to see “หมูกำลังอ่านสลิปใหม่” and the existing animation until the round finishes, so that I know the app is working and should remain open.
13. As a user, I want Home to return to its normal display state after the round, so that I can see my saved transactions.
14. As a user, I want scan outcomes handled without a new summary or details screen, so that the app remains simple.
15. As a user, I want processing to continue to the next photo after a skipped or failed photo, so that one problem does not stop the remaining work.
16. As a user, I want successful imports to remain saved when another photo fails, so that progress is preserved.
17. As a user, I want the same asset to avoid creating another transaction, so that repeat visits and retries do not duplicate my ledger.
18. As a user, I want a deleted imported transaction to stay deleted when the photo is found again, so that automatic scanning respects my deletion.
19. As a user, I want temporarily failed photos retried later using the same asset ID, so that recovery is safe.
20. As a user, I want the app to remember completed and deferred photos across launches, so that it does not restart all work every time.
21. As a user, I want processing to resume when I return to Home after leaving the app, so that unfinished work can continue during active use.
22. As a user who has not granted full photo access, I want to keep viewing transactions and entering them manually, so that photo permissions do not block the rest of the app.
23. As a user with missing or limited photo access, I want a Home explanation and settings action, so that I can enable automatic reading.
24. As a user who restores photo access in settings, I want Home to recheck access, so that scanning can work when I return.
25. As a user, I want readable JPEG and PNG originals preserved when within the size limit, so that unnecessary conversion does not reduce text quality.
26. As a user, I want the saved transaction linked to its local slip image when available, so that I can inspect it later.
27. As a user, I want imported transactions left uncategorized, so that I choose their categories as agreed in the existing API plan.
28. As a user, I want the obsolete “อ่านสลิป” and “ใบแจ้งยอด” actions removed, so that I do not enter an unsupported flow.
29. As a user, I want historical transactions and manual entry preserved, so that retiring import screens does not remove my existing data or ordinary workflows.
30. As a user, I want onboarding and help text to describe automatic AI reading and saving accurately, so that I understand the behavior before reaching Home.
31. As a user switching accounts on one device, I want scan state and image bindings kept separate per account, so that one user's work does not affect another user's ledger.
32. As a maintainer, I want deterministic tests plus native UI checks, so that API correctness and actual gesture behavior are both verified.

## Implementation Decisions

### Confirmed product behavior

- Keep the existing authentication and onboarding routing. Completion of onboarding determines whether a signed-in user enters onboarding or the app. Photo access is not a prerequisite for using manual entry or viewing records.
- Keep onboarding discovery as a metadata count. Its existing 30-day selection and supported album matching remain the baseline. Counts describe photos found before AI qualification, not transactions already saved.
- Preserve the existing supported sources: Krungthai NEXT, K PLUS, Paotang, and TrueMoney with their current normalized album-name aliases. Permission to access the full library does not expand selection to unrelated albums. Use asset creation time for the existing rolling 30-day discovery window.
- Home is the only caller flow for the new auto-import operation. Entry to Home, return to the active app while Home is focused, and a released refresh gesture request a scan. A held or cancelled pull gesture does not request a new scan. A scan already started by another trigger may continue while a finger is held down.
- Work runs while Home is focused and the app is active. Leaving Home, backgrounding the app, locking the device, signing out, or losing full photo access stops scheduling additional images. The next eligible Home activation resumes unfinished work. There is no OS background task, notification, or automatic keep-awake feature in this scope.
- Model the pull gesture display separately from actual scan activity. Preserve the current Home visual design and slip animation. Scan activity changes state inside the same route; it never pushes or replaces a route. Completion, empty discovery, permission failure, cancellation, and errors must all release the busy display correctly.
- While a round is active, display “หมูกำลังอ่านสลิปใหม่” with the existing animation until its currently eligible work finishes or is paused. Waiting for a future retry deadline does not keep the round busy. Afterward update the same Home display with saved ledger data. Keep ordinary Home daily ledger statistics; they are not a new scan summary.
- Full photo access is required for automatic processing. Denied, undetermined, limited, or revoked access produces the agreed Home explanation and settings action, while normal ledger usage remains available. Recheck permissions on each eligible activation, including return from settings.
- Remove the manual slip and statement import actions, their obsolete navigation entry points, and now-unused import/review routes and logic where no supported caller remains. Preserve manual financial entry, category selection, historical slip/statement records, and supported details screens. Remove or update the Home “เริ่มนำเข้า” call to action and stale guidance elsewhere.
- Update consent, onboarding, FAQ, and help wording together: discovery counts photos locally; Home sends eligible images for AI reading and saves qualified transactions automatically. Remove promises that every import is manually selected or reviewed first. Do not add a separate activation step that was not selected in this discussion.

### Inherited API contract

- Use the signed-in autoImportSlip operation at the explicit wire route POST /rpc/import/slip/auto-import. The client must not derive the wrong URL from the camel-cased operation name. Send the existing normal session cookie and CSRF token using the established authenticated transport conventions. Preserve machine error codes, HTTP status, Retry-After, and cancellation across this boundary instead of collapsing them to display messages.
- Send only the original media asset ID, file base64, and the actual supported MIME type. Preserve the asset ID across retries. The server chooses owner, model, source, identity, and category behavior. No client model override, category suggestion, local URI, or second ledger-create request belongs in the auto-import path.
- Send valid JPEG/PNG originals unchanged when they fit the 10 MiB file limit. Resize/compress only when needed to fit the established limit while preserving readable text. Determine the actual format rather than relabelling bytes. Unsupported or unreadable input is a per-image failure and must not loop unchanged. New image-format support is outside this migration.
- A created result carries the saved transaction ID; bind the original local image to it using the existing account-scoped image store and refresh ledger-derived views. A skipped result carries duplicate, no_candidate, or incomplete_candidate and does not count as created. System errors stay distinct from skipped results, even though no new outcome UI is shown. Track created/skipped/failed totals internally to verify correct processing.
- Preserve server-authoritative identity, including soft-deleted transactions. Local cache entries and URI matching must not replace the server's exact per-user asset identity. Reinstallation or lost local state may cause requests again, but must not create duplicate ledger records.
- Retry temporary request failures on a later scan with the same asset ID: BUSY, AI_RATE_LIMITED, and 5xx/504, at least 30 seconds apart, exponential backoff with jitter capped at 15 minutes, honoring any longer valid Retry-After. Treat transport failure or a lost response as potentially committed; reconcile by the same identity on a later eligible attempt. Do not retry skipped outcomes or unchanged 400/413/415 input. A 401 suspends requests until authentication is restored.
- Keep the native request deadline longer than the documented server pre-write deadline. Cancellation or loss of response is not proof that a server write was rolled back. Process any received created response safely and avoid attributing an old session's result to a newly signed-in user.

### Engineering approach proposed for the build

- Replace the module-wide boolean with one scan coordinator that owns the current round, subscribable display state, cancellation, and per-image outcomes. Reuse the existing album discovery and local image services through small adapters. Multiple focus/refresh events join the active round rather than start another copy or prematurely clear its display state.
- Bound concurrent image imports to at most two. Continue remaining eligible assets after one image fails. Iterate all discovery pages, deduplicate asset IDs across albums, and retain the existing newest-first preference. End a round when its discovered eligible work is exhausted; discover newly added photos on the next supported trigger rather than adding an endless polling loop.
- Store minimal scan bookkeeping on device, separated by account and asset identity: terminal outcome, retry attempts, next eligible attempt time, and known transaction/local-binding data as needed. Persist enough to avoid re-uploading skipped images after an app restart. Reevaluate authentication errors after login, and reject stale callbacks from another account or round. Keep raw photo bytes, session secrets, and raw AI output out of this store and logs.
- Treat server success and local image-binding success separately. A failed local write does not undo a saved transaction or justify another create. Keep a known transaction ID for repairing the local binding. A duplicate response has no transaction ID: reconcile only through an exact identity match available in existing ledger data. If that record cannot be resolved, preserve the transaction and leave its local image unavailable rather than guessing from title, amount, or date. Cross-device image recovery is not promised.
- Invalidate all affected ledger-derived Home queries after successful saves, with sensible batching; failed cache refreshes do not change an import's outcome. Clear active display state through a single completion path even when discovery finds nothing or native APIs throw.
- Preserve source data and user work outside this feature. There are existing unrelated edits in the server import implementation; this native plan does not authorize rewriting those edits or changing the server contract.

## Testing Decisions

**Confirmed verification scope:** the user agreed to automated behavior tests and native device/emulator checks. The technical test arrangement below implements that scope.

- Prefer one main integration boundary: an externally driven scan session. Feed it Home activation, refresh release, permission changes, foreground changes, and deterministic photo-library results. Observe outgoing requests, saved transactions, persistent scan state, image bindings, and display-state transitions. Test behavior rather than private helper call order.
- Reuse the repository's existing Vitest runner and isolated authenticated import HTTP/MongoDB fixture. Exercise the actual native import transport against the actual server route with synthetic readable images and a fake Gemini provider. This catches wrong RPC paths, missing authentication/CSRF, error decoding, duplicate handling, and an accidental second ledger-create request. Stub platform photo/foreground/storage boundaries without importing a live device runtime into the server harness.
- Verify new and returning users reach the agreed flow, and that onboarding only counts metadata. A Home permission failure must send no image request, preserve manual ledger usage, and expose the settings action. Restoring full access must enable the next activation.
- Exercise mixed outcomes in one round: created, each skipped reason, temporary errors, permanent input errors, and empty/unreadable assets. A later valid image must still save after an earlier failure. Verify accurate internal totals and the absence of added result-summary UI.
- Use a controlled clock to verify delay floors, exponential backoff/jitter bounds, longer Retry-After values, later-scan eligibility, and no retries of terminal outcomes. Reload stored state and switch accounts to prove per-account isolation. No real waiting for retry windows is needed in automated tests.
- Verify duplicate triggers share one round, concurrency stays bounded, pagination discovers all eligible photos, unsupported albums and out-of-window photos are ignored, and the busy state ends on every exit path. Backgrounding or losing Home focus stops scheduling work; returning resumes safely. A lost response after server commit must not duplicate the ledger.
- Verify original JPEG/PNG bytes are preserved under the size cap, necessary resizing produces valid supported input, and image binding follows the returned transaction ID. A local image-write failure must not trigger another ledger creation or hide the already saved row.
- Run focused native UI checks on an emulator or device using synthetic bank-album photos: hold a pull without release and observe animation with no new gesture-triggered request; release and observe scanning; confirm the Home route stays the same; confirm the busy message/animation lasts through the round and returns to normal; switch app/lock and return; change photo permissions; inspect the cleaned menus and help text. Verify both supported mobile platforms where available and report any unverified platform honestly.
- Verify historical statement rows, manual entry, and category assignment still work after old import navigation is removed. Keep the existing API regression suite green. A visual check is necessary because a type check cannot establish gesture timing or whether navigation occurs.
- Build acceptance gates are vp check, vp test, the native type check, API/server type checks, and the repository-wide type check. The previously permitted failures from removed import operations must be resolved. Any unrelated failures are reported separately with evidence, not claimed as passing. This planning document does not claim these implementation checks have run.

## Out of Scope

- A broad visual redesign, a separate progress screen, scan summaries, per-image result pages, or new notifications.
- OS background processing while another app is active or the device is locked, continuous polling after a round, and preventing the user from leaving or locking the device.
- Reintroducing manual slip import, statement/PDF import, candidate review, model choice, or AI category suggestions.
- New album sources, new image formats, scans beyond the existing 30-day window, cross-device slip identity, and guaranteed recovery of local images after reinstall or lost responses.
- Changing the server's auto-import contract, rebuilding Ledger, adding a server image store, deploying, or running a live Gemini smoke test with real financial documents.
- Removing historical transactions or changing unrelated in-progress server edits.

## Further Notes

- Product decisions and the explicit correction that Home remains the same route are recorded in [the confirmed interview notes](notes.md).
- The existing [API spec](../slip-auto-import-effect/spec.md), [migration record](../../docs/slip-auto-import.md), and [Wayfinder decisions](../import-effect-migration/map.md) remain the source of the server contract. The current response schema uses structured incomplete-candidate reasons; use the actual shared contract rather than copying an older simplified example.
- Album discovery and the Home animation already exist. The build should reuse them while replacing obsolete orchestration and transport behavior.
- The technical structure and detailed test arrangement above are implementation proposals supporting the confirmed behavior and verification scope; they are not additional product requirements chosen by the user.
- Product behavior and verification scope are confirmed. The next step is to split this spec into implementation tickets with explicit blocking dependencies using the repository's local Markdown tracker.

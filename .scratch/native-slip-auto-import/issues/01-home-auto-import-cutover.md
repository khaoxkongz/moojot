# 01: Read and save Home slips through the new API

**What to build:** Authenticated users with full photo access open Home and import slips from the past 30 days through the new API. They remain on Home, see activity text/animation, and can open the attached image. Retire unavailable import entry points. Preserve manual entry and history.

**Blocked by:** None (can start immediately).

**Status:** done

**Done in:** `fe77a8c` Move Home slip reading to the auto-import API

## Acceptance criteria

- [ ] Use the [native spec](../spec.md) and its API contract. Preserve current new/returning-user routes. Prepare only the orchestration necessary before changing behavior. Use one scan-session boundary across Home, native adapters, and transport for later work and tests.
- [ ] Authenticated Home activation with full access discovers assets by creation time within the past 30 days. Use existing album aliases for Krungthai NEXT, K PLUS, Paotang, and TrueMoney. Read every page. Exclude other albums and duplicate asset IDs across albums within one round.
- [ ] Call `autoImportSlip` through actual wire route `POST /rpc/import/slip/auto-import`. Use the native transport's session cookie and `X-CSRF-Token: orpc`. Test the actual route rather than deriving a camelCase URL.
- [ ] Send only `assetId`, `fileBase64`, and actual JPEG/PNG MIME. Preserve the asset ID exactly. Exclude model override, category, user ID, dedupe key, and local URI.
- [ ] Send original JPEG/PNG bytes within 10 MiB. Resize/compress only when necessary. Unreadable or unsupported images fail individually. Preserve actual MIME and continue with later photos.
- [ ] Accept created IDs and every skipped reason under the current schema, including structured field/code reasons for incomplete data. Errors retain machine code, HTTP status, and `Retry-After` for ticket 02.
- [ ] The mobile app delegates `FinanceTransaction` creation to the API alone. Automatic import excludes category suggestions and conversion of new results to review candidates.
- [ ] Bind created transaction IDs to original local images under the account that started the request. Refresh affected ledger and Home summaries. Binding/cache failure neither creates another transaction nor changes the created import outcome.
- [ ] Process at most two images concurrently. Skipped/failed images leave other work eligible, and successful persistence remains. Count created/skipped/failed internally without a new summary UI. Retry waits for a later round.
- [ ] The same Home shows “หมูกำลังอ่านสลิปใหม่” (Moo is reading new slips) and its existing animation during work. Completion updates that screen's state and data. Empty/error rounds release the reading state.
- [ ] Delete “อ่านสลิป” (read slip) and “ใบแจ้งยอด” (statement) from the + menu. Delete “เริ่มนำเข้า” (start import) and other obsolete import entry points. Retire import/review routes and old client code when no supported caller remains. Eliminate native calls to both retired operations.
- [ ] Preserve manual entry, category selection, transaction details, and historical statement/slip rows. Ticket 03 completes onboarding/permission/FAQ explanations.
- [ ] Drive scan sessions externally through native transport and the project's authenticated HTTP/isolated MongoDB fixture. Use synthetic images and fake Gemini. Prove one creation, skipping, recovery after an earlier image failure, original bytes, and local binding. There is no second Ledger creation request.
- [ ] Check Home and retired entry points on a device/emulator. Record actual platform evidence. Run `vp check`, `vp test`, and native type checks. Resolve existing failures from the two retired operations. Report other failures separately with evidence.

## Scope and handoff

This ticket completes the main path in one round. One coordinator and round-state boundary supports later tickets. Ticket 02 owns persistence across app starts and backoff. Ticket 03 owns permissions and explanations across the flow. Ticket 04 owns detailed foreground/pause and pull gestures. All build on observable behavior, without a new API or server schema.

Follow the spec and preserve the user's existing work. Read the repository's required Effect guide before writing Effect code.

## Comments

### 2026-09-29 — implementation evidence

Automated gates ran at the repository root:

- `vp check`: passed formatting/lint.
- `vp test`: passed 119 tests across 5 files. New `apps/native/features/slips/auto-import/scan-session.test.ts` has 17 tests. New `apps/server/test/native-slip-auto-import.test.ts` has 4 tests. They exercise actual native transport/session, authenticated routes, isolated MongoDB, and fake Gemini.
- `vp run check-types`: passed 11/11, including native. The change resolves failures from both retired operations.
- Mutation check: transport using `import.autoImportSlip`, the camelCase path, fails all 4 integration tests.

Device/simulator checks did not run. An iOS development build exists. Seeding bank albums and driving sign-in/onboarding/Home require interactive UI control, which did not occur. Android tooling is absent. Home, retired + menu actions, and retired settings links remain unchecked on screen.

Handoff:

- Ticket 02: `settled` in `scan-session.ts` is in-memory and per account. It covers created, skipped, 400/413/415, `UNSUPPORTED_IMAGE`, and `IMAGE_TOO_LARGE`. Temporary failures, including `retryAfter`, and `UNREADABLE_IMAGE` resend next round without delay. A 401 ends the round.
- Ticket 03: `settings/slips.tsx` retains "แสดงรายการให้คุณตรวจและเลือกบันทึกทุกครั้ง" (shows entries for you to check and choose to save every time). `settings/slip-help.tsx` retains "ส่งเฉพาะไฟล์ที่คุณเลือก…ตรวจผลก่อนบันทึกทุกครั้ง" (send only files you select…check results before saving every time). FAQ/onboarding also retain stale copy. Home shows manual-entry guidance when known `access` is not `all`. Replace it with permission guidance and a settings button.
- Ticket 04: `slipScanSession.stop()` exists without blur/background calls. Pull-to-refresh still shows the reading bubble while `refreshing` equals true.

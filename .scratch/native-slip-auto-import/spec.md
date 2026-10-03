# Spec: Adapt mobile Home to automatic slip import

Status: ready-for-human

Product behavior: The user confirmed all conclusions, including staying on the same Home screen throughout processing.

Verification scope: The user agreed to automated tests and UI checks on a device or emulator.

## Problem Statement

After onboarding or returning to the app, users expect Home to import bank-album slips from the past 30 days automatically. The mobile app still calls the retired Import API. It expects `Import Candidate` review and creates the transaction through a second request. This conflicts with the new API's single read-and-save request. Old menus/guidance also lead to retired manual slip and statement/PDF flows.

The old implementation cannot distinguish skipped images from failed images. It lacks persistent outcomes and retry scheduling per image. Screen-focus triggers do not fully handle app switching. Users may miss expected transactions or repeatedly process the same images.

## Solution

Home starts the work and shows activity throughout each round. New users register/sign in, then complete onboarding. Onboarding requests full photo access, finds albums, and counts photos before Home. Returning users who completed onboarding enter Home directly. Both groups use the same automatic import behavior.

Entering Home, or returning to it in the active app, discovers supported-album photos from the past 30 days. The new API reads and saves them. Show “หมูกำลังอ่านสลิปใหม่” (Moo is reading new slips) with the existing animation until the round ends. Return the same Home screen to normal with saved transactions. Starting/ending work never navigates to another screen. Scope excludes a separate waiting screen, scan summary, and per-image results page.

A held pull shows only gesture-responsive animation. That slip animation is available on iOS. Android uses the native refresh indicator because SwipeRefreshLayout does not report a held pull. See [ticket 04](issues/04-home-lifecycle-and-refresh.md), Known limits.

Releasing to refresh starts gesture-triggered work. Skipped/failed images leave later images eligible. Retry follows the existing API rules.

Without full photo access, pause reading and show a settings action. Manual entry and transaction viewing remain available.

## User Stories

1. New users register and sign in before onboarding. Imported transactions belong to their accounts.
2. Onboarding requests full photo access to discover supported bank albums.
3. Onboarding shows photo counts per bank and in total. Users understand which albums the app found.
4. Onboarding discovery stays separate from AI reading. Automatic saving starts at Home.
5. Returning users with completed onboarding enter Home directly to resume normal use.
6. Home discovers supported-album photos from the past 30 days to record recent slips automatically.
7. Entering Home starts automatic reading without selecting individual slips.
8. Returning from a bank app discovers newly saved slips without an additional refresh gesture.
9. Holding a pull animates without starting a scan. Gesture-triggered work starts only after release to refresh.
10. Completed pull-to-refresh starts or joins the scan. Repeated gestures do not create overlapping work.
11. Users remain on Home throughout the scan and see progress there.
12. Show “หมูกำลังอ่านสลิปใหม่” (Moo is reading new slips) with the existing animation until completion. Users know work continues and the app should remain open.
13. Home returns to normal after the round and shows saved transactions.
14. Handle outcomes without a new summary/details screen to preserve simple use.
15. Continue after skipped/failed photos. One problem must not stop remaining work.
16. Preserve successful imports when another photo fails.
17. Repeated visits/retries of one asset must not create another ledger transaction.
18. Deleted imported transactions stay deleted when discovery finds the photo again.
19. Retry temporary failures later with the same asset ID for safe recovery.
20. Remember completed/deferred photos across app starts instead of restarting all work.
21. Returning to Home after leaving the app resumes unfinished work during active use.
22. Without full photo access, users can still view transactions and enter them manually.
23. Missing/limited access shows a Home explanation and settings action to enable reading.
24. Home rechecks access after settings changes so scanning can resume.
25. Preserve readable JPEG/PNG originals within the size limit. Avoid unnecessary conversion that reduces text quality.
26. Link saved transactions to available local slip images for later inspection.
27. Leave imported transactions uncategorized for user selection, following the existing API agreement.
28. Delete obsolete “อ่านสลิป” (read slip) and “ใบแจ้งยอด” (statement) actions to prevent unsupported flows.
29. Preserve historical transactions and manual entry when retiring import screens.
30. Onboarding/help accurately explain automatic AI reading and saving before users reach Home.
31. Separate scan state/image bindings per account on shared devices. One account's work must not affect another ledger.
32. Use deterministic tests and native UI checks to establish API correctness and actual gesture behavior.

## Implementation Decisions

### Authentication and discovery

Keep existing authentication/onboarding routing. Onboarding completion determines onboarding versus app entry. Photo access does not gate manual entry or viewing records.

Onboarding discovers metadata and counts photos. Retain its 30-day selection and supported-album matching. Counts precede AI qualification. They do not count saved transactions.

Supported sources remain Krungthai NEXT, K PLUS, Paotang, and TrueMoney with current normalized album aliases. Full-library permission does not add unrelated albums. Use asset creation time for the rolling 30-day window.

### Home triggers and activity

Home is the only caller flow for auto-import. Entering Home, foregrounding the app with Home focused, and releasing refresh request scans. Held/cancelled pulls do not request scans. A scan from another trigger may continue while the finger remains held.

Work requires Home focus and an active app. These events stop additional image scheduling:

- Leaving Home.
- Backgrounding or locking.
- Signing out.
- Losing full photo access.

The next eligible Home activation resumes unfinished work. Scope includes no OS background task, notification, or automatic keep-awake.

Separate visible pull-gesture state from actual scan activity. Preserve Home's existing design and slip animation. Change state within the same route. Do not push or replace routes. Completion, empty discovery, permission failure, cancellation, and errors must release visible busy state.

While active, show “หมูกำลังอ่านสลิปใหม่” (Moo is reading new slips) with the animation. Continue until currently eligible work finishes or pauses. Future retry deadlines do not keep a round busy. Then update the same Home with saved ledger data. Ordinary daily ledger statistics remain. They are not a new scan summary.

Automatic processing requires full access. Denied, undetermined, limited, and revoked access show the Home explanation/settings action. Normal ledger use remains available. Recheck access on every eligible activation, including settings return.

### Retired flows and guidance

Delete manual slip/statement actions and obsolete navigation entry points. Delete unused import/review routes and logic when no supported caller remains. Preserve manual entry, category selection, historical slip/statement records, and supported details screens. Delete or update Home “เริ่มนำเข้า” (start import) and stale guidance elsewhere.

Update consent, onboarding, FAQ, and help together. Discovery counts photos locally. Home sends eligible images for AI reading and automatically saves qualified transactions. Delete promises of mandatory manual selection/review. Add no activation step beyond the user's decision.

### Authenticated API and images

Use signed-in `autoImportSlip` at `POST /rpc/import/slip/auto-import`. Do not derive its URL from the camel-cased operation name. Send normal session cookies and CSRF tokens through established transport conventions. Preserve machine error codes, HTTP status, `Retry-After`, and cancellation. Messages shown to the user must not replace these values.

Send original media asset ID, file base64, and actual supported MIME type only. Preserve asset ID across retries. The server chooses owner, model, source, identity, and category behavior. Exclude client model overrides, category suggestions, local URIs, and second ledger-create requests.

Send valid JPEG/PNG originals unchanged within 10 MiB. Resize/compress only as needed, preserving readable text. Determine actual format instead of relabelling bytes. Unsupported/unreadable input fails per image. Do not loop unchanged input. New image formats are outside this migration.

### Outcomes, identity, and cancellation

`created` returns the saved transaction ID. Bind the original local image through existing account-scoped storage. Refresh ledger-derived views.

`skipped` returns duplicate, no_candidate, or incomplete_candidate. It does not count as created. System errors stay separate despite the absence of new outcome UI. Track created/skipped/failed totals internally for checks.

Preserve server-authoritative identity, including soft-deleted transactions. Local caches and URI matching do not replace exact per-user asset identity. Reinstallation or lost state may resend requests. They must not duplicate ledger records.

Retry temporary failures on later scans with the same asset ID. These include BUSY, AI_RATE_LIMITED, and 5xx/504. Attempts are at least 30 seconds apart. Use exponential backoff/jitter capped at 15 minutes. Honor longer valid `Retry-After`.

Transport failures and lost responses may follow a committed write. Reconcile through the same identity on a later eligible attempt. Do not retry skipped outcomes or unchanged 400/413/415 input. A 401 suspends requests until authentication returns.

The native request deadline exceeds the documented server pre-write deadline. Cancellation or response loss does not prove rollback. Handle received created responses safely. An old session's result must not enter a newly signed-in account.

### Proposed coordinator and persistence

Replace the module-wide boolean with one coordinator owning the round, subscribable visible state, cancellation, and per-image outcomes. Reuse album discovery and local image services through small adapters. Multiple focus/refresh events join one round. They must not create duplicates or clear visible state early.

Limit concurrent imports to two. Continue after per-image failures. Read all discovery pages. Deduplicate asset IDs across albums. Retain newest-first preference.

End after discovered eligible work finishes. Discover new photos on the next supported trigger. Add no endless polling.

Persist minimal account/asset bookkeeping:

- Terminal outcome.
- Retry attempts and next eligible time.
- Known transaction/local-binding data as needed.

Prevent skipped-image reuploads after restart. Reevaluate auth errors after login. Reject stale callbacks from another account or round. Keep photo bytes, session secrets, and raw AI output out of storage/logs.

Server saving and local image binding are separate outcomes. A local-write failure does not undo saving or justify another create. Retain transaction IDs for binding repair.

Duplicate responses have no transaction ID. Reconcile only through exact identity in existing ledger data. If unresolved, preserve the transaction and leave its image unavailable. Do not guess from title, amount, or date. Cross-device image recovery is not promised.

Invalidate affected ledger-derived Home queries after saves, with sensible batching. Failed refreshes do not change import outcomes. One completion path clears visible state, including empty discovery and native errors.

Preserve source data and unrelated user work. Existing server import edits are outside this native plan. It does not authorize rewriting them or changing the server contract.

## Testing Decisions

The user approved automated behavior tests and native device/emulator checks. These proposed technical boundaries implement that scope.

### Session and transport boundaries

Prefer an externally driven scan-session integration boundary. Supply Home activation, refresh release, permission/foreground changes, and deterministic library results. Observe requests, saved transactions, persistent state, image bindings, and visible transitions. Test behavior instead of private call order.

Reuse Vitest and the isolated authenticated import HTTP/MongoDB fixture. Exercise actual native transport against the actual route. Use synthetic readable images and a fake Gemini provider. Check RPC path, authentication/CSRF, error decoding, duplicates, and unwanted second ledger creation. Stub photo/foreground/storage boundaries. Do not import live device runtime into the server harness.

### Flow, outcomes, and timing

Check new/returning routing and metadata-only onboarding. Home permission failure sends no image request. It preserves manual use and offers settings. Restored full access enables the next activation.

Exercise created, each skipped reason, temporary/permanent errors, and empty/unreadable assets in one round. Later valid images still save after failures. Check internal totals and absence of new result-summary UI.

Use controlled clocks for delay floors, exponential/jitter bounds, longer `Retry-After`, later-scan eligibility, and terminal no-retry behavior. Reload storage and switch accounts to check isolation. Automated tests need no actual retry waiting.

Check joined triggers, bounded concurrency, and complete pagination. Ignore unsupported albums and out-of-window photos. The visible busy state must end on every exit. Backgrounding/lost focus stops scheduling. Returning resumes safely. Lost post-commit responses must not duplicate entries.

Check unchanged JPEG/PNG bytes under the cap and valid supported resizing when necessary. Bind images through returned IDs. Failed local writes must not create another entry or hide saved rows.

### Native UI and regressions

Use synthetic bank-album photos for focused emulator/device checks:

1. Hold a pull without release. Check animation and absence of a new gesture-triggered request.
2. Release the pull. Check scanning.
3. Check that Home retains its route.
4. Check busy text/animation throughout the round and normal display afterward.
5. Switch apps or lock, then return.
6. Change photo permissions.
7. Inspect cleaned menus and help.

Check both supported platforms where available. Report unchecked platforms accurately. Check historical statement rows, manual entry, and category assignment after navigation removal. Preserve passing API regressions. Visual checks establish gesture timing/navigation, which type checks cannot establish.

Build gates: `vp check`, `vp test`, native type checks, API/server type checks, and repository-wide type checks. Resolve previously permitted failures from retired import operations. Report unrelated failures separately with evidence. This planning document does not claim those implementation checks ran.

## Out of Scope

- Broad visual redesign, separate progress screens, scan summaries, per-image results, and new notifications.
- OS background work while another app is active or the user locks the device. Continuous polling after rounds. Preventing app exit or locking.
- Manual slip import, statement/PDF import, candidate review, model choice, and AI category suggestions.
- New albums/formats, discovery beyond 30 days, cross-device slip identity, and guaranteed local-image recovery after reinstall/lost responses.
- Server contract changes, Ledger rebuilding, server image storage, deployment, and live Gemini checks with actual financial documents.
- Removing historical entries or changing unrelated active server edits.

## Further Notes

- [Agreed interview notes](notes.md) record product decisions and the Home-route correction.
- [The API spec](../slip-auto-import-effect/spec.md), [migration record](../../docs/slip-auto-import.md), and [Wayfinder decisions](../import-effect-migration/map.md) define the server contract. The current schema uses structured incomplete-candidate reasons. Use the actual shared contract instead of an older simplified example.
- Reuse existing discovery and Home animation while replacing obsolete orchestration/transport.
- Technical structure and test boundaries are proposals supporting approved behavior and verification scope. They are not additional user-selected product requirements.
- The user approved product behavior and verification scope. Next, create implementation tickets with explicit dependencies through the local Markdown tracker.

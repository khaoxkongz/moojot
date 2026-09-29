# 05: Check Home slip reading on a device or simulator

**What to build:** Nothing new. Check on a device or simulator what 01–04 could only verify through automated tests, then record what was actually seen. An agent can't do this. Maestro can't hold a touch without releasing it, `simctl` can't create named bank albums, and a local server calls live Gemini.

**Blocked by:** None. The review fixes to 02 are in: the key check, the configuration error, 4xx rejection, and the unreadable-photo limit.

Status: ready-for-human

## Setup

- Start the server with `vp run dev:server` and check that `GET /` answers `200 OK`. The server uses the real `GEMINI_API_KEY` in `apps/server/.env`, so every photo read calls live Gemini.
- Use a test account and synthetic slips with known amount, date and title. Don't use real financial documents, and keep images, session tokens and the key out of any notes.
- Save the slips into albums with supported names (Krungthai NEXT, K PLUS, Paotang or TrueMoney) within the last 30 days.

## Checklist

For each item, record the platform (iOS or Android, device or simulator) and what happened. Leave anything you couldn't check unticked, and say why.

- [ ] **Home against the dev server:** entering Home with full photo access shows “หมูกำลังอ่านสลิปใหม่” and the slip animation. The synthetic slips appear as transactions, uncategorised, with their local image attached. Home returns to its normal state without changing route.
- [ ] **Hold:** holding a pull on an idle Home plays the slip animation without the “หมูกำลังอ่านสลิปใหม่” text and starts no reading. On Android only the native refresh indicator moves; this is expected (see 04 "Known limits").
- [ ] **Release:** releasing the pull starts a round, or joins one already running. Pushing back to the top before releasing cancels it.
- [ ] **Second pull while reading:** a pull during a round neither stops it nor ends its display early.
- [ ] **Bank app and back:** a slip saved in a bank app while Moojot is in the background is read on return, and earlier slips aren't sent again.
- [ ] **Lock and back:** locking the device pauses the round, and unlocking resumes the rest without a second transaction for any slip.
- [ ] **Permission changes:** limited, denied and revoked access pause reading and show the Home notice with the correct button. Restoring full access in Settings resumes reading on return.
- [ ] **Restart:** after closing and reopening the app, Home doesn't resend saved or skipped slips. A photo waiting to be retried isn't sent before its time, and the round still ends.
- [ ] **Account switch:** signing out and into another account shares no scan memory or image bindings, and a late answer from the previous account doesn't change the new account's Home.
- [ ] **New and returning users:** a new user registers, signs in, and in onboarding sees only photo counts with nothing saved; saving starts at Home. A returning user goes straight to Home. Manual entry, category selection and older statement/slip transactions still work.
- [ ] **Removed entry points:** the + menu has no “อ่านสลิป” or “ใบแจ้งยอด”, and no settings link or Home call to action leads to the old import/review screens.

## Comments

### 2026-09-29 — first device session (iPhone, Expo Go)

Platform: a physical iPhone on iOS 27, running Expo Go (`expo` 57.0.25) over the LAN against `vp run dev:server` with live Gemini. The supported albums held 115 photos from the last 30 days: Krungthai NEXT 104, K PLUS 5, Paotang 2, TrueMoney 4. This session did not confirm whether they were synthetic. Evidence comes from the Metro log, the `[slip-auto-import] round` lines and the server request log (`apps/server/.evlog/logs/2026-09-29.jsonl`). No images, tokens or keys are recorded here.

No checklist item is ticked yet: each one still needs someone to confirm it on screen. What the logs showed for each item is listed below.

**Found on the device and fixed**

1. **iOS could not read any photo.** Every photo failed with `image:UNREADABLE_IMAGE` (`ERR_UNEXPECTED`), and no upload reached the server. `Asset.getUri()` returns the Photos library file (`/var/mobile/Media/...`), which the app may only read while the Photos request that located it is open. Reads after it closes are refused. The simulator does not enforce this, so tests could not catch it. **Fix:** on iOS, `readOriginal` copies the photo through the Photos library into the app cache (`copyAsync` from `ph://<assetId>`, one file per asset, bytes unchanged). The transaction keeps the lasting `ph://<assetId>` reference instead of the file path, via the new `LocalImage.reference`. Android is unchanged.
2. **Pending categories failed once slip transactions existed.** `features/entries/data.ts` called `withLocalSlipImage("", …)`, and `imageKey("")` throws for every `source: "slip"` transaction. **Fix:** the query now uses `client.ledger.listTransactions`, since it needs only kinds and categories. `data.ts` had no other importers, so it was removed.
3. **A round could keep Home reading forever.** This was seen 3 times in one long Expo Go session. Swift-async Expo calls (`Album.getAll`, `Query`) stopped resolving, while Promise-callback calls (`getPermissionsAsync`, `copyAsync`) and fetch kept working. One round also never finished its final ledger refresh. **Safety net, not a root-cause fix:** `scan-session.ts` now has deadlines (`ScanDeadlines`): discovery 60 s ends the round as `error`, one photo read 60 s is unreadable and retried later, and the final refresh wait 30 s lets the round complete and logs `refresh-timeout`.

The round log now also counts failures by `kind:code-or-status`. `read-failed` and `send-failed` log the error class and native code.

**The stall: not reproduced after the first session**

In fresh Expo Go processes, a 15 s health probe timed expo/fetch, React Native fetch, one Swift-async call and one Promise-callback call. It never stalled under any of these conditions:

| Condition                                                           | Result                           |
| ------------------------------------------------------------------- | -------------------------------- |
| Heavy round: 115 uploads with a ledger refresh after each save      | Completed, `created: 115`        |
| Lock for about 30 s during uploads, then unlock                     | Paused and resumed, 115 in total |
| `r` reload, including during a refresh round                        | Healthy                          |
| Fast Refresh while idle, and 6 more during repeated pull-to-refresh | About 35 rounds, all ended       |
| 40 concurrent Swift-async Photos calls every 15 s                   | Healthy                          |
| About 480 `Asset.getUri()` calls (the old read path)                | Healthy                          |

The stall is still open. If it recurs, round logs showing `DeadlineError` or `refresh-timeout` will say so. Keep the process alive and capture a native thread sample (Xcode → Debug → Attach to Process → pause) or Console.app logs, and try a development build to rule Expo Go in or out.

**Evidence per checklist item (iPhone, Expo Go)**

- **Home against the dev server:** two rounds on fresh test accounts each ended `created: 115, failed: 0, status: completed`, all uploads HTTP 200. The reading text and slip animation were seen during rounds. _To confirm on screen:_ transactions are uncategorised, the slip image shows on the entry, and Home returns to normal without changing route.
- **Release, and second pull while reading:** about 40 pull-to-refresh rounds, all ended `completed`. Pulls during a round did not stop it. _Not observed:_ pushing back to the top to cancel.
- **Lock and back:** server log 14:02:12–14:08:46: 25 uploads before the lock, none during the 33 s lock, 90 after unlock, 115 total, all HTTP 200. _To confirm on screen:_ Home shows 115 transactions with no duplicates. The Metro log drops on lock and does not reconnect until a reload. That is a dev-tool limit: the app kept running.
- **Restart (JS reload only):** a reload cut off an upload in flight. The next round sent that photo again, and it was answered `skipped: 1` (duplicate), with no second transaction. _Not checked:_ a full close and reopen, and a retry not being sent before its time.
- **New and returning users:** onboarding logged `[slip-album-scan]` counts only (`total: 115`), and saving started at Home. _Not checked:_ the rest of the item.
- **Not checked:** Hold, Bank app and back, Permission changes, Account switch, Removed entry points.

**Automated gates after the fixes**, run at the repository root:

- `vp check`: pass
- `vp test`: pass, 198 tests across 7 files. New in `scan-session.test.ts`: the transaction keeps a photo's lasting reference rather than the copy it was read from, and a round ends when discovery, a photo read or the final refresh stops answering. The deadline test was written first and hung before the fix.
- `vp run check-types`: pass, 11/11

### 2026-09-29 — the stall moved to its own issue

The unexplained stall is tracked in [06: Find why Home reading stalled on the iPhone](06-home-round-stall.md), so closing this check does not close it.

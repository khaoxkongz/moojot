# 05: Check Home slip reading on a device or simulator

**What to build:** Check behavior that 01–04 checked only through automated tests. Record observed results. This needs human device interaction. Maestro cannot hold a touch without release. `simctl` cannot create named bank albums. A local server calls live Gemini.

**Blocked by:** None. The review fixes to 02 are in: the key check, the configuration error, 4xx rejection, and the unreadable-photo limit.

Status: ready-for-human

## Setup

1. Start the server with `vp run dev:server`.
2. Check `GET /` returns `200 OK`.
3. Use a test account and synthetic slips with known amount, date, and title.
4. Save slips in Krungthai NEXT, K PLUS, Paotang, or TrueMoney albums within the past 30 days.

The server uses actual `GEMINI_API_KEY` from `apps/server/.env`. Every photo read calls live Gemini. Use synthetic financial documents only. Keep images, session tokens, and the key outside these notes.

## Checklist

Record iOS/Android, physical device/simulator, and observed behavior for each item. Leave unchecked items unticked, with a reason.

- [ ] **Home/dev server:** full-access Home shows “หมูกำลังอ่านสลิปใหม่” (Moo is reading new slips) and animation. Synthetic slips become uncategorized transactions with local images. Home returns to normal within the same route.
- [ ] **Hold:** idle iOS Home animates during a held pull without reading text or requests. Android shows only the native indicator, following ticket 04's Known limits.
- [ ] **Release:** releasing starts/joins a round. Returning to the top before release cancels it.
- [ ] **Second pull:** pulling during reading neither stops work nor ends the visible state early.
- [ ] **Bank-app return:** a slip saved while Moojot runs in the background reads on return. Earlier slips do not resend.
- [ ] **Lock/return:** locking pauses the round. Unlocking resumes remaining work without duplicate transactions.
- [ ] **Permissions:** limited, denied, and revoked access pause reading and show the appropriate Home action. Restored full access resumes on settings return.
- [ ] **Restart:** reopening does not resend saved/skipped slips. Deferred retries wait until eligible. Rounds still end.
- [ ] **Account switch:** accounts share neither scan memory nor image bindings. Late prior-account answers cannot change the new Home.
- [ ] **New/returning users:** new users register/sign in before onboarding. Onboarding only counts photos. Saving starts at Home. Returning users enter Home directly. Manual entry, categories, and historical statement/slip rows remain usable.
- [ ] **Retired entry points:** + omits “อ่านสลิป” (read slip) and “ใบแจ้งยอด” (statement). Settings/Home actions do not open old import/review screens.

## Comments

### 2026-09-29 — first device session: physical iPhone, Expo Go

A physical iPhone ran iOS 27 and Expo Go (`expo` 57.0.25). It connected over LAN to `vp run dev:server` with live Gemini. Supported albums contained 115 photos from the past 30 days:

- Krungthai NEXT: 104.
- K PLUS: 5.
- Paotang: 2.
- TrueMoney: 4.

The session did not establish whether images were synthetic. Evidence comes from Metro, `[slip-auto-import] round`, and `apps/server/.evlog/logs/2026-09-29.jsonl`. These notes contain no images, tokens, or keys.

Every checklist item remains unticked pending full screen confirmation. Partial log evidence appears below.

### Device failures and changes

1. **iOS photo reading failed.** Every image returned `image:UNREADABLE_IMAGE` with `ERR_UNEXPECTED`. No upload reached the server.

   `Asset.getUri()` returns `/var/mobile/Media/...`. Access lasts only during the Photos request locating the file. Later reads fail. The simulator lacks this enforcement, so tests missed it.

   On iOS, `readOriginal` now copies through Photos into app cache. `copyAsync` uses `ph://<assetId>`, one unchanged-byte file per asset. `LocalImage.reference` retains the lasting `ph://<assetId>` transaction reference instead of the cache path. Android behavior remains unchanged.

2. **Pending categories failed after slip entries existed.** `features/entries/data.ts` called `withLocalSlipImage("", …)`. `imageKey("")` throws for every `source: "slip"` entry.

   The query now uses `client.ledger.listTransactions` because it only needs kinds/categories. `data.ts` had no other importers. The change deleted it.

3. **Home reading could remain active indefinitely.** This happened 3 times in one long Expo Go session. Swift-async `Album.getAll`/`Query` stopped resolving. Promise-callback `getPermissionsAsync`/`copyAsync` and fetch continued. One round also stalled in final ledger refresh.

   `scan-session.ts` adds `ScanDeadlines` as a safety measure, rather than a root-cause fix. Discovery after 60 s ends as `error`. A photo read after 60 s becomes unreadable and retries later. Final refresh after 30 s completes the round and logs `refresh-timeout`.

Round logs now count failures by `kind:code-or-status`. `read-failed`/`send-failed` log error class and native code.

### Stall did not recur after the first session

Fresh Expo Go processes used a 15 s probe. It timed expo/fetch, React Native fetch, one Swift-async call, and one Promise-callback call. None of these conditions stalled:

| Condition                                                 | Result                          |
| --------------------------------------------------------- | ------------------------------- |
| Heavy round: 115 uploads, ledger refresh after each save  | Completed with `created: 115`.  |
| Lock for about 30 s during uploads, then unlock           | Paused/resumed, total 115.      |
| `r` reload, including during a refresh round              | Healthy.                        |
| Idle Fast Refresh, then 6 during repeated pull-to-refresh | About 35 rounds, all completed. |
| 40 concurrent Swift-async Photos calls every 15 s         | Healthy.                        |
| About 480 `Asset.getUri()` calls through the old path     | Healthy.                        |

The stall remains open. Recurrence can produce `DeadlineError` or `refresh-timeout`. Keep the process alive if it recurs. Capture native threads through Xcode → Debug → Attach to Process → pause, or Console.app logs. Try a development build to assess whether Expo Go causes the limit.

### Partial checklist evidence: physical iPhone, Expo Go

- **Home/dev server:** two fresh-account rounds each ended `created: 115, failed: 0, status: completed`. Every upload returned HTTP 200. Reading text/animation appeared. Check uncategorized entries, attached images, and normal Home without route changes on screen.
- **Release/second pull:** about 40 pull-to-refresh rounds ended `completed`. Pulls during work did not stop it. Cancellation by returning to the top remains unobserved.
- **Lock/return:** server logs span 14:02:12–14:08:46. Uploads: 25 before locking, zero during 33 s locked, 90 after unlocking. Total 115, all HTTP 200. Check 115 entries without duplicates on screen.

  Metro disconnected on lock and required reload to reconnect. This is a development-tool limit. The app continued running.

- **JS reload:** reload interrupted one active upload. The next round resent that image and received `skipped: 1`, duplicate, without another transaction. Full close/reopen and deferred-retry timing remain unchecked.
- **New/returning users:** onboarding logged only `[slip-album-scan]` counts, `total: 115`. Saving began at Home. Other parts remain unchecked.
- **Unchecked:** Hold, Bank-app return, Permission changes, Account switch, and Retired entry points.

### Automated gates after fixes

Commands ran at the repository root:

- `vp check`: passed.
- `vp test`: passed 198 tests across 7 files. New `scan-session.test.ts` cases preserve lasting photo references instead of read-copy paths. They also end rounds when discovery/photo reading/final refresh stops answering. The deadline test came first and hung before the change.
- `vp run check-types`: passed 11/11.

### 2026-09-29 — separate stall issue

[Ticket 06](06-home-round-stall.md) tracks the unexplained stall. Closing this device check does not close that issue.

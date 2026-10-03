# 02: Remember per-image outcomes and schedule retries

**What to build:** Returning to Home retains saved/skipped outcomes and the next retry time per image. One failed image leaves others eligible. Retries/app reopening prevent duplicates, including a server commit whose response never reaches the phone.

**Blocked by:** 01 — [Read and save Home slips through the new API](01-home-auto-import-cutover.md).

**Status:** done

**Done in:** `01dbc45` Remember slip import outcomes per photo and retry on a schedule; review fixes in `531dd7a` Fix Home slip reading on the iPhone and stop rounds that never end

## Acceptance criteria

- [ ] Extend ticket 01's scan session/transport under the [native spec](../spec.md). Home actually consumes stored per-image outcomes in subsequent rounds. Integrate the behavior rather than leaving an unused utility.
- [ ] Persist essential state per account/asset: terminal outcome, failed attempts, next eligible time, and required transaction/local-binding data. State survives app restart. Exclude image bytes, session secrets, and raw AI output.
- [ ] Unchanged created/skipped assets are not automatically resent. This includes duplicate, no_candidate, and incomplete_candidate. Internal counts reflect actual results without a new scan summary or details screen.
- [ ] Defer `BUSY`, `AI_RATE_LIMITED`, and 5xx/504 to a later round with the same asset ID. Wait at least 30 seconds. Exponential backoff/jitter respects that floor and the 15-minute cap. Respect a longer valid `Retry-After`.
- [ ] Unchanged 400/413/415 input is not automatically retried. A 401 suspends sending until authentication returns. One image's failure leaves others eligible unless account/permission conditions actually prevent sending.
- [ ] A round with only deferred work can end normally. Home releases animation rather than waiting for retry deadlines. Eligible work resumes on a later supported trigger. Avoid immediate retry loops and timers that restart rounds indefinitely.
- [ ] Network failure, client timeout, and a lost post-commit response retry through the same asset ID for server reconciliation. Cancellation does not prove rollback of a server write.
- [ ] Bind results/callbacks to their starting account and round. Account switching isolates image history/retry state. Late results from an old account cannot change the new account's display or binding.
- [ ] The server decides exact duplicate identity, including soft-deleted transactions. Local URI or title/amount/date comparisons cannot replace asset identity. After local state loss, new requests prevent extra rows and recreation of deleted rows.
- [ ] Preserve the known transaction ID after local binding failure for later recovery, without another creation. Duplicate results lack an ID. Reconcile only through exact identity in existing Ledger data. If absent, retain the transaction without an image instead of guessing.
- [ ] Cache refresh/local persistence failure preserves the fact of server creation and leaves other images eligible. Recovery continues to rely on server identity when the app becomes usable again.
- [ ] Drive scan sessions/storage with a controlled clock. Prove delay floor, jitter/backoff bounds, longer `Retry-After`, eligibility, reload after restart, and account isolation.
- [ ] Use the existing API fixture for lost post-commit responses, soft-deleted duplicates, mixed outcomes, and local binding recovery. Check that recovery creates no extra transaction. Assert actual requests/rows rather than private helper order.
- [ ] Run `vp check`, `vp test`, and native type checks. Check on device/emulator that reopening Home uses stored results and deferred rounds end. Separate observed evidence from unverified behavior.

## Scope and handoff

This ticket provides persistent outcomes and eligibility times during real use. Ticket 04 consumes them when Home loses focus or the app becomes inactive, then returns. Scope excludes OS background tasks, new formats, identity across devices, and per-image result screens. Ticket 03 can proceed independently.

## Comments

### 2026-09-29 — implementation evidence

Automated gates ran at the repository root:

- `vp check`: passed formatting/lint.
- `vp test`: passed 153 tests across 5 files. `scan-session.test.ts` has 48 tests, including 31 new tests. They drive rounds against Map-backed storage with a controlled clock/jitter. `native-slip-auto-import.test.ts` has 7 tests, including 3 new and 2 updated tests. They exercise native transport/session and identity lookup through authenticated routes, isolated MongoDB, and fake Gemini.
- `vp run check-types`: passed 11/11, including native.
- Mutation checks failed as expected. Treating changed assets as settled fails the asset-change test. Removing permanent-rejection records fails three tests. Replacing native identity `slip:` with `slip-` fails two real-server integration tests.

Storage uses one `moojot-slip-scan-v1.<account>.json` per account. Each asset has `modificationTime` and an outcome:

- `saved`, with transaction ID and bound flag.
- `duplicate`.
- `skipped`.
- `rejected`.
- `retry`, with attempts and retryAt.

It stores no bytes, URIs, session data, or model output.

Device/simulator checks did not run. Stored-result reopening and rounds ending with deferred retries have session/fixture evidence only.

### Decisions and subsequent confirmation

- Initially, local `UNREADABLE_IMAGE`, such as an unavailable iCloud original, retried with backoff and no attempt limit. The parent spec prohibits unchanged loops. The alternatives were an attempt limit or rejection until the asset changes.
- Change on 2026-09-29: retry the same `modificationTime` with the same backoff for at most 10 attempts. Then store `rejected`. This generous limit covers local-only failures without upload or Gemini calls.
- A changed `modificationTime` identifies an asset change. iOS metadata-only edits can change it too. This resends `no_candidate`, `incomplete_candidate`, or `rejected` once. Saved/duplicate photos never resend.
- The user approved this rule on 2026-09-29, including exhausted unreadable images and other 4xx responses below.
- Clearing data through `settings/account.tsx` now forgets scan memory. The server hard-deletes rows. Home then rereads the last 30 days. The user approved this on 2026-09-29.
- 401 suspension stays in memory per sign-in session. Restarting with the same rejected session sends one request before suspension recurs.
- `ledger-identity.ts` duplicates `slip:${assetId}` because `import.service.ts` contains unrelated uncommitted edits. Integration tests protect against drift.

Handoff to 04: blur/background still does not call `slipScanSession.stop()`. Only triggers start rounds. The change added no timers.

### 2026-09-29 — review fixes

- Retry only network failures, timeouts including 408, `BUSY`/`AI_RATE_LIMITED` at 429, and 5xx including 504. 401 behavior remains unchanged. All other 4xx, including 403/404/409, become `rejected`. Previously, only 400/413/415 did.
- Retry malformed 200 success bodies marked `INVALID_RESPONSE`. The server may have saved the transaction. Reuse the asset ID.
- `Retry-After` remains capped at 24 hours. `docs/slip-auto-import.md` now documents this cap.
- [Ticket 05](05-device-check.md) collects device/simulator checks for 01–04.

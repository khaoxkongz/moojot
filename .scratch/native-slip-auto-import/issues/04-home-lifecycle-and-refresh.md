# 04: Complete Home activation and refresh gestures

**What to build:** Home reads on activation, pauses when unfocused/inactive, and resumes remaining work on return. A held pull shows animation without starting gesture-triggered work. Release to refresh starts work. The same Home shows “หมูกำลังอ่านสลิปใหม่” (Moo is reading new slips) and animation until the round ends.

**Blocked by:** 02 — [Remember per-image outcomes and schedule retries](02-persist-outcomes-and-retry.md); 03 — [Handle photo access and entry routing](03-onboarding-and-photo-access.md).

**Status:** done

**Done in:** `a12f08b` Read slips while Home is in front and refresh only on release

## Acceptance criteria

- [ ] Combine ticket 01's coordinator/transport, ticket 02's outcomes/eligibility, and ticket 03's permission gate under the [native spec](../spec.md). Every trigger shares one round. Avoid another global busy flag that conflicts with visible state.
- [ ] Home discovers on entry and when the app becomes active while Home has focus. Include bank-app return and use after unlocking. Only authenticated accounts with full photo access send images.
- [ ] Leaving Home, inactivity, locking, sign-out, or lost full access stops scheduling the next image. Coordinate cancellation/pending work with transport. Keep saved results for writes that the server reports as successful.
- [ ] Returning to Home uses persistent outcomes and ticket 02's delay rules. Retain asset IDs for uncertain results. Do not resend completed photos or bypass retry delays on foreground events.
- [ ] Close focus/foreground/refresh events share the active round. Prevent overlapping rounds and concurrent duplicate asset requests. Later triggers cannot clear activity before the real round ends.
- [ ] Separate pull-gesture state from scan activity. Holding/cancelling a pull shows gesture-responsive motion without a new round. Only release at the refresh threshold requests or joins a round.
- [ ] Holding a pull leaves an earlier automatic scan running with its existing results. Test gestures when idle and when reading. Distinguish existing requests from gesture-triggered requests.
- [ ] During discovery/reading, show “หมูกำลังอ่านสลิปใหม่” (Moo is reading new slips) and existing animation. Continue until eligible work ends or pauses. Update state/data within the same Home. There is no route push/replace or separate waiting screen.
- [ ] Every exit releases busy/refreshing: no photos, all skipped/failed, deferred retries, lost permission, query/native errors, and cancellation. Prevent stuck loading and stale callbacks ending a newer round's animation.
- [ ] Preserve ordinary Home statistics and ticket 03's permission action. Scope excludes scan summaries, per-image results, and notifications. Unread photos remain eligible on an appropriate later trigger.
- [ ] End when the round has no remaining work. Scope excludes endless polling, OS background tasks, automatic keep-awake, and restrictions on leaving/locking the app.
- [ ] Use controlled events/time at the existing scan boundary. Prove requests, joined triggers, pause/resume, account isolation, late callbacks, and visible transitions through external behavior. Avoid tests that duplicate every helper.
- [ ] Check device/emulator behavior with synthetic images and controlled AI. Cover Home entry, hold/release, repeated pull while reading, and bank-app return. Include lock/return, permission changes, restart, and account switch. Record same-route and animation evidence during/after rounds.
- [ ] Check integrated new/returning-user flows after 01–03. Onboarding only counts. Home saves. Historical/manual data remains.

  Old import/review entry points are absent. Check duplicate prevention. Use available supported platforms and identify unverified parts.

- [ ] Run `vp check`, `vp test`, native/API/server type checks, and repository-wide type checks under the spec. Fix failures from this work and keep API regression tests passing. Report unrelated failures and unverified platforms with evidence. Real gesture checks remain necessary alongside type checks.

## Why these blockers

Ticket 02 supplies persistent outcomes and retry eligibility for safe pause/resume. Ticket 03 supplies permission gates and settings-return behavior. Both must finish before checking their combined timing. Ticket 01 is already a prerequisite through those tickets.

## Completion evidence

Record each observed scenario, actual check commands, and test-device limitations. App publication, server deployment, and live Gemini smoke testing fall outside this ticket.

## Comments

### 2026-09-29 — implementation evidence

Automated gates ran at the repository root:

- `vp check`: passed formatting/lint.
- `vp test`: passed 183 tests across 7 files.
- `scan-session.test.ts` has 70 tests, including 20 new tests. They drive the session and Home controller `home-scan.ts` through activity/pull events and a controlled clock.
- `native-slip-auto-import.test.ts` adds 1 real-route/MongoDB test with held fake Gemini. Leaving Home mid-round preserves both active slips and starts no third photo. Returning reads the remainder without another row.
- `vp run check-types`: passed 11/11, including native/server/API/web.

At least one test caught each mutation:

- Pause aborts active requests.
- Resume does not wait for a paused round's photos.
- Per-photo access checks disappear.
- Holding a pull requests a round.
- Pushing a pull back still refreshes.
- Leaving Home does not pause.
- Sign-out does not cancel.

### Implemented lifecycle

The former session `stop()` becomes two operations:

- `pause()` stops scheduling, lets active requests finish, preserves their results, and releases reading immediately. Home blur or non-`active` app state calls it.
- `cancel()` also aborts requests. Sign-out/account switching calls it.

A new round waits for a paused round's active photo answer instead of resending it. Home shows reading during that wait. A late paused-round completion cannot change Home's visible state.

Check access before every photo. Narrowed permission immediately stops scheduling.

`createHomeScan` receives Home focus, `AppState`, and account. Entry uses `home`, activation uses `foreground`, and released pull uses `refresh`. Close requests join one round. Ticket 02's retry delays remain. Foreground does not bypass them.

This replaces ticket 03's Settings-only `AppState` listener. Every activation rechecks access.

### Implemented pull behavior

- Holding an iOS pull shows slip animation without “หมูกำลังอ่านสลิปใหม่” (Moo is reading new slips). RefreshControl fires while held, but this requests no work.
- Releasing at least 32pt below the top requests/joins a round. Returning to the top before release cancels the pull.
- Pulling during a round neither stops work nor ends its visible state.
- The native indicator never stays held open.

The change added no timers, polling, or background tasks.

### Verification limits

No device/simulator checklist scenario ran on screen. Unchecked cases include hold/release, repeated pull, bank-app return, lock/return, permission changes, restart, account switch, and combined new/returning flows.

Maestro cannot hold touches without release. `simctl` cannot create named bank albums. A local server would use live Gemini.

### Known limits for device checks

- Android has no `pullStart`/`pullEnd` connections. SwipeRefreshLayout invokes `onRefresh` on release and requests work immediately. Held pulls show only the native white disc/transparent arrow. They do not show slip animation.
- The iOS 32pt cancellation threshold is local, rather than RefreshControl's threshold.
- iOS Notification Center, Control Center, and system alerts cause app state `inactive`. This pauses work and starts a new round on return. The bubble may flicker.

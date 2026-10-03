# 03: Handle photo access and entry routing

**What to build:** New users register/sign in, then complete onboarding discovery/counts before Home starts reading. Returning users enter Home directly. Incomplete access preserves transaction viewing/manual entry. Explain the permission and offer settings so automatic reading can resume.

**Blocked by:** 01 — [Read and save Home slips through the new API](01-home-auto-import-cutover.md).

**Status:** done

**Done in:** `b4beff1` Pause slip reading without full photo access and explain it on Home

## Acceptance criteria

- [ ] Retain existing routing/onboarding state under the [native spec](../spec.md). New users sign in before onboarding. Users who completed onboarding enter Home without repeating it.
- [ ] Onboarding requests full photo access. Discover only supported albums within the existing 30-day window. Show counts by source and total unique asset IDs. Counting sends no images to AI and creates no `FinanceTransaction`.
- [ ] Explain onboarding discovery/counting separately from Home reading/persistence. Photo counts represent discovery. They do not count transactions that AI identifies or the API saves.
- [ ] Denied, limited, or later revoked access preserves onboarding completion under existing account conditions and manual Ledger use. Home pauses sending until full access returns.
- [ ] Home explains that automatic reading needs photo access. Provide a working settings action for that state. Permission prompts/settings opening require user action rather than repeated automatic prompts during discovery.
- [ ] Recheck permission at Home activation and after settings. Restored full access starts ticket 01's coordinator. Preserve completed onboarding without adding another automatic-import activation button.
- [ ] Distinguish incomplete access from full access with no albums/new images. Empty work ends normally, without an incorrect permission warning or stuck reading state.
- [ ] Align consent, onboarding, FAQ, settings, and help. Onboarding counts locally, while Home sends eligible images to AI and saves automatically. Retire promises of manual selection or mandatory review before every save.
- [ ] Text/links exclude the old manual slip/statement flows retired by ticket 01. Preserve explanations and access for manual entry, category selection, and historical data.
- [ ] Test new/returning-user flows and scan rounds with controlled permissions/photo metadata. Prove onboarding never imports, limited/denied access sends nothing, full access reads, and restoration resumes scans.
- [ ] Check denied/limited/revoked/restored permissions and Home on a device/emulator. Check manual entry and historical data remain usable. Record the actual platform and verification limits.
- [ ] Run `vp check`, `vp test`, and native type checks. Keep ticket 01's tests passing. Permission behavior can be proved independently of ticket 02 retry work.

## Scope and handoff

This ticket owns permission eligibility and user explanations through actual Home import. Ticket 04 combines this gate with focus/foreground and refresh gestures. Scope retains existing sources, formats, and the agreed consent sequence.

## Comments

### 2026-09-29 — implementation evidence

Automated gates ran at the repository root:

- `vp check`: passed formatting/lint.
- `vp test`: passed 162 tests across 7 files.
- `discovery.test.ts`: 3 tests cover per-source counts, unique asset totals, the 30-day window, all pages, and no matched album.
- `photo-access.test.ts`: 3 tests cover the Home action for each permission state.
- `scan-session.test.ts`: 6 new/changed tests cover limited, denied, undetermined, and unsupported access. These states send/query nothing and show no reading state. Restored access reads next request. Narrowed access pauses again. Full access without new images completes normally.
- `native-slip-auto-import.test.ts`: 1 new real-route/MongoDB test. Onboarding counting sends no requests. Denied/limited/undetermined access sends nothing to the server/Gemini and saves no rows. Restoration saves both slips.
- `vp run check-types`: passed 11/11, including native.
- Ignoring photo access fails 6 mutation checks: 5 unit tests and 1 integration test.

### Implemented behavior

Onboarding and Home share `discovery.ts`. Onboarding only counts metadata and has no import path. Labels identify photos, rather than slips.

Home shows reading only after permission/sign-in gates pass. No-access rounds never flash "หมูกำลังอ่านสลิปใหม่" (Moo is reading new slips).

Without full access, Home explains paused reading and continued manual use. It offers one action:

- "อนุญาตเข้าถึงรูปภาพ" (allow photo access) when undetermined, opening the system prompt.
- "ไปที่การตั้งค่า" (go to settings) when denied/limited.

Only button taps open prompts/Settings. Rounds inspect permissions without prompting.

If Home has focus and last-known access is incomplete, returning to the active app requests a round. It rechecks permission, including settings return.

Consent, account privacy, FAQ, slip settings/help, and the card page now share these facts:

- Onboarding counts on the device.
- Home sends eligible photos through the server to Gemini and saves automatically, without categories.

Copy no longer promises selection/review before saves or PDF statement import.

Routing remains unchanged. `Stack.Protected` routes signed-in users to onboarding until `onboarding_complete_v1`, then the app. Onboarding "ต่อไป" (next) never requires photo permission.

### Verification limits and handoff

Neither platform had device/simulator screen checks. Permission prompts, settings returns, limited/revoked access, and the Home notice remain unchecked. Automated tests do not cover onboarding's `scanSlipAlbums` wrapper or new/returning routing. They cover shared counting and the session those paths call.

Ticket 04 must replace Home's `AppState` listener, which currently re-requests only when access is not `"all"`. Its general foreground trigger must recheck every activation, including narrowed access while the app remains alive.

Pull-to-refresh still shows reading while `refreshing` equals true, even after immediate `no-access` completion.

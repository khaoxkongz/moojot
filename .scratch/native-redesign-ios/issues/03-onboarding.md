# 03: Four-step onboarding

**What to build:** New users set terms, photo access, goals, and optional information. Recap precedes Home. Values remain shared with profile.

**Blocked by:** 02 — [Signup and sign-in](02-auth-flow.md)

**Status:** ready-for-human

**Done in:** 5f98735 chore(native): set the simulator's photo permission from the iOS preview script; 2aab590 feat(native): four-step setup from the design, complete only when every answer is saved; 44cb2b2 fix(native): address ticket 03 review findings

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md)

**User stories:** 20–27

**Why blocked:** This needs completed signup/session/guards from ticket 02.

- [x] Splash advances after two seconds or a tap. Greeting/progress/back and four steps match handoff. (story 20)
- [x] Terms provide summary/full text and require acceptance. Multiple goals require at least one choice, with clear errors. (stories 21, 25)
- [x] Request OS access. Show all/limited/denied/skipped accurately. Allow skipping and recheck after Settings. (stories 22, 23)
- [x] Explain slip reading before permission. Let the user grant access or skip. (story 22)
- [x] Discover/count metadata per album without GenAI until Home. Recap describes found photos rather than saved transactions. (story 24)
- [x] Recap shows selected goals and actual photo access before use. (story 27)
- [x] Optional birthday uses valid day/month/Buddhist-year columns. Profile uses the same two consent values. (story 26)
- [x] Persist completion only after required data succeeds. Partial failure retains data for retry and leaves setup incomplete.
- [ ] Check signup→ready→Home, skipped permission, Settings return, and partial-save recovery on iOS.

## Comments

**Ticket 03 — agent, 2026-10-04:** Implementation commits:

- `5f98735 chore(native): set the simulator's photo permission from the iOS preview script`
- `2aab590 feat(native): four-step setup from the design, complete only when every answer is saved`
- `44cb2b2 fix(native): address ticket 03 review findings`

`vp check`, `vp test` (430 tests), `vp run check`, and `vp run check-types` passed. The iPhone 11 simulator evidence and the deliberate differences from the handoff are in [the ticket 03 notes](../notes/03-onboarding.md).

The last box stays open. The simulator checked signup to Home, skip, a refusal followed by full access in Settings, and a failed save followed by a retry. It did not check these items:

- Limited access. Maestro cannot drive the “Limit Access…” picker, and `simctl` cannot set limited access.
- Counts above 0. The simulator has no bank albums.
- A partial save on the device. With the server stopped, every write failed together. The server test `apps/server/test/onboarding.test.ts` covers one failed key.
- The busy labels, back during a pending save, and the message for a failed setup check after a completed save. The local server answers too fast. Unit tests cover the last two.

Check these items on the iPhone 13 Pro. Then tick the last box and set `Status: done`:

1. Use a phone with bank albums. Allow with “Allow Full Access”. Check the counts for each album, the count badge, and the count in the recap.
2. Pick “Limit Access…” and select some photos. Check the limited note on the photo step and the limited text in the recap.
3. Refuse access. Tap “เปิดการตั้งค่ารูปภาพ” (open photo settings), give full access, and go back to the app. Check that setup resumes at the photo step with the count. Then go to Settings again and come back without a change. Check that the step does not change.
4. Tap “ข้ามไปก่อน” (skip for now) and finish setup. Check that Home offers photo access.
5. Use a slow network. Check the busy labels “กำลังนับรูป…” (counting photos) and “กำลังบันทึก…” (saving). Check that the header back button does nothing while the save is pending.
6. Turn on airplane mode at the recap and tap “เริ่มใช้งานหมูจดเลย!” (start using Moojot). Check the save error. Turn off airplane mode, tap again, and check that Home opens.
7. On each step, swipe from the left edge of the screen. Check that the app stays on the same step. The header back button walks the steps.

Nobody checked Dynamic Type or VoiceOver.

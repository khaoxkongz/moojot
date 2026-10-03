# 02: Signup and sign-in

**What to build:** Match signup, sign-in, mode switching, and logout to the design. Show field errors and account messages from actual auth results.

**Blocked by:** 01 — [iOS typography and theme foundation](01-ios-theme-foundation.md)

**Status:** ready-for-human

**Done in:** d65c91c feat(native): signup and sign-in from the design, with factual account errors; 3f47764 fix(native): address ticket 02 review findings

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md)

**User stories:** 11–19, 98

**Why blocked:** This needs the typography/theme/controls foundation from ticket 01.

- [x] First app start opens signup. Mode switching preserves relevant input. After logout confirmation, the app opens sign-in with the latest email and cleared password. (stories 11, 13, 98)
- [x] Require name ≥2 characters, valid email, and password ≥8 characters. Provide show/hide, live rule, and Enter focus/submit per handoff. (stories 14, 17)
- [x] Incomplete actions show field errors. Typing clears only the affected error. Pending submission prevents duplicates and preserves input. (story 15)
- [x] Unknown email/wrong password/duplicate signup use factual auth-contract messages/actions. A shared error alone cannot prove the case. (story 16)
- [x] Signup enters greeting. Completed-onboarding sign-in enters Home with the name. Guards let incomplete accounts resume setup. (stories 12, 18, 19)
- [x] Test success/failure/recovery through the auth interface with fixture accounts. Check keyboard/back/mode switching on iOS.

## Comments

**Ticket 02 review — agent, 2026-10-03:** The spec says to report user-visible limitations before changing UI. The review kept these differences from the handoff on purpose:

- A failed setup check for a signed-in account opens a retry screen. Before this ticket, that failure sent a completed account to setup again.
- The app shows messages for causes that the handoff prototype cannot have. These are the shared sign-in code, the rate limit, a lost connection, the 128-character password limit, and other failures. Without them, a real auth failure shows no message.
- The signup password field uses `autoComplete="off"`. With the new-password content type, the simulator covered the field with Automatic Strong Password. After “แสดง” (show) and “ซ่อน” (hide), iOS replaced the typed text. Sign-in keeps Keychain autofill.
- Setup starts at the greeting, because the spec says that signup enters the greeting. The other steps keep their old order: birthday, terms, privacy, personalization. The greeting has no back button, because no screen is behind it. Ticket 03 owns the step order.

**Ticket 02 — agent, 2026-10-03:** Implementation commits:

- d65c91c feat(native): signup and sign-in from the design, with factual account errors
- 3f47764 fix(native): address ticket 02 review findings

`vp check`, `vp test` (397 tests), `vp run check`, and the type checks of all workspaces passed. The iPhone 11 simulator evidence is in [the ticket 02 notes](../notes/02-auth-flow.md).

Check these items on the iPhone 13 Pro. Then set `Status: done`:

1. In signup and in sign-in, type a password with the password hidden. Check that the field shows dots.
2. Save the password of an account in iOS Passwords. Open sign-in and tap the password field. Check that the keyboard offers the saved password, and that the password fills the field.
3. In signup, tap the password field. Check that no Automatic Strong Password cover appears. Type a password, tap “แสดง” (show), then tap “ซ่อน” (hide). Check that the field keeps the typed password.
4. In signup, use the Return key of the on-screen keyboard. From the name, it must move to the email. From the email, it must move to the password. From the password, it must send the form. In sign-in, Return from the password must send the form.
5. On the auth screen, the greeting, and Home, swipe from the left edge of the screen. Check that the app stays on the same screen. The splash, the auth screen, and an earlier account must not appear.
6. Sign in on a slow network. Check the busy labels “กำลังสมัคร…” (signing up) and “กำลังเข้าสู่ระบบ…” (signing in), and that a second tap sends nothing.

Nobody checked Dynamic Type, VoiceOver, or the retry screen of the setup check. The retry screen appears only when the setup check fails for a signed-in account.

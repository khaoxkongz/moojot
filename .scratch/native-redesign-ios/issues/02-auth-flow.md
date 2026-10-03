# 02: Signup and sign-in

**What to build:** Match signup, sign-in, mode switching, and logout to the design. Show field errors and account messages from actual auth results.

**Blocked by:** 01 — [iOS typography and theme foundation](01-ios-theme-foundation.md)

**Status:** ready-for-agent

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md)

**User stories:** 11–19, 98

**Why blocked:** This needs the typography/theme/controls foundation from ticket 01.

- [ ] First app start opens signup. Mode switching preserves relevant input. After logout confirmation, the app opens sign-in with the latest email and cleared password. (stories 11, 13, 98)
- [ ] Require name ≥2 characters, valid email, and password ≥8 characters. Provide show/hide, live rule, and Enter focus/submit per handoff. (stories 14, 17)
- [ ] Incomplete actions show field errors. Typing clears only the affected error. Pending submission prevents duplicates and preserves input. (story 15)
- [ ] Unknown email/wrong password/duplicate signup use factual auth-contract messages/actions. A shared error alone cannot prove the case. (story 16)
- [ ] Signup enters greeting. Completed-onboarding sign-in enters Home with the name. Guards let incomplete accounts resume setup. (stories 12, 18, 19)
- [ ] Test success/failure/recovery through the auth interface with fixture accounts. Check keyboard/back/mode switching on iOS.

## Comments

**Ticket 02 review — agent, 2026-10-03:** The spec says to report user-visible limitations before changing UI. The review kept these differences from the handoff on purpose:

- A failed setup check for a signed-in account opens a retry screen. Before this ticket, that failure sent a completed account to setup again.
- The app shows messages for causes that the handoff prototype cannot have. These are the shared sign-in code, the rate limit, a lost connection, the 128-character password limit, and other failures. Without them, a real auth failure shows no message.
- The signup password field uses `autoComplete="off"`. With the new-password content type, the simulator covered the field with Automatic Strong Password. After “แสดง” (show) and “ซ่อน” (hide), iOS replaced the typed text. Sign-in keeps Keychain autofill.
- Setup starts at the greeting, because the spec says that signup enters the greeting. The other steps keep their old order: birthday, terms, privacy, personalization. The greeting has no back button, because no screen is behind it. Ticket 03 owns the step order.

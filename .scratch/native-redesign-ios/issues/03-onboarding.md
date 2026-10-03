# 03: Four-step onboarding

**What to build:** New users set terms, photo access, goals, and optional information. Recap precedes Home. Values remain shared with profile.

**Blocked by:** 02 — [Signup and sign-in](02-auth-flow.md)

**Status:** ready-for-agent

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md)

**User stories:** 20–27

**Why blocked:** This needs completed signup/session/guards from ticket 02.

- [ ] Splash advances after two seconds or a tap. Greeting/progress/back and four steps match handoff. (story 20)
- [ ] Terms provide summary/full text and require acceptance. Multiple goals require at least one choice, with clear errors. (stories 21, 25)
- [ ] Request OS access. Show all/limited/denied/skipped accurately. Allow skipping and recheck after Settings. (stories 22, 23)
- [ ] Explain slip reading before permission. Let the user grant access or skip. (story 22)
- [ ] Discover/count metadata per album without GenAI until Home. Recap describes found photos rather than saved transactions. (story 24)
- [ ] Recap shows selected goals and actual photo access before use. (story 27)
- [ ] Optional birthday uses valid day/month/Buddhist-year columns. Profile uses the same two consent values. (story 26)
- [ ] Persist completion only after required data succeeds. Partial failure retains data for retry and leaves setup incomplete.
- [ ] Check signup→ready→Home, skipped permission, Settings return, and partial-save recovery on iOS.

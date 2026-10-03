# 20: Human profile and guidance

**What to build:** “พี่มนุษย์” (Human profile) combines tools/current status, settings/consent, and help. Every primary link reaches a working flow.

**Blocked by:** 07 — [Slip results and needs-help work](07-slip-work-queue.md)

**Status:** ready-for-agent

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md)

**User stories:** 95–98

**Why blocked:** This needs ticket 07's new slip routes/status. Existing auth, consent, planning, calendar, streak, and card operations remain usable. Profile can start before every destination redesign finishes.

- [ ] Match handoff sections/text/assets. Tools come first with actual budget/over-budget/rule/streak/import/card status. (story 95)
- [ ] Session supplies email. Two consent switches share onboarding values. Coordinate pending/failure and response ordering to avoid stale values. (story 96)
- [ ] Every row opens working category/tag, calendar, theme, budget/rule, carrot, slip, card, or CSV screens/sheets.
- [ ] FAQ accordions/guide/terms/slip help use sheets. Explain actual automatic reading, pending work, and app pauses. (story 97)
- [ ] Language is Thai information. Use actual version data. Unavailable social links remain captions rather than buttons without handlers.
- [ ] Logout confirmation returns the user to auth with the latest email. Cancel/isolate the outgoing account's scan/query/attachments. (story 98)
- [ ] Check dynamic states/consent contracts and profile→tools/help/logout in iOS light/dark.

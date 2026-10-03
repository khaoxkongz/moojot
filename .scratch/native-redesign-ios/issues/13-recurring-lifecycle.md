# 13: Edit, pause, and resume recurring rules

**What to build:** Apply recurring edits to the next occurrence. Pause/resume skips intentional pause dates. Rule deletion/restoration preserves history.

**Blocked by:** 10 — [Set budgets and restore deleted budgets](10-budgets.md); 12 — [Create recurring rules and generate due entries](12-recurring-create.md)

**Status:** ready-for-agent

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md)

**User stories:** 81–84

**Why blocked:** This uses ticket 12's schedule/identity and ticket 10's server delete/restore boundary.

- [ ] Day/amount/detail edits affect the next occurrence. Preserve existing entries and avoid historical generation with edited values. (story 81)
- [ ] A two-month pause followed by resume skips paused dates and starts at the next due date. Support multiple actual intervals. (story 82)
- [ ] Resume requires user action rather than an automatic timer. App inactivity is not a pause interval. (stories 82, 83)
- [ ] Persist effective schedules/versions/intervals that generation actually uses. Current isActive alone cannot reinterpret all history.
- [ ] Rule deletion preserves generated entries. Undo restores original IDs/fields/affected references. Repeated generation creates no clones. (story 84)
- [ ] Repeated requests/failure/conflict/ownership preserve history and report restoration completeness accurately.
- [ ] Check several months, edit/resume/delete/restore with controlled time/test database. Check lifecycle on iOS.

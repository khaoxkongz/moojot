# 16: Apply calendar settings immediately

**What to build:** Select periods, week/month starts, and anchors immediately. Show actual ranges and support defaults/reset undo.

**Blocked by:** 05 — [Home, filters, and category queue](05-home-filter-queue.md)

**Status:** ready-for-agent

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md)

**User stories:** 91–94

**Why blocked:** This uses completed Home periods/refresh. Existing Summary/budget APIs can prove boundaries before their appearance changes.

- [ ] Provide month/week/fortnight cards, weekday chips, this/last-week anchors, and month days 1–31. Apply without save confirmation. (story 91)
- [ ] Weekday changes reset anchor under the prototype. Use actual ranges, capped month days, and month-start labels. (story 92)
- [ ] Persist choices. Refresh Home/Summary/budgets consistently. Explain which screens month start affects. (story 93)
- [ ] Rapid changes and late responses cannot restore stale values. Failure handles optimistic rollback/pending accurately.
- [ ] Show Reset only for nondefault values. Undo restores previous preferences rather than financial entries. (story 94)
- [ ] Check contracts/order/ranges/leap months and tap→Home/reset/undo on iOS.

# 17: Carrots, streak, and tutorial

**What to build:** Show recording continuity, feeding, counting choices, and the four-page tutorial while preserving actual data.

**Blocked by:** 05 — [Home, filters, and category queue](05-home-filter-queue.md)

**Status:** ready-for-agent

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md)

**User stories:** 99–102

**Why blocked:** Feeding criteria need Home's category queue, Add entry, and actual transaction dates.

- [ ] Today, seven-day row, streak, and carrots use actual transaction date/settings rather than seed values. (story 99)
- [ ] Feed once daily when enabled and actual recorded/categorized criteria hold. Await server success before incrementing carrots or reporting success. (story 100)
- [ ] Unmet criteria lead to entry/category queue. Error/retry prevents duplicate carrots.
- [ ] Provide recorded/categorized/off choices and reactivation. Disabled counting preserves entries/progress by default. (story 101)
- [ ] Four tutorial illustrations provide handoff back/next. Help explains actual criteria. (story 102)
- [ ] Check API day/timezone/count/ownership and feeding/settings/tutorial on iOS.

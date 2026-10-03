# 19: Card totals and transactions

**What to build:** Cards show current-month totals and three latest transactions. View all/Add entry retain the selected card.

**Blocked by:** 09 — [Search all months and amounts](09-search.md); 11 — [Add and select the first card](11-first-card.md)

**Status:** ready-for-agent

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md)

**User stories:** 105–106

**Why blocked:** This needs actual selectable cards and search accepting exact identity/prefill.

- [ ] Show cards from actual entries by name+last4, with an empty state rather than user-owned seed cards.
- [ ] Accounting-month expense totals/counts cover every page within custom boundaries. Show three latest entries of all kinds across months. (story 105)
- [ ] View all opens relevant search with exact card identity. Same-name cards stay separate. (story 106)
- [ ] Pending rows open queue and others open editor. Add entry prefills the selected card rather than the first card. (story 106)
- [ ] Profile can reuse the same card data/status. Loading/error/empty states avoid seed totals.
- [ ] Check same-name cards, >1,000-row totals, and dashboard→search/editor on iOS.

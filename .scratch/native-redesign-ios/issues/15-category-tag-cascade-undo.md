# 15: Delete categories or tags with complete restoration

**What to build:** Category/tag deletion coordinates affected entries, rules, and budgets. Undo restores everything affected while preserving unrelated edits.

**Blocked by:** 13 — [Edit, pause, and resume recurring rules](13-recurring-lifecycle.md); 14 — [Create and manage categories and tags](14-category-tag-management.md)

**Status:** ready-for-agent

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md)

**User stories:** 88–90

**Why blocked:** This needs category/tag UI/identity, schedules/rules, and complete rule/budget restoration operations.

- [ ] Custom-category deletion clears entry/rule links and deletes linked budgets. Entries remain pending-category work without stale fallback names. (story 88)
- [ ] Tag deletion clears entry/rule links and deletes linked budgets while preserving other fields/tags. (story 90)
- [ ] Latest undo within 5 seconds restores original category/tag IDs, budgets, entry/rule relationships, and relevant schedule data. (stories 89, 90)
- [ ] Restore completely within a transaction or report conflict/error. Preserve identity without clones or whole-ledger rollback.
- [ ] Intervening amount/title/other-tag edits remain. Repeated restoration creates no duplicates. Other users cannot restore the receipt.
- [ ] Counts/pending/budget/rule/search consumers refresh after actual results. Failures remain visible.
- [ ] Prove cascade/restore/concurrent edits in a test database. Delete a coffee category with a budget, then undo on iOS.

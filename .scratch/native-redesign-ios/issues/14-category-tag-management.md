# 14: Create and manage categories and tags

**What to build:** Category/tag tabs support creation, editing, selection, usage counts, and consistent input checks across paths.

**Blocked by:** 04 — [Manual entry and transaction editing](04-manual-entry.md)

**Status:** ready-for-agent

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md)

**User stories:** 85–87

**Why blocked:** Return to the existing editor draft and select newly edited data through ticket 04.

- [ ] Expense/income tabs, custom lists/counts, and system grid match design. Counts include more than 1,000 rows completely. (story 85)
- [ ] Custom categories choose emoji. Tags provide suggestions and one-tap addition. The handoff excludes a color picker. (story 86)
- [ ] Check duplicate names and tag length ≤20 across create/update/inline editor paths. Enforce rules beyond one UI path. (story 87)
- [ ] Built-in categories cannot be edited/deleted in UI/API. (story 87)
- [ ] Nested management returns to the same editor draft. New/edited choices refresh, remain selectable, and save in actual transactions.
- [ ] Loading/error/save failure stays distinct from empty/success and preserves input.
- [ ] Check server input rules/counts with fixtures and manager→editor on iOS. Separate cascade-undo work must finish before whole-feature acceptance.

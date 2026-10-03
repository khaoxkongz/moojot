# 21: Start fresh experimental data in the existing account

**What to build:** Try the redesign with a fresh financial dataset, the same email, and other accounts unaffected.

**Blocked by:** 03 — [Four-step onboarding](03-onboarding.md); 08 — [Summary totals and trends](08-summary.md); 15 — [Delete categories or tags with complete restoration](15-category-tag-cascade-undo.md); 16 — [Apply calendar settings immediately](16-calendar.md); 17 — [Carrots, streak, and tutorial](17-streak.md); 18 — [Export CSV with actual transaction dates and times](18-csv.md); 19 — [Card totals and transactions](19-card-dashboard.md); 20 — [Human profile and guidance](20-profile.md)

**Status:** ready-for-agent

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md)

**User stories:** 109

**Why blocked:** All flows and schema/API/client must be ready. These final dependencies cover preceding work through their own blockers.

- [ ] Prepare reviewable run instructions/commands identifying account/environment, schema-API-client versions, and reset data. Keep credentials outside documentation.
- [ ] Stop new scheduling/writes before reset. Resolve existing request outcomes. Closing the client does not prove server writes stopped.
- [ ] Check schema/index/generated client/contracts in an isolated test database before the actual experimental dataset.
- [ ] Reset only selected-account entries/rules/budgets/tags/custom categories/preferences. Preserve auth/email/credentials/built-in categories and other accounts. (story 109)
- [ ] Reset matching local scan/work memory, image bindings, and query cache. Each step supports error recovery/retry without stale-data mixing.
- [ ] Complete fresh onboarding, entry, earlier-photo reading, categorization, totals, recurrence, and CSV. Old memory cannot block the new dataset. Prevent duplicates within the new dataset. (story 109)
- [ ] Prove reset isolation/auth retention in tests. Identify actual transition targets/scope for review before execution. Report unperformed steps.

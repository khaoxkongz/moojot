# Inspect data and API gaps for the redesign

Label: wayfinder:task
Type: task
Mode: AFK
Status: resolved
Assignee: Codex (/root)
Blocked by: 02, 03, 04
Parent: [Plan the Moojot app redesign](../map.md)

## Question

Compare each handoff screen/flow's data needs with existing data and APIs. Create a coverage table for evidence-based delivery and transition decisions. Include all-month/amount search, cards, recurring entries, undo, slip results, CSV, and profile states.

Finish when every requirement has handoff and code references. Identify existing support, missing data, or missing API contracts. Include open decisions and related code paths. Save the table as a linked asset. Provide decision facts while preserving the map's approved UI.

## Answer

[The reviewed coverage table](../assets/data-api-coverage.md) covers auth/onboarding, Home/filter/category queue, editor, summary, slips, streak, planning, and profile/settings/CSV. It also covers search, categories/tags/undo, calendar, and cards. It includes source pointers and acceptance criteria for handoff.

- Reuse existing entries, categories, tags, budgets, summaries, calendar, preferences, and auth. Compose all-month search and many card functions from existing operations.
- Main changes concern identity/relationship-preserving undo, recurring cards/effective periods, pending slip work/manual entry/targeted retry, slip evidence, amount search, CSV, and auth errors.
- The separate recurring-resume and first-card product questions now have user answers in their tickets.
- These findings are source evidence, rather than redesign runtime proof. Earlier passing tests do not replace new behavior checks.
- Use the table for reset methods, technical planning, and delivery order before spec handoff.

## Comments

### Source coverage table

[Data and API coverage](../assets/data-api-coverage.md) combines agent inspection and root review. It covers handoff screens/flows and distinguishes reusable foundations from data/contract additions. This is source evidence. No implementation changed.

Two discovered questions became recurring-resume and first-card decisions. Discuss them with the user one scenario at a time. Engineering details support delivery planning and the spec.

The task remained claimed for coverage resolution in the next round. This round closed the existing-data decision under Wayfinder constraints.

# Implementation tickets: Moojot redesign on iOS

Published: ready-for-agent
Approval: ผู้ใช้ยืนยัน “ใช้ตามนี้ได้เลยครับ”

Approval explanation: The user approved the plan: “You can use this plan.”

Source: [Spec: Redesign Moojot with iOS acceptance first](spec.md)

At publication, 22 tickets covered complete flows from UI through data/API and behavior checks. Their separate files contained 146 acceptance criteria with ready-for-agent status. Unfinished blockers must resolve before dependent work starts. The source spec/plan remains unchanged by publication.

## Work sequence

- Start iOS typography/theme as a preparatory refactor with observable screen results. Then prioritize signup/onboarding/manual entry/Home/slip reading.
- Blocked by records dependencies needed to complete a flow or contract. Core-before-supporting priority is guidance rather than an extra edge forcing one linear chain.
- Signup and manual entry can start independently after the foundation. Other work starts when blockers finish. Check shared-file edits before parallel work. File coordination differs from product dependency.
- Extend data alongside its consuming flow in the same ticket. Retain existing callers/data until migration. Retire old code after all callers move. Each ticket should be independently usable rather than waiting for separate schema/API/UI batches.
- Follow the spec's design version/reference/glossaries. Check changed iOS flows and appropriate checks/type checks/tests. Android verification follows later.
- Each ticket covers a flow or connected state transitions. Scanner/manual races and recurring history have larger criteria. Those criteria define scope. Further splitting remains available if the user requests it.

## Published tickets

| Ticket                                                                                            | Blocked by                     | Delivered behavior                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01: [iOS typography and theme foundation](issues/01-ios-theme-foundation.md)                      | None. Start immediately.       | Existing iOS app supports actual light/dark choice and shared design fonts/colors/controls on Home/editor. Preserve reading/persistence while preparing later flows. |
| 02: [Signup and sign-in](issues/02-auth-flow.md)                                                  | 01                             | Designed signup/sign-in/mode switching/logout with field errors and factual auth messages.                                                                           |
| 03: [Four-step onboarding](issues/03-onboarding.md)                                               | 02                             | Terms, photo access, goals, optional data, and recap before Home, using values shared with profile.                                                                  |
| 04: [Manual entry and transaction editing](issues/04-manual-entry.md)                             | 01                             | Complete API amount/date/category/tags/bank entry, save/edit/delete/undo.                                                                                            |
| 05: [Home, filters, and category queue](issues/05-home-filter-queue.md)                           | 04                             | Daily accounting-period entries, bank/card filters, sequential categorization, and editing from Home.                                                                |
| 06: [Read slips and show actual evidence](issues/06-slip-evidence.md)                             | 04                             | Actual image/date/transaction time/counterparties/bank/card evidence in the editor, with unknown data left unknown.                                                  |
| 07: [Slip results and needs-help work](issues/07-slip-work-queue.md)                              | 05, 06                         | Three result groups, navigation during reading, pending manual resolution/targeted retry, and duplicate protection.                                                  |
| 08: [Summary totals and trends](issues/08-summary.md)                                             | 05                             | Relevant monthly Summary, totals/share bars/six-month trends, and scoped categorization.                                                                             |
| 09: [Search all months and amounts](issues/09-search.md)                                          | 05                             | Complete cross-month results/totals, highlights/recent queries, and editing/category continuation.                                                                   |
| 10: [Set budgets and restore deleted budgets](issues/10-budgets.md)                               | 01                             | All/category/tag allowances and actual spending, replacement of existing allowances, and original-budget undo.                                                       |
| 11: [Add and select the first card](issues/11-first-card.md)                                      | 04                             | Actual first-card name/last4, reusable selection, and ordinary app use without cards.                                                                                |
| 12: [Create recurring rules and generate due entries](issues/12-recurring-create.md)              | 11                             | Rules from Plan/editor with actual first/next dates, due entries, and links without duplicating original entries.                                                    |
| 13: [Edit, pause, and resume recurring rules](issues/13-recurring-lifecycle.md)                   | 10, 12                         | Future-effective edits, skipped pause intervals, and delete/restore with preserved history.                                                                          |
| 14: [Create and manage categories and tags](issues/14-category-tag-management.md)                 | 04                             | Tabbed creation/editing/selection, usage counts, and consistent input checks.                                                                                        |
| 15: [Delete categories or tags with complete restoration](issues/15-category-tag-cascade-undo.md) | 13, 14                         | Coordinated entries/rules/budgets and complete undo while preserving unrelated edits.                                                                                |
| 16: [Apply calendar settings immediately](issues/16-calendar.md)                                  | 05                             | Immediate period/week/month/anchor choices, actual ranges, defaults, and previous-value restoration.                                                                 |
| 17: [Carrots, streak, and tutorial](issues/17-streak.md)                                          | 05                             | Actual continuity/feeding/counting choices and four-page tutorial, without unintended data reset.                                                                    |
| 18: [Export CSV with actual transaction dates and times](issues/18-csv.md)                        | 06, 11                         | Complete all-month ten-column Thai CSV with factual account/card/time evidence.                                                                                      |
| 19: [Card totals and transactions](issues/19-card-dashboard.md)                                   | 09, 11                         | Current-month totals, three latest entries, and identity-preserving View all/Add entry.                                                                              |
| 20: [Human profile and guidance](issues/20-profile.md)                                            | 07                             | Tools/current status, settings/consent, help, and working primary destinations.                                                                                      |
| 21: [Start fresh experimental data in the existing account](issues/21-scoped-cutover.md)          | 03, 08, 15, 16, 17, 18, 19, 20 | Fresh redesigned financial data with the same email and other accounts unaffected.                                                                                   |
| 22: [Accept the complete app on iOS](issues/22-ios-acceptance.md)                                 | 21                             | Physical iPhone/simulator evidence that all fresh-data flows and design work together under the spec.                                                                |

## Dependency checks

- Summary and Search start independently after Home.
- Budgets start after shared UI and use existing month operations, without waiting for Summary.
- Calendar uses Home consumers/periods and existing APIs. It does not wait for Summary/budget redesign.
- First-card work follows core use in recommended priority. It is a real dependency for card-selecting recurring rules and the card screen.
- Recurring lifecycle needs created schedules and budget restoration operations. Category/tag cascades therefore wait for full budget/rule-history restoration.
- Profile needs new slip routes/status. Existing auth/consent/planning/calendar/streak/card operations allow composition before all destination screens finish.
- Data transition waits for final flows whose dependencies cover earlier work. Whole-app iOS acceptance follows transition. This round excludes whole-database deletion and Android setup.

## Publication

The user accepted ticket sizes and blocking edges. Publish one file per ticket in dependency order with reviewed criteria. The first eligible ticket is iOS typography/theme.

Work from the frontier. Start only tickets whose blockers are all done. After the foundation, signup/sign-in, manual entry, and budget allowances can start under their dependencies. Prioritize core use before supporting features under the spec.

Publishing tickets does not start implementation or reset data. Preserve the parent spec's status. Android verification follows later under the existing scope.

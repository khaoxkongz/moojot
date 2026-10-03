# Spec: Redesign Moojot with iOS acceptance first

Status: ready-for-agent
Source: [Plan the Moojot redesign](../native-redesign-wayfinding/map.md)

## Problem Statement

The user likes the new Claude Design prototype. It corrects oversized/heavy typography and clarifies explanations and interactions. The existing app still differs in appearance and behavior. Color/layout changes alone are insufficient. Pending slips, undo, all-month search, and recurring rules need data/contracts that the existing system does not fully support.

The app is experimental. The user can start fresh financial data, but existing authentication accounts must remain. Prioritize familiar entry and slip reading, then complete the remaining design. This round checks and accepts iOS. Android follows later.

## Solution

Adapt the existing Expo / React Native app to the handoff in light/dark themes. Match colors, fonts, sizes, spacing, illustrations, text, and interactions. Reuse existing components, navigation, queries/forms, and APIs where they meet requirements. Extend data/contracts only for identified gaps. Every flow uses actual persisted data and supports pending, error, and recovery states.

These decisions override conflicting mock data and old behavior:

- Group transactions by bank.
- Identify cards by name and last four digits.
- Manual entry selects a date only.
- Unknown transaction time remains blank in CSV.
- Category/tag deletion cascades to linked budgets, with complete undo.
- Retain slips needing help across rounds.
- Resumed recurring rules skip intentional pause intervals.

Deliver four stages that the user can try on iPhone:

| Stage                           | Required result                                                                                           |
| ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Shared foundation               | Typography, theme, controls, navigation, and key data contracts, with fixtures and a working iOS startup. |
| Core use                        | Auth/onboarding → Home → entry/edit/category → slip reading/pending help works with the API.              |
| Summary and planning            | Summary, all-month Search, budgets, recurring rules, categories/tags, and calendar use consistent data.   |
| Supporting flows and acceptance | Profile, carrots/tutorial/help, cards, CSV, and all flows pass iOS checks.                                |

## User Stories

### Shared appearance and interactions

1. As a user, I want Thai text in LINE Seed Sans TH Regular. It should remain readable without excessive weight.
2. As a user, I want aligned system-font amount digits. This makes amounts easy to compare.
3. As a user, I want colors, spacing, illustrations, and text to match the selected design. The actual app should deliver the expected experience.
4. As a user, I want one selected light/dark theme across every screen. This makes the app comfortable to read.
5. As a user, I want easily tappable iPhone buttons and rows. I should not need repeated taps or precise aiming.
6. As a user, I want primary actions to explain missing data. I can then continue correctly.
7. As a user, I want status words and icons. Meaning should remain clear without color alone.
8. As a user, I want accurate loading, error, empty, and data states. I should not mistake a load failure for missing transactions.
9. As a user, I want input preserved after a failed save. Retry should not require reentry.
10. As a user, I want key actions accessible with the keyboard or larger text. I can then complete core tasks.

### Account and onboarding

11. As a new user, I want signup after splash. This provides a direct account-creation path.
12. As a returning user, I want existing email/password sign-in. I can then resume app use.
13. As a user, I want relevant input preserved when switching signup/sign-in modes. I should not need to retype email.
14. As a user, I want password show/hide and a visible eight-character minimum. I can then check my input.
15. As a user, I want errors beside their fields. Correcting a field should clear its error.
16. As a user, I want factual distinctions between unknown email, wrong password, and registered email. This guides signup/sign-in choices.
17. As a user, I want Enter to advance fields and submit from the last field. This supports continuous input.
18. As a new user, I want successful signup to reach greeting/setup. I should not need to guess the next action.
19. As a returning user, I want Home after completed onboarding and setup otherwise. This resumes the correct state.
20. As a new user, I want four setup steps with progress and back navigation. I can see what remains.
21. As a new user, I want a terms summary and the full terms before acceptance. I can then understand the conditions.
22. As a new user, I want slip-reading explanations before photo permission, with a skip option. I can then decide access.
23. As a user, I want actual all/limited/denied status and a recheck after Settings. This explains how to enable reading.
24. As a new user, I want album photo counts before AI starts at Home. This separates discovery from recording.
25. As a new user, I want multiple goal selections and guidance when I select no goal. Setup should use tappable options.
26. As a new user, I want optional birthday input and two consent choices. I can choose additional information.
27. As a new user, I want a goal/permission recap before starting. I can see what the app is ready to do.

### Home and entries

28. As a user, I want Home spending totals and daily groups. These show spending within the selected period.
29. As a user, I want calendar-based month/week/fortnight navigation. I can view my actual periods.
30. As a user, I want Summary for the period I am viewing. I can continue checking its details.
31. As a user, I want bank/card/unspecified filters with clearing. I can view the groups I need.
32. As a user, I want one group per bank. I should not need to configure individual accounts at that bank.
33. As a user, I want manual entries with a bank included in that bank's group. Filters should classify them correctly.
34. As a user, I want a pending-category count and sequential category queue. This avoids opening several screens per transaction.
35. As a user, I want skip/edit actions during categorization. I can handle transactions whose category remains undecided.
36. As a user, I want Add entry to open the editor directly. I can start quickly.
37. As a user, I want “รายจ่าย” (expense), “รายรับ” (income), and “ย้ายเงิน” (transfer) labels. I can understand transaction kinds.
38. As a user, I want keypad calculation and amount paste. I can total an amount before recording.
39. As a user, I want category selection after entering a new amount. This follows a clear sequence.
40. As a user, I want calendar dates and past entries without time input. I can record transactions with only a known day.
41. As a user, I want title, note, category, tags, and an explained blank-title fallback. I can recognize the entry on Home.
42. As a user, I want bank/card/unspecified selection for manual entries. I can filter and total the source I used.
43. As a user, I want slip images and extracted details. I can check evidence before editing.
44. As a user, I want save/discard confirmation for a changed draft. This prevents accidental input loss.
45. As a user, I want deletion with undo. I can reverse an accidental deletion immediately.
46. As a user, I want totals to exclude transfers from income/expense. Moving money should not increase those totals.

### Slip reading and pending work

47. As a user, I want new supported-album images read when the app is eligible. Moo records them without individual image selection.
48. As a user, I want other app screens available during slip reading. I can continue entering/viewing data.
49. As a user, I want new uploads paused when switching apps or locking, then resumed on return. Reading should remain predictable.
50. As a user, I want “ต้องช่วยหมู” (needs help), “จดให้แล้ว” (recorded), and “ข้ามไป” (skipped) groups. I can see each image's next action.
51. As a user, I want needs-help work retained across rounds and app starts. Pending work should remain visible.
52. As a user, I want incomplete slips to await manual entry without automatic GenAI resend for remembered images. Pending work should not repeat reading without new data.
53. As a user, I want temporary failures retried at appropriate times. Slips can be recorded when service returns.
54. As a user, I want the photo date prefilled when manually resolving a pending slip. This helps enter missing data.
55. As a user, I want manually resolved slips linked to the transaction and marked handled. They should stay outside pending work.
56. As a user, I want one transaction per image despite concurrent retry/manual entry. Financial totals must remain accurate.
57. As a user, I want duplicates/non-slips marked skipped without action. I should not need to resolve unnecessary images.
58. As a user, I want factual limitations when images disappear or access changes. Unrecorded work must not appear resolved.
59. As a user, I want outcomes and image bindings isolated by sign-in account. Account switching must not mix data.

### Summary and search

60. As a user, I want Summary amounts for “ได้รับ” (received) and “ใช้ไป” (spent).
    I also want “เหลือ” (remaining) or “ใช้เกินรายรับ” (spent above income). I can understand monthly totals.
61. As a user, I want horizontal category/tag-share bars. I can compare groups.
62. As a user, I want Summary's category queue limited to the viewed period/filter. I can categorize the visible group.
63. As a user, I want six-month trends and comparison with the previous month. I can see income/expense changes.
64. As a user, I want all months searched together. I should not need to guess the month.
65. As a user, I want title, note, category, account, and amount search. I can search with details I remember.
66. As a user, I want result count, expense total, and matching highlights. I can check search results quickly.
67. As a user, I want recent-query use/deletion and tappable query examples. I can start searching easily.
68. As a user, I want pending search results to open categorization and other results to open editing. I can continue from search.
69. As a user, I want complete counts/totals across pages. Partial results must not appear to represent all data.

### Budgets and recurring rules

70. As a user, I want all/category/tag budgets. I can plan spending at the required level.
71. As a user, I want spent, remaining/over-budget values, and status words. I can see remaining allowance.
72. As a user, I want 50/70/80/90% warning choices with baht amounts. I can understand the warning threshold.
73. As a user, I want an explanation that saving the same budget target replaces its allowance. It must not imply another budget.
74. As a user, I want budget deletion/undo with spending history preserved. I can change plans without losing history.
75. As a user, I want recurring days 1–31 and an end month or forever. Tappable choices configure regular transactions.
76. As a user, I want nonexistent month days capped to the last day. The rule can run every month.
77. As a user, I want the first and next dates before saving. I can see when entries will be created.
78. As a user, I want new rules to generate due dates through today and report their count. Setup results should be immediate.
79. As a user, I want rules created/opened from existing entries with links preserved and no original duplicate. I can manage recurrence from the editor.
80. As a user, I want generated entries to retain selected bank, card, category, tags, and note. They should match the rule.
81. As a user, I want edits to apply to the next occurrence. Existing history must remain without unintended historical generation.
82. As a user, I want pause/resume to skip the intentional pause interval. Pausing must respect my intent.
83. As a user, I want active rules to generate due entries after months without app use. Inactivity must not imply pause.
84. As a user, I want rule deletion/undo while preserving generated entries. Ending recurrence must preserve history.

### Categories, tags, and calendar

85. As a user, I want category/tag tabs with usage counts. I can identify referenced choices.
86. As a user, I want category emoji and suggested tags. I can group entries quickly.
87. As a user, I want duplicate-name prevention, a 20-character tag limit, and protected built-in categories. Choices should remain clear.
88. As a user, I want custom-category deletion to uncategorize entries and delete its budgets. Budgets must not reference an absent category.
89. As a user, I want category undo to restore budgets and original assignments. This fully reverses accidental deletion.
90. As a user, I want tag deletion/undo with affected relationships restored. Undo must preserve other entry data and tags.
91. As a user, I want immediate calendar radio-card/chip/day-grid settings. Extra save/confirmation should be unnecessary.
92. As a user, I want weekday and fortnight-anchor choices with actual date ranges. I can understand the selected period.
93. As a user, I want month-start settings shared by monthly Home, Summary, and budgets. Their totals must agree.
94. As a user, I want default-calendar reset and restoration of previous values. I can experiment with settings.

### Profile, carrots, cards, and export

95. As a user, I want “พี่มนุษย์” (Human) to prioritize tools and actual current status. I can see my next action.
96. As a user, I want to view email and change consent shared with onboarding. Account data/settings must agree.
97. As a user, I want guidance, FAQ, terms, and slip capabilities in sheets. I can understand them without leaving the flow.
98. As a user, I want sign-out confirmation to return me to sign-in with the latest email. I can return to that account easily.
99. As a user, I want streak, today, recent seven days, and cumulative carrots. I can see recording continuity.
100.  As a user, I want feeding limited to once daily under actual criteria. Carrots must not increase twice.
101.  As a user, I want recorded/categorized modes or disabled counting. I can choose carrot behavior while retaining transactions.
102.  As a user, I want the four-page carrot tutorial with back/next. I can learn the feature.
103.  As a user without credit cards, I want full app use without adding one. Optional features must not block ordinary entry.
104.  As a card user, I want first-time name/last-four entry and later selection. I can record my actual card.
105.  As a card user, I want this month's total/count and each card's three recent transactions. I can check card spending.
106.  As a card user, I want View all/Add entry to retain the chosen card. Same-name cards must stay separate.
107.  As a user, I want Thai CSV export usable in Excel/Sheets. I can reuse my data.
108.  As a user, I want actual known transaction time in CSV and blank time otherwise. Export must not invent times.
109.  As a tester, I want fresh experimental financial data with the same account/email. I can test without registering again.
110.  As a tester, I want iPhone and iOS-simulator checks first. This round needs evidence from available devices.

## Implementation Decisions

### Scope, sequence, and existing foundation

- Cover every handoff screen/flow in light/dark, including states absent from screenshots. Use HTML/README details and 29 reference images.
- Retain Expo / React Native, Expo Router, TanStack Query/Form, theme, and typography wrappers. Keep shared code and the two-platform goal. This round accepts runtime/UI on iOS only.
- Follow the four Solution stages. UI independent of schema may start first within a stage. Contract-dependent flows require their contract owner before acceptance.
- Reuse qualifying Ledger, Analytics, Planning, Preferences, and Auth operations. Extend existing operations when appropriate. All-month search alone does not require a new endpoint.
- Change old behavior that conflicts with the handoff or map. This includes Home-focus-bound scanning and the old exclusion of slip-result screens.

### Visual fidelity and shared controls

- Use LINE Seed Sans TH Regular 400 for UI text. Amounts use iOS system font weight 500 and tabular numerals. Place ฿ after amounts at regular weight. Hierarchy uses size, color, and spacing rather than bold.
- Main sizes: header 17, body/row title 15, input 16, secondary 12–13, tab label 12, Home hero 36, and card amount 32.
- Entry amount starts at 40. Reduce it to 32 beyond 10 characters and 26 beyond 14 characters, as in the prototype. Preserve font scaling and accessible actions with larger text.
- Use this palette as the source of truth for both themes. Preserve brand appearance rather than substituting different system-theme values.

| Token               | Light              | Dark              |
| ------------------- | ------------------ | ----------------- |
| background          | #F9F9F7            | #2D2D2B           |
| surface             | #FFFFFF            | #383835           |
| raised              | #F0EFEC            | #454541           |
| text                | #2D2D2B            | #F9F9F7           |
| muted               | #5E5D59            | #C9C8C3           |
| border              | #D7D5CE            | #565650           |
| accent              | #CC7D5E            | #CC7D5E           |
| accentText          | #8D472D            | #E1A68E           |
| onAccent            | #1E1B19            | #1E1B19           |
| success             | #006F30            | #20D269           |
| danger              | #AD3414            | #FF9984           |
| inverse / onInverse | #2D2D2B / #F9F9F7  | #F9F9F7 / #2D2D2B |
| inverseAccent       | #E1A68E            | #8D472D           |
| shade               | rgba(30,27,25,.42) | rgba(0,0,0,.55)   |

- Spacing: side padding 16, card padding 14–18, section gaps 18–26, and chip gap 8.
- Radii: hero 20, grouped/card 16, sheet top 24, and tab-bar top 17. Other details follow the handoff.
- Cards use a raised inset ring without shadow. Selected tiles use an accent ring. Shadows belong only to floating actions, toast, menu/dialog, and selected segments under the prototype.
- Targets are at least 44×44. Primary buttons are 52 high, and rows are 52–64. Preserve visual chip/day-cell sizes while providing nonoverlapping effective targets. Use real safe-area insets rather than mock-phone frame constants.
- Share headers, segments, grouped lists, chips, radio cards/day grids, sheets, info boxes, and toast. Use handoff mascots/assets/emoji/MDI icons. The app retains its native runtime and layout rather than the prototype's runtime/device frame.
- Incomplete primary actions remain tappable and show field errors. Pending work shows busy text and prevents duplicate submission. Preserve drafts until saving succeeds. Retain specified disabled exceptions such as next period, future dates, and empty filters, with explanations.
- Durations: push/modal 0.34s, sheet 0.32s, dim 0.25s, centered dialog 0.2s, and search 0.3s. Use handoff easing. Ordinary toast lasts 2.6s, and action toast lasts 5s. Preserve dismissal/back and interruption-safe state. Actual network completion determines results rather than simulated timers.

### Auth, onboarding, and navigation

- Signup/sign-in share relevant draft data. Require a name of at least two characters, valid email, and password of at least eight characters. Match labels, show/hide, errors, and keyboard behavior to handoff. First app start opens signup. Logout opens sign-in with the latest email and cleared password.
- Distinguish unknown email, wrong password, and duplicate signup from actual auth-contract facts. A shared error code cannot prove those cases. Inspect the installed library before changing contracts. Report user-visible limitations before changing UI.
- Successful signup enters greeting. Completed-onboarding sign-in enters Home with the name. Guards resume incomplete setup.
- Onboarding orders terms → photo access/album discovery → goals → optional information, then recap/ready. Use actual shared profile values. Mark completion only after required persistence succeeds. Partial saves preserve recovery rather than claiming readiness.
- Splash advances after two seconds or a tap. Birthday opens a sheet with day/month/Buddhist-year columns. Invalid dates show errors. Require at least one goal. Require terms acceptance before the first step advances. Two consent choices leave birthday optional.
- Request actual OS permission. Separate photo counts from AI reading. Show unknown/limited/denied/skipped accurately, allow skipping/later activation, and recheck after Settings. Reading starts when ready at Home.
- Use “หน้าแรก” (Home) and “พี่มนุษย์” (Human) tabs. Add entry opens the editor directly. Summary/search/plan/settings push screens. Editor/budget/recurring use modals. Pickers/queues/help use specified sheets/dialogs. Preserve the editor draft under nested category management.

### Domain and data contracts

- Store amounts as integer satang. Transaction date is an ISO calendar day without timezone shifting. Transaction time is optional trustworthy evidence. Recording time is separate and drives latest-recorded text and relevant ordering. Never substitute `createdAt` or mock time for transaction time.
- Transaction bank groups all accounts at the same bank. Transaction card separates name and last four digits. Normalize identity and visible names across selection/filter/search. Unspecified means the entry has neither a selected bank nor a selected card. It does not mean all manual-source transactions.
- Expense/income without category are pending-category transactions. Transfers are neither pending-category nor income/expense totals. Retain one source value without adding destination accounts or balances.
- Entry create/update preserves chosen fields and the prototype's fallback title. Kind changes clear incompatible category. Manual entries select date only and exclude future dates under the UI.
- Keypad supports AC, %, basic arithmetic, decimal, delete, paste, hardware keys, and errors. Limit input to two decimal places and 12 digits. Accepting a new amount opens category selection. Manual input has no time field.
- Slip schema/extraction/mapping supplies actual date, time, counterparties, and sources used by UI. Unknown evidence stays unknown. Album name/photo time cannot establish every field. Reuse local image bindings for thumbnails and unavailable-image fallback.
- Read every transaction page or use a complete aggregate contract. Counts, totals, usage, and card summaries cannot treat the first 1,000 rows as the whole dataset.

### Home, Summary, and Search

- Home uses selected calendar periods. Match expense totals, daily/source text, badges, empty states, permission links, and reading state. Latest-recorded time uses actual recording time. Period navigation stops at the current period.
- Share filters with Summary. Bank/card/unspecified semantics remain identical across operations. Category queues use the initiating action's scope and refresh after success.
- Summary remains monthly even when Home is weekly/fortnightly. Select the month related to the viewed range. Custom month start affects boundaries/labels. Show income/expense/net, category/tag bars, pending queue, separate transfers, and six-month trend.
- Tag share uses the selected transaction kind's total as denominator. Multi-tag entries can appear in several groups. Shares need not sum to 100%. Budgets use their own scope rather than silently following the wallet filter.
- Search covers all months without the two-month restriction. Search title, note, category, bank/card, and amount under prototype text behavior. Handle commas/decimals consistently. Preserve substring behavior rather than silently imposing exact amount equality. Highlight matching fields. Pending results open queue, and others open editor.
- Recent queries support actual addition/deletion. Card-prefilled queries preserve exact card identity even with same-name cards.

### Deletion and undo

- Delete entry/budget/rule/custom category/tag immediately. The latest toast offers “เอากลับคืน” (undo) for 5 seconds. A new toast replaces the previous action. When action expires, retain the completed operation. Undo applies to that operation rather than the whole ledger.
- The server owns deletion/restoration of server data. Record enough operation effects to restore original IDs, fields, and relationships. A same-name clone cannot replace original identity.
- Category deletion clears affected entry/rule categories and deletes linked budgets. Preserve transactions as pending-category work. Restore category, budgets, and links together. Apply the same principle to tag links and tag budgets.
- Rule deletion preserves generated transactions. Restore the rule and deletion-affected relationships so editor/generation links remain correct.
- Restore under ownership/transaction boundaries that preserve unrelated field/link edits. Conflicts or incomplete restoration return a recoverable UI error rather than false success. Check repeated requests. Pending deletion/save must not imply success.
- Calendar reset restores previous relevant preferences through existing settings operations where suitable.

### Slip work and scan rounds

- Retain existing reading/persistence/duplicate/retry foundations. Scan ownership moves to the authenticated app level. Route changes continue scheduling while active with full permission. Background/lock pauses new scheduling while existing requests finish and retain results. Return resumes work. Logout/account switching cancels and isolates results.
- Created results bind the transaction image. Duplicate/no_candidate map to skipped. Incomplete_candidate maps to needs-help. Temporary failures expose reasons and retry under eligibility/backoff. Incomplete data uses manual entry.
- Needs-help work persists across rounds/days/restarts until handled. Store it on device per account for this round. Separate pending-work persistence from discovery/cache of new images within 30 days. Older pending work remains even outside discovery range.
- Remembered incomplete images are not automatically resent to GenAI. Pending retention must not cause repeated reading. Temporary failures retry at eligible times, with targeted actions matching the cause.
- Manual resolution prefills photo date and shares import's image identity. Reconcile manual/in-flight races and lost responses through that identity. Bind the successful image and retain handled state. Editing/selecting entries creates no duplicates.
- Retain per-account asset identity and unique-write/conflict handling. Prototype title/amount/date alone cannot prove duplicates. Hiding soft-deleted imported rows must not cause recreation.
- Unavailable images or changed permissions preserve work with factual limitations. They do not imply resolution. Device persistence is not guaranteed after data clearing/reinstallation.

### Budgets, recurring rules, categories, tags, and calendar

- Budgets plan expenses per accounting month for all/category/tag targets. Targets are unique per period. Saving an existing target replaces its allowance with an explanation. Use 50/70/80/90 warning chips and baht thresholds. Over-budget means spent greater than allowance, not equal.
- Recurring rules contain type/amount/title/day/start/end/category/tags/bank/card/note/active. Days 1–31 cap to month end. Choose the end month from a list, or choose forever. Show actual first/next schedule dates.
- New rules generate due occurrences from the selected start through today and report count. Rules from existing entries start after that transaction date and link the original without duplicating it. Rule-generated entries from drafts exclude a second manual save.
- Rule edits apply to the next occurrence. Preserve history and prevent generation of new historical dates with edited values. Store effective schedule/version or periods that generation can actually use.
- Pause/resume skips intentional pause dates and retains earlier transactions. Resume starts with the next occurrence. App inactivity is not pause: generate still-active due dates within start/end on return, without duplicates. Scope excludes timed automatic resumption after a number of months.
- Preserve card identity in rules and generated transactions. Define due-generation activation when the app becomes eligible. Retry/partial failure must prevent extra rules or entries.
- Category/tag tabs show complete active-entry counts. Built-in categories cannot be edited/deleted in UI/server. Custom categories choose emoji without a color picker. Check duplicate names in category-kind/tag context and the 20-character tag limit across create/update/inline paths.
- Calendar uses month/week/fortnight cards, weekday chips, anchor choices, and day grid. Apply choices immediately without save confirmation. Coordinate write ordering, pending, and rollback so late responses cannot revert newer choices. Cap month-start day and align monthly Home/Summary/budgets.

### Profile, streak, cards, and CSV

- Profile follows handoff sections/text, with tools/current status first. Email comes from session. Consent shares onboarding values. Help/FAQ/terms use specified sheets/accordions. Language information says Thai. Version uses actual app data.
- Streak uses transaction date, recorded/categorized mode, and enabled state. Feed once daily only after actual criteria. Await server success before reporting carrots. Disabled counting preserves transactions/history. Tutorial uses four specified asset pages.
- Optional card setup accepts name and last four digits, checks input, and preserves drafts. The actual card remains selectable in editor/rules/cards. Sample cards are not user cards. Revisit the approach after real-card user feedback. Debt/payment features remain outside scope.
- Card screens show recorded cards, expense total/count for the accounting month, and three latest transactions of all kinds across months. Actions preserve identity. View all isolates same-name cards. Add entry prefills the selected card.
- Actual CSV is UTF-8 with BOM and these ordered columns:
  1. “วันที่” (date).
  2. “เวลา” (time).
  3. “ประเภท” (type).
  4. “ชื่อรายการ” (transaction title).
  5. “หมวด” (category).
  6. “จำนวนเงิน (บาท)” (amount in baht).
  7. “บัญชี” (account).
  8. “แท็ก” (tags).
  9. “โน้ต” (note).
  10. “ที่มา” (source).
- Use actual transaction date/time. Unknown time stays blank. Preserve Thai encoding/formula escaping and agreement between server/native formatters.

### Experimental data transition

- First align schema/index/generated client/API/native client and prove contracts through a test database. Then transition an explicitly identified account/environment dataset.
- Stop new uploads/writes. Resolve existing request results before reset. Closing a client does not prove server writes stopped.
- Reset the selected account's transactions, rules, budgets, tags, custom categories, and preferences. Clear matching mobile outcome/work memory, image bindings, and query cache. Preserve auth/email/credentials, built-in categories, and other accounts. Keep the database as a whole.
- Complete onboarding again and check core flows with fresh data. After reset of identities/memory, earlier photos may populate the new experimental ledger. This starts a new dataset rather than duplicating transactions within one ledger.
- This spec/testing performs no actual reset. Implementation must identify target data, supply reviewable commands, and record transition results.

## Testing Decisions

### Agreed test boundaries

- Drive app workflows through transport and authenticated API into isolated test MongoDB. Observe requests, responses, persisted entries/identities/relationships, and query results rather than private helper order.
- Reuse scan session/transport with a real server harness. Substitute only GenAI, photo library, clock, device storage, and image bindings. Control created/skipped/incomplete/retry/in-flight/race outcomes. Avoid separate wrapper boundaries for every screen/service.
- Check iOS fonts, illustrations, spacing, safe areas, keyboard, targets, sheets/navigation, and draft recovery that API evidence cannot prove.
- These boundaries follow the reviewed plan and latest iOS-first instruction. Source inspection remains distinct from runtime evidence.

### Existing tests and modules

- Reuse slip/native-import integration patterns linking transport/route/Import/Ledger with temporary MongoDB and fake providers. Retain identity tests for user-scoped uniqueness after soft deletion and concurrent writes.
- Use existing scanner clock/photo/storage ports for scheduling, retry, permissions, retention, and pause/resume. Assert observable results.
- Extend Ledger/delete-restore, Planning/effective schedules, Analytics/filters/periods, Preferences/reset, and Auth coverage through app-facing interfaces. Build scenario fixtures. Tests do not perform production reset or require real financial photos.
- Avoid tests that merely repeat implementation or style constants. Check appearance against handoff and captured flows. Behavior tests must detect actual failures.

### Required data and behavior cases

1. More than 1,000 rows produce complete search/count/expense/category-usage/card results across pages. Cover amount substring/comma/decimal and Thai bank names.
2. Same-name cards with different last4 remain distinct in filters, View all, recurring rules, and CSV. Users without cards retain core use.
3. Check month starts 29–31, leap/month end, week/fortnight anchors, and consistent custom-period Summary/budgets/trends. Compare spending equal to versus above budget.
4. All deletion/undo types restore IDs, fields, references, and cascading budgets without clones on repeat. Preserve unrelated field/tag edits. Cover failures/conflicts/account ownership.
5. Cover new-rule backfill within start/end and no original duplicate from existing entries. Day/amount edits affect the next occurrence. Two-month pause/resume skips paused dates, including multiple intervals. App inactivity is not pause. Repeated generation creates no duplicates.
6. Three scan groups match reasons. Incomplete images are not resent. Temporary failures honor retry timing. Manual-help/import races and lost responses leave one transaction with the winning image binding.
7. Pending work survives restart, new rounds, and more than 30 days. Unavailable photos/revoked access preserve unresolved work. Route changes continue reading. Background/lock pauses scheduling. Logout/user changes isolate results.
8. Auth field/account errors follow actual contracts. Check incomplete-onboarding guards, goals/terms, shared consent/profile, and partial-save completion accuracy.
9. Both CSV formatters agree on 10 columns/order, UTF-8 BOM, formula-like text, bank/card labels, satang precision, and known/unknown transaction time.
10. Test-database transition preserves existing/other-account auth. Clear selected financial/mobile memory, restart onboarding, and import earlier photos into fresh data without stale queries.

### UI and device checks

- Check physical iPhone 13 Pro through Expo Go. Use iPhone 11 in Device Hub as additional simulator evidence. Establish working app/network/session before claiming proof. Existing app/configuration alone is insufficient.
- Start with the user's Expo Go path. If a feature needs a development build, identify the actual capability and prepare only necessary work. SDK/toolchain changes require a concrete reason.
- Check each stage's primary task and one failure/recovery for loaded/saved flows. Compare the 29 images and prototype interactions/sheets/empty/error states. Cover light/dark, Thai/long names, large amounts, Dynamic Type, keyboard, close/back, scrolling, and photo permissions.
- Separate physical-device/simulator evidence and unverified cases. Check native photo/permission behavior on-device where simulator evidence is insufficient. Android SDK/AVD/runtime/UI is outside this round's acceptance. iOS evidence does not establish Android behavior.
- Run repository install/check/test and necessary workspace scripts. Run code type checks separately because current `check` excludes type checking. Use appropriate tests. Existing passing tests alone do not prove the new design.

## Out of Scope

- Android SDK/AVD setup and runtime/UI/device acceptance this round. Preserve shared code for later Android work.
- Web redesign and App Store/Google Play publication.
- Separate accounts within one bank, balances/destination transfer accounts, and guessed historical account separation.
- Additional card debt, billing periods, limits, and payments beyond the handoff card screen.
- Pending-slip sync across devices, guaranteed retention after uninstall/reset, and OS background image reading with the app closed.
- Automatic recurring-rule resumption after a configured month-based pause. This feature is not agreed.
- New statement/PDF import and prototype features marked “จะทำในรอบถัดไป” (planned for a later round), or coming soon.
- Copying HTML/support runtime as the actual app, or using seed dates/amounts/timers as production data/contracts.
- Dropping the whole database, changing credentials, or deleting auth accounts during experimental-data reset.

## Further Notes

- Synthesized from the [source map](../native-redesign-wayfinding/map.md) and every Answer linked under Decisions so far. Use latest answers, especially iOS-only checks rather than earlier two-platform plans.
- [Data/API inspection](../native-redesign-wayfinding/assets/data-api-coverage.md) and [delivery proposal](../native-redesign-wayfinding/assets/delivery-plan-proposal.md) record planning evidence. They do not claim implementation passed.
- The versioned reference is [docs/design/native-redesign-2026-09-30](../../docs/design/native-redesign-2026-09-30/VERSION.md), with [README handoff](../../docs/design/native-redesign-2026-09-30/README.md) and [HTML prototype](<../../docs/design/native-redesign-2026-09-30/Moojot Home.dc.html>). Assets/fonts/screenshots belong to that version. Every ticket checks against it.
- Before creating/changing any UI screen, sheet, or dialog, read [design reference instructions](notes/design-reference.md). Read them before reviewing UI diffs too. HTML is authoritative, includes states absent from README, and explains design comparison.
- Map answers override the prototype for pending retention, incomplete classification, cascading budgets/full undo, unknown CSV time, pause/resume, and first-card setup. Explain actual user-visible limitations through scenarios before changing scope.
- Use [Mobile Ledger terms](../../apps/native/GLOSSARY.md) and [Finance Import terms](../../packages/api/GLOSSARY.md). Read the dependency's Effect guide before writing Effect code under repository rules.
- This `ready-for-agent` spec hands over work without implementation changes, iOS/Android tool installation, or data reset. Build issues start at 01 here, separate from map decision tickets.

# Notes from ticket 10 (budgets)

## Server deletion records and undo

`packages/api/src/shared/finance/deletions.ts` owns the shared deletion helpers.
The model is `FinanceDeletion` in `packages/db/prisma/schema/finance.prisma`.
Recurring rules in ticket 13 and categories/tags in ticket 15 reuse this boundary.

### Delete and retain a snapshot

`deleteWithUndo(db, { userId, kind, targetId, remove })` is an Effect using one transaction.
`remove(tx)` deletes the target and returns the JSON snapshot needed for complete restoration.
It returns `null` when the target is already absent.
The server stores the deletion with `restoredAt: null` and returns its ID as `{ deletionId }`.

A repeated deletion returns the target's existing open deletion record.
The repeated request neither fails nor creates another undo record.
Two concurrent deletions receive the same `deletionId`.
The request losing a write conflict (`P2034`) repeats, with at most three attempts, and finds the other request's deletion.

`keepDeletion(tx, { userId, kind, targetId, snapshot })` retains a deletion inside an existing caller transaction.
Use it for deletion within another operation, such as budget editing below.
Every such deletion then supports the same restoration path.

### Retention decision

The recorded decision retains deletion records for seven days.
After the next deletion commits, the helper prunes older records.
Pruning uses best effort. A failure logs through `Effect.logWarning`.
The completed deletion still reports success because the target is already absent.

### Restore and handle conflicts

`restoreDeletion(db, { userId, kind, deletionId, restore, current })` uses one transaction.
Another user's deletion or a deletion of another kind returns `NOT_FOUND`.
The server claims the record by setting `restoredAt` before calling `restore(tx, snapshot)`.
Concurrent restores therefore conflict instead of creating copies.

A repeated restore returns `current(tx, targetId)`, the target's current record.
If another operation deleted it again after restoration, the repeat returns `CONFLICT`.
When complete restoration is impossible, `restore` throws `FinanceConflictError`.
The transaction reverses its changes, and the undo record remains usable.

Write conflicts (`P2034`) and unique clashes (`P2002`) within either operation return `CONFLICT`.
Deletion returns that error only after its retry attempts.
Native presents a `CONFLICT` without its own reason as a concurrent change rather than invalid input.
The text is “…ไม่สำเร็จ งบนี้เพิ่งถูกเปลี่ยนจากอีกที่ ลองอีกครั้ง” (failed, this budget changed elsewhere, retry).

Add a kind to `DeletionKind` when extending this boundary.
Decode the snapshot through an Effect `Schema`.
Budgets use `BudgetSnapshot` in `planning.service.ts`.
Store satang as a decimal string because JSON has no 64-bit integer representation.

### MongoDB null fields

Prisma's `restoredAt: null` filter does not match documents lacking that field.
The server therefore explicitly stores `restoredAt: null` when creating a deletion record.
`activeTransactionWhere` has the same reason for an explicit null field.

## Budget contracts

These changes belong to `planning.*`.

### Delete and restore

`deleteBudget({ id })` returns `{ deletionId }` instead of a boolean.
A budget that never belonged to this user returns `NOT_FOUND`.

`restoreBudget({ deletionId })` restores the original ID, period, target, limit, warning percentage, and dates.
Another budget occupying the target returns `CONFLICT`.
A missing category or tag also returns `CONFLICT`. Restoration cannot create a budget for an absent target.

`restoreBudget` uses the save path's `validateCategory`/`validateTagIds`, with refusal as `CONFLICT`.
At this implementation point, categories/tags have no archived or soft-deleted state.
Deleting one permanently deletes it and its linked budgets.
Existence is therefore the complete target check.

### Edit and replace

`upsertBudget` accepts an optional `id`.
An edited budget retains its ID and month while moving to the chosen target.
If that target already has a budget, the same transaction deletes it through `keepDeletion`.
The replaced budget can then return through the ordinary undo path.
Repeating `deleteBudget` for the replaced ID returns that deletion record.

An edited budget cannot change months. A different `periodKey` returns `BAD_REQUEST`.
An `id` outside the user's ownership returns `NOT_FOUND` without changing data.
Without `id`, the existing target-based upsert remains: the same target retains its ID with a new limit.
That path deletes nothing.

### Spending status

`getBudgetStatuses` now sets `isOverLimit` from `spent > limit`.
Spending exactly equal to the limit is not over budget.
The name remains because no caller relied on the former “from 100%” meaning.
The new meaning matches “เกินงบ” (over budget) in `apps/native/GLOSSARY.md` and the field documentation.

`isNearLimit` retains its threshold meaning: at or above the warning percentage.
The flag therefore also remains true when over budget.
`budgetRow` reads both flags, with over-budget status first.
The visible “ใกล้ครบงบ” (near budget limit) state remains separate from over-budget status.

## Native modules and routes

`features/planning/plan.ts` exports:

- `planBudgets`, `budgetRow`, and `budgetPeriodLine`.
- `warningLine`, `replaceNote`, and `replacedBudget`.
- `budgetTarget` and `WARNING_OPTIONS`.

`features/planning/budget-actions.ts` provides `createBudgetActions(client.planning)` and Thai `BudgetActionError` messages.
`features/planning/use-budget-actions.ts` refreshes `orpc.planning.key()` before success returns.
That key covers Plan, the budget form, and Summary's “วางแผนงบ” (plan budget) row.

`typedAmount` in `utils/format.ts` groups typed baht amounts, following prototype `typedAmount`.
The old `upsertBudget`/`deleteBudget` mutation options are absent.
Review added shared `MessageCard` in `components/ui/controls.tsx`.
It provides a centered load-error or missing-record card with an optional “ลองอีกครั้ง” (retry).

`queryState(queries)` in `utils/query-state.ts` provides `ready`, `pageError`, `refreshError`, and `retry`.
Plan and the budget form use it. Summary and Search could adopt it later.

`/budget-form` accepts `periodKey` and either `target` (`all`/`category`/`tag`, for a new budget) or `id`.
It is now a full-screen modal with its own header.
`/plan` is a pushed screen with its own header and “ย้อนกลับ” (back) button.
`08-summary.yaml` now taps that button.

## Maestro flow and capture limits

`apps/native/.maestro/10-budgets.yaml` performs this sequence:

1. Save one 120 ฿ “อาหาร” (food) entry.
2. Open Plan from Summary.
3. Delete budgets remaining from interrupted runs.
4. Create an all-category budget of 100 ฿ with a 70% warning.
5. Exercise the missing-category error.
6. Create an “อาหาร” (food) budget of 120 ฿.
7. Save “อาหาร” (food) again at 2,500 ฿ through the replacement notice.
8. Open the budget.
9. Delete it.
10. Tap “เอากลับคืน” (undo).
11. Delete the budgets and the entry.

The number pad has no return key, so `hideKeyboard` fails.
Choosing a target, category, tag, or warning closes the pad in the app.
Scroll to “ลบงบนี้” (delete this budget) before tapping.
Wait for the form to disappear before tapping the toast's “เอากลับคืน” (undo).
Otherwise, the tap reaches the closing modal.

A manual entry without a title receives its category name on Home.
The observed text was “อาหาร 120 บาท อาหาร · จดเอง ใหม่” (food, 120 baht, manual, new).

## Tests and boundaries

`apps/server/test/budgets.test.ts` uses a temporary MongoDB replica set to cover:

- Spending equal to and above the limit.
- Replacement on the same target.
- Editing to a new target and replacing its existing budget.
- Editing another user's or a missing budget.
- Original fields and remaining-entry spending after delete/restore.
- Repeated delete/restore without copies.
- Undo after another operation deletes the restored budget.
- Conflict with a new target budget, followed by successful undo after that budget disappears.
- Missing tags or categories.
- Ownership and Thai action errors.
- Refusal of a different month during editing.
- Restoration of the budget that an edit replaced.
- Concurrent deletions returning one `deletionId`.
- Successful deletion despite pruning failure.

`apps/native/features/planning/budget-actions.test.ts` checks that `CONFLICT` describes a clash rather than invalid input.
`apps/native/features/planning/plan.test.ts` covers rows, status words, bars, counts, custom month-start labels, and warning baht values.
It also covers replacement notices, including an all-category/tag near miss.
`apps/native/utils/format.test.ts` covers `typedAmount`.

The user was unavailable to approve test boundaries.
The implementation retained tickets 04–09's boundaries.
Pure `plan.ts` and `typedAmount` modules have direct tests.
Native `createBudgetActions` integrates through authenticated oRPC → Planning → MongoDB in `apps/server/test`.
The shared deletion helpers have budget-route tests rather than direct helper tests.
Simulator runs supply screen evidence.

## Design comparison

The comparison used `Moojot Home.dc.html`, blocks `07 วางแผน` (Plan, about 1078–1150) and `08 ตั้งงบ` (Set budget, about 1152–1207).
Script references include `planVals` near 3316–3420, and `openNewBudget`/`openBudgetForm`/`saveBudget`/`deleteBudget` near 2814–2850.
They also include `budgetKey` and `typedAmount`.

Design images are `design-shots/10-{plan,plan-bottom,plan-previous,form-edit,form-replace,delete-toast,form-new,form-missing}[-dark].png`.
`capture/10-budgets.mjs` creates them.
App images are `10-app-<state>[-dark].png` beside this file.

### Plan geometry

- Header: height 52, Back target 44 with MDI chevron 30, centered title 17.
- Month navigation: targets 44, `accentText` chevrons 26, title 15/minimum 140, current-month Next opacity 0.35.
- Overall `accent` card: radius 20, padding 16/18/14, title 15, status icon 17 and label 13.
- Spending uses “ใช้ไป” (spent) at 13, amount 32/500/tabular, and “จาก X ฿” (out of X baht) at 15.
- The bar is 10 high on `rgba(30,27,25,.16)`, with `onAccent` fill.
- The left label and pencil use “แก้ไข” (edit).
- No overall budget shows “ยังไม่ได้ตั้งงบรวม” (no overall budget), copy, and a 44-high “ตั้งงบรวม” (set overall budget) pill.
- That pill uses `rgba(30,27,25,.12)`.
- Section title “งบแยกหมวด” (category budgets) is 15.
- Count text “N งบ · เกิน N / ใกล้ครบ N” (N budgets, N over, N near) is 13/`muted`.
- Grouped card: radius 16, `raised` ring, row padding 12/14, icon circle 36/`raised` with emoji or “#”.
- Name size is 15. Status icon is 15, with label 12 in `danger`/`accentText`/`success`.
- Bar height 8 uses `raised`, with `danger`/`accent`/`success` fill. With spending, bar width is at least 2%.
- “ใช้ไป X จาก Y ฿” (spent X out of Y baht) is 12.
- “เหลือ / เกิน X ฿” (X baht remaining/over) uses `danger` when over.
- Empty state retains its hint copy.
- Add buttons: height 48, `raised`, radius 24, MDI plus 19/`accentText`.
- Recurring section retains its title, count, and subtitle.

### Form geometry

- Header: height 52, close MDI 26, “ตั้งงบใหม่” (new budget)/“แก้ไขงบ” (edit budget).
- Centered period text is 13/`muted`.
- “งบนี้ใช้กับ” (budget target) is 13. Targets use the shared three-way `SegmentedControl`.
- Categories occupy three columns, minimum height 78, radius 14, `raised`, and a 2px `accent` ring when selected.
- Category emoji is 22, with name 12.
- Tags use shared `Chip` with “# name” or “ยังไม่มีแท็ก เพิ่มแท็กได้ตอนจดรายการ” (no tags, add them while recording).
- Amount label is “ใช้ได้เดือนละ” (monthly allowance).
- Amount box: height 72, radius 16, `raised` ring, input 32/500/tabular, ฿ 20/`muted`.
- Replacement notice is 13/`accentText`.
- Four warning radios: height 44, radius 12, label 16. Selection uses `accent`/`onAccent`, otherwise `raised`.
- The warning line shows baht.
- Editing shows “ลบงบนี้” (delete this budget), text 15/`danger` and MDI trash 20.
- Save pill: height 52, “ตั้งงบนี้” (set this budget)/“บันทึก” (save), with errors above.
- Toasts retain “ตั้งงบแล้ว หมูจะช่วยดูให้” (budget set), “บันทึกงบแล้ว” (budget saved), and “ลบงบแล้ว · เอากลับคืน” (deleted · undo).

### Deliberate differences

- Budgets, spending, and categories use account data rather than prototype seeds.
- Exact equality shows “ใกล้ครบงบ” (near budget limit) and “เหลือ 0 ฿” (0 baht remaining), never “เกินงบ” (over budget).
- This follows prototype `status` and spec story 72. Server `isOverLimit` now agrees.
- Server undo may fail if another budget takes the target or its category/tag disappears.
- The toast then says “เอากลับคืนไม่ได้ เดือนนี้ตั้งงบของเป้าหมายนี้ใหม่แล้ว หรือหมวดหรือแท็กของงบถูกลบไป” (undo unavailable after target replacement or deletion).
- The prototype reinserts its local object.
- Editing a target retains the original ID and replaces the destination budget in one server operation.
- Failed saving retains the form and its error, without a success toast.
- Choosing a value closes the decimal pad, which lacks Return. Save remains above it.
- “หมวดที่ลบไปแล้ว” (deleted category)/“แท็กที่ลบไปแล้ว” (deleted tag) names are fallbacks only.
- Category/tag deletion deletes linked budgets. Restoring a budget with an absent target fails.
- Recurring rows retain “ทุกวันที่ N” (every month on day N), without “ครั้งถัดไป …” (next occurrence).
- Actual next-due information belongs to tickets 12/13.
- Paused rows show “หยุดไว้ · หมูยังไม่จดให้” (paused, Moo does not record), with MDI pause-circle-outline.
- Added states use a spinner and “โหลดแผนไม่สำเร็จ / เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง / ลองอีกครั้ง” (plan failed, check internet, retry).
- Cached-data refresh has a one-line error above older data.
- The form shows “โหลดงบไม่สำเร็จ” (budget load failed) and “ไม่พบงบนี้แล้ว” (budget missing).
- Save/delete failures use words above Save.
- The floating gear belongs to Expo's development menu.

## iOS evidence: iPhone 11 simulator, iOS 18.6, development build, 2026-10-03

`ios-preview` drove the development database in light/dark. Captures include:

- `10-app-plan-empty`.
- `-form-new`: all-category target, number pad open.
- `-form-all`: 100 ฿ and 70%, with “ใช้ไปถึง 70 ฿ หมูจะเตือนว่าใกล้ครบงบ” (warn at spending of 70 baht).
- `-form-missing`: “กรุณาเลือกหมวด” (select a category).
- `-plan`: overall and “อาหาร” (food) budgets over the limit. The 120 ฿ food budget includes other existing food spending.
- That capture includes “ตั้งงบแล้ว หมูจะช่วยดูให้” (budget set).
- `-form-replace`: “มีงบนี้อยู่แล้ว 120 ฿ บันทึกแล้วจะใช้วงเงินใหม่แทน” (replace the existing 120-baht allowance).
- `-form-edit` and `-form-edit-bottom`: 2,500 ฿ and “ลบงบนี้” (delete this budget).
- `-delete-toast`: “ลบงบแล้ว · เอากลับคืน” (budget deleted · undo), with the row absent.
- `-restored`: the same 2,500 ฿ food budget returns with its spending.

Failure/recovery ran in light only. The API server stopped manually. The flows stayed outside the repository:

- `10-app-save-error`: offline “บันทึกงบไม่สำเร็จ เชื่อมต่อไม่ได้ ลองอีกครั้ง” (budget save failed, cannot connect, retry). The form remains.
- `10-app-plan-error`: error card for a month never loaded.
- `10-app-plan-recovered`: one “ลองอีกครั้ง” (retry) loads after server recovery.

`08-summary.yaml` ran again in light and passed with Plan's new Back button.
The flows deleted every budget and entry they created.

The development database created `finance_deletion` on its first deletion. MongoDB creates the collection on insert.
Its indexes require the next `vp run db:push` against that database. This run did not execute it.

### Verification limits

The simulator did not check:

- Tag budgets. This account has no tags. API tests cover them.
- Custom month start. Unit tests cover it.
- Restoration refused for an occupied target or a deleted tag. API tests cover it.
- Two concurrent restorations.
- Dynamic Type and VoiceOver.
- Physical iPhone 13 Pro.

At this capture point, review fixes from `fix/native-redesign-ios-10-review` had no repeated simulator run.
Screens retained their appearance: error cards moved to shared `MessageCard` with the same styles.
The new conflict wording appears only during a race. API tests cover the server changes.

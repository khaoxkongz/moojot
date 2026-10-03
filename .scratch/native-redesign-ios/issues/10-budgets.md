# 10: Set budgets and restore deleted budgets

**What to build:** Set all/category/tag budgets with actual spending and allowances. Saving an existing target replaces its allowance. Deletion can restore the original budget.

**Blocked by:** 01 — [iOS typography and theme foundation](01-ios-theme-foundation.md)

**Status:** done

**Done in:** 7dd6d6e feat(budgets): plan and budget form from the design, with delete and server-side undo; c0dc775 fix(budgets): undoable replace on edit, safe concurrent delete, review clean-ups

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md)

**User stories:** 70–74

**Why blocked:** This uses shared controls/theme. Existing month/budget operations allow work independently of Summary.

- [x] Plan/budget form shows all/category/tag, selected month/custom boundaries, empty state, and actual spent/remaining. (story 70)
- [x] Warning chips 50/70/80/90 show baht thresholds. Equal spending is not over-budget. Greater spending is over-budget, with words/icons. (stories 71, 72)
- [x] Existing targets show a replacement notice and upsert the allowance. Target changes/save failures preserve data and factual success state. (story 73)
- [x] Delete immediately. Undo within 5 seconds restores original ID/fields/target and spending from retained transactions. (story 74)
- [x] Define server delete/restore operations that retain complete effects. Cover ownership, repeated requests, and conflicts without clones. Reuse this boundary for rule/category/tag work.
- [x] Refresh query/status/Summary consumers after success. Check contracts with temporary MongoDB and create/edit/delete/undo/recovery on iOS.

## Comments

**Ticket 10 — agent, 2026-10-03:** Code, tests, and simulator flows completed. See [notes/10-budgets.md](../notes/10-budgets.md).
The delete/restore contract passed isolated MongoDB checks in `apps/server/test/budgets.test.ts`.
The iPhone 11 simulator covered create/edit/delete/undo/recovery in both themes.
At this point, the last criterion still needed physical iPhone 13 Pro checks:

1. Open Home → Summary → scroll down → “วางแผนงบ” (plan budget).
   Plan opens the same month as Summary. Buttons ‹ › change months. The current month disables ›.
2. Tap “ตั้งงบรวม” (set overall budget). Enter 5,000. Select 70%.
   The warning line says “ใช้ไปถึง 3,500 ฿ หมูจะเตือนว่าใกล้ครบงบ” (warn at spending of 3,500 baht).

   Tap “ตั้งงบนี้” (set this budget). The orange card shows actual monthly spending.
   The toast says “ตั้งงบแล้ว หมูจะช่วยดูให้” (budget set, Moo will help monitor it).

3. Tap “ตั้งงบแยกหมวด” (set category budget). Enter an amount without selecting a category. Tap “ตั้งงบนี้” (set this budget).
   The error says “กรุณาเลือกหมวด” (select a category). Category selection closes the number pad.
   The keypad does not cover Save.
4. Set a category budget equal to that category's existing spending.
   Its row shows “ใกล้ครบงบ” (near budget limit) and “เหลือ 0 ฿” (0 baht remaining), without an over-budget status.
   Record another 1-baht expense in that category.
   The row changes to “เกินงบ” (over budget), with red “เกิน 1 ฿” (1 baht over).
5. Tap “ตั้งงบแยกหมวด” (set category budget). Select the same category again.
   The notice says “มีงบนี้อยู่แล้ว … ฿ บันทึกแล้วจะใช้วงเงินใหม่แทน” (saving replaces the existing allowance).
   Saving leaves one row for that category, with the new allowance.
6. Open a budget row. Change its target to another category or “รวมทุกหมวด” (all categories). Tap “บันทึก” (save).
   The budget moves to the new target. The old row does not remain.
7. Open a budget row. Tap “ลบงบนี้” (delete this budget).
   Return immediately to Plan. The row disappears.
   “ลบงบแล้ว · เอากลับคืน” (budget deleted · undo) appears for about 5 seconds.

   Tap “เอากลับคืน” (undo). The original budget returns with its allowance, warning percentage, and accurate spending.
   Optionally delete one expense while the budget is absent.
   Spending after restoration counts only the remaining entries.

8. Delete a budget. Wait for the toast to disappear.
   The budget remains absent. It does not return automatically.
9. Disconnect Wi-Fi/network. Tap “ตั้งงบนี้” (set this budget).
   The error says “บันทึกงบไม่สำเร็จ เชื่อมต่อไม่ได้ ลองอีกครั้ง” (budget save failed, cannot connect, retry).
   The form remains open without a success toast.

   Restore the network. Tap again. Saving succeeds.

   On Plan, open the previous month while offline.
   “โหลดแผนไม่สำเร็จ” (plan load failed) appears.
   Restore the network. Tap “ลองอีกครั้ง” (retry) once. The plan loads.

10. Return to Summary. Its “วางแผนงบ” (plan budget) row shows counts and statuses consistent with Plan.
11. Check readable text, colors, bars, and status icons in light/dark.

Device-check note: The development database creates `finance_deletion` on the first budget deletion.
Its indexes appear after the next `vp run db:push` against that database.
This implementation session did not run that command.

2026-10-03: The user tried iPhone and said it was acceptable, without checking every item 1–11 in detail.
By agreement, the ticket became `done`.
Recheck these unobserved physical-device cases in integrated acceptance ticket 22:

- Tag budgets.
- Custom month start.
- Rejected restoration.
- Item 9: offline recovery through Retry.
- Dynamic Type and VoiceOver.
- Review changes from c0dc775: replacing another budget during editing, undoing that replacement, and conflict messages.

`vp run db:push` against the development database remains necessary to create the `finance_deletion` indexes.

# 04: Manual entry and transaction editing

**What to build:** Add an amount, date, category/tags, and bank. Complete API save/edit/delete/undo from the entry action.

**Blocked by:** 01 — [iOS typography and theme foundation](01-ios-theme-foundation.md)

**Status:** done

**Done in:** 7618bba feat(native): redesign manual entry editor with keypad, sources and undo; 6f3ac22 fix(native): address ticket 04 review findings; 98db784 fix(native): match entry editor to the design prototype

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md)

**User stories:** 6, 8–10, 36–46

**Why blocked:** This needs shared controls/typography/theme. An already authenticated account can test it independently of new signup.

- [x] Add entry directly opens a modal with Thai expense/income/transfer labels. Kind changes clear incompatible category. Totals exclude transfers from income/expense.
- [x] Keypad supports AC/%, basic calculation, paste, two decimals, 12 digits, and errors. Accepting a new amount opens category selection.
- [x] Hardware keys work on web. _iOS remains unsupported: Expo Go lacks key events without a text input. This requires a native module. See [23](23-ios-hardware-keypad.md)._
- [x] Allow past/today dates, excluding future dates and time input. Save fallback title, note, category/tags, and bank with accurate satang and transaction date.
- [x] Select existing cards by name+last4 without hardcoded samples. _“เพิ่มบัตร” (add card) opens Cards, then returns to the existing draft without a nested editor. Actual first-card creation is [11](11-first-card.md)._
- [x] Closing changed drafts offers save/discard. Failed saves retain editable drafts. Guard against duplicate submission.
- [x] Delete immediately. The latest toast offers undo for 5 seconds. Server restoration returns original IDs/fields without clones. Report delete/restore failures accurately.
- [ ] Queries reflect create/edit/delete/restore. Check keyboard/back/long text/large amounts in iOS light/dark. _Query refresh and integration tests are complete. iPhone UI checks remain._

## Comments

**Check iPhone (Expo Go) in light/dark.** At this point, type checks, lint, and tests passed. Actual screens were not checked because the simulator lacked session/automated taps.

1. Tap “จดเพิ่ม” (add entry) on Home. “จดรายการ” (record transaction) opens directly without a menu, with keypad open.
2. Select a category, then switch expense/income/transfer. Incompatible category clears. Transfer hides category and shows “ไม่นับเป็นรายจ่าย/รายรับ” (excluded from expense/income). Home totals remain unchanged by transfers.
3. Enter 120+45, then “=”. Check “120+45=” and 165. Check AC, %, ⌫, two decimals, 12-character input limit, and 5÷0 error “ไม่สามารถคำนวณจำนวนนี้ได้” (cannot calculate this amount).

   “วาง” (paste) parses “฿1,250.50”. Nonnumeric clipboard text shows “คลิปบอร์ดไม่มีจำนวนเงิน” (clipboard has no amount). AC spans two aligned cells. The caret blinks.

4. Enter a new amount and tap “เสร็จ” (done). Category selection opens automatically. Check tags/new tags, the 20-character limit, and category selection.
5. A large amount such as 999,999,999.99 shrinks without overflowing the card.
6. Calendar excludes tomorrow and next-month navigation. Past dates and “วันนี้” (today) work. Time input remains absent.
7. Blank title explains its fallback through “ถ้าไม่ใส่ จะใช้ “…”” (if empty, use …). Home shows that title after saving. Long Thai titles/notes remain within layout.
8. Title/note focus closes keypad. “บันทึก” (save) stays above the keyboard. Fields remain scrollable.
9. “จ่ายจากบัญชี” (pay from account) preserves bank/unspecified selection after reopening. Accounts without cards show “เพิ่มบัตร” (add card), opening Cards. Its “จดเพิ่ม” (add entry)/“จดรายการบัตรเครดิต” (record credit-card transaction) returns to the same retained draft. One × closes that editor. Existing name+last4 cards appear as separate chips.
10. Close a changed draft. “บันทึกรายการมั้ย?” (save this transaction?) offers working “ไม่บันทึก” (discard) and “บันทึก” (save). Unchanged drafts close directly.
11. Disconnect network/server and save. Thai errors preserve input. Restored network allows retry. Repeated rapid Save taps create one transaction.
12. Open an entry's ⋮ and delete. Return immediately to the previous screen. “ลบรายการแล้ว · เอากลับคืน” (deleted · undo) appears above Add entry for about 5 seconds. Undo restores original title/amount/category/tags/date. Disconnection before Undo produces an explanatory, retryable toast.
13. Home, totals, Summary, Search, and the pending-category queue update immediately after create/edit/delete/restore.
14. Larger Dynamic Type keeps Save and keypad tappable.

**Additional checks after review fixes (6f3ac22):**

15. ~~Primary action explains required corrections before tapping.~~ Design change (98db784): the label always says “บันทึก” (save). Missing amount opens keypad, gives a red amount border, and shows “กรุณาใส่จำนวนเงินที่มากกว่า 0 บาท” (enter an amount above 0 baht). A valid amount without category saves as pending-category work.
16. Select “กสิกรไทย” (Kasikornbank) in a manual entry. Home filters show one bank row combining slip/sample “KBank” and earlier “กสิกรไทย” entries. Selecting it includes both. Home rows use the Thai name.
17. From an editor with a card, tap “จดซ้ำล่วงหน้า” (schedule recurring entry). The recurring form still lacks card input at this point (ticket 12), but remains usable.

**After design matching (98db784):** Compare `.scratch/native-redesign-ios/notes/design-shots/` images `04-<state>.png` and `04-<state>-dark.png` with matching iPhone states. Cover light/dark. Web-app images in `notes/04-app-<state>[-dark].png` provide additional comparisons. Deliberate differences are in notes/04, “Design pass”.

18. Calendar (`04-calendar`) centers “เลือกวันที่จด” (choose transaction date). Arrows are dark orange, with next-month disabled for the current month. Today has an orange ring. The selected date forms an orange pill filling its cell. Future dates remain unavailable.

    “ยกเลิก” (cancel) has an orange outline. “วันนี้” (today) uses an orange fill.

19. Compare keypad (`04-keypad-calculating`), category sheet (`04-category-sheet`), and tag creation (`04-tag-add`). Tag Back, # input, and round + share a row. Suggested-chip taps add immediately. Compare forms (`04-form-new`, `04-form-empty`, `04-type-transfer`), missing amount (`04-save-missing-amount`), and exit dialog (`04-exit-dialog`). Check the outlined “ไม่บันทึก” (discard). Compare editing/menu (`04-edit-manual`, `04-edit-menu`) and toast (`04-delete-toast`).
20. Account chips have no icon. Cards show “บัตร KTC •• 4821” (KTC card ending 4821). “เพิ่มบัตร” (add card) has a dashed orange border. This addition uses the same appearance as “เพิ่มแท็ก” (add tag).

2026-10-02: The user checked every item above on iPhone, including design comparisons 18–20. All passed, so the ticket became `done`.

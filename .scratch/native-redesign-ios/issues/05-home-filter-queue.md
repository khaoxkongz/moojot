# 05: Home, filters, and category queue

**What to build:** View daily transactions by accounting period. Filter banks/cards. Categorize sequentially or open editing from Home.

**Blocked by:** 04 — [Manual entry and transaction editing](04-manual-entry.md)

**Status:** done

**Done in:** c07d7cf feat(native): home periods, day list, wallet filter and category queue logic; 170e511 feat(native): redesign Home, wallet filter sheet and category queue sheet; c5fce8e fix(api): order entries by id last so offset paging is stable; dd9121f fix(native): rename includeOther to includeUnspecified and name queue wallets by the filter rule; f066b35 fix(native): address ticket 05 review findings (notes, ภาพ, flow Maestro และไฟล์นี้อยู่ใน commit docs ที่ตามมาแต่ละรอบ)

Commit record note: Notes, screenshots, Maestro flows, and this file belong to documentation commits after each round.

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md)

**User stories:** 28–35, 69

**Why blocked:** Queue editing and Add entry depend on ticket 04's editor.

- [x] Match expense hero, daily labels/totals, income +, sources, pending, badges, empty/loading/error states, and actual latest recording time. _“ใหม่” (new) means recorded today. See notes/05._
- [x] Month/week/fortnight and custom month start use actual boundaries/labels, with next disabled at the current period. _Unit tests cover periods. Simulator checks covered monthly periods starting on day 1._
- [x] Bank groups, name+last4 cards, and unspecified use entry identity. Manual bank-selected entries remain outside unspecified.
- [x] Select all, clear, counts, and shared Summary filters work. Sample bank/cards cannot become user data.
- [x] Queue count/next/skip/edit/completion match opening scope. Category saves persist and refresh. Transfers are not pending-category work.
- [x] More than 1,000 rows produce complete counts/daily totals rather than first-page totals.
- [x] Check Home→create/edit→filter→queue with read/update failure and recovery on iOS. _Light/dark simulator flows and iPhone user checks passed. Retry needed two taps after server recovery. See [24](24-ios-first-retry-after-outage.md)._

## Comments

**Check iPhone (Expo Go) in light/dark.** At this point, check, check-types, and tests passed. iPhone 11 simulator covered every screen below. App images are `.scratch/native-redesign-ios/notes/05-app-<state>[-dark].png`. Design images are `notes/design-shots/05-<state>[-dark].png`. Deliberate differences are in notes/05, “Deliberate differences”.

1. Home (`05-home`) shows carrot “N วัน” (N days), round search/wallet buttons, and the small mascot. Text is “วันนี้หมูพร้อมช่วยจด” (Moo is ready today) or “วันนี้หมูจดให้ N รายการ” (Moo recorded N transactions today). The orange card has month arrows, “ต.ค. 69” (October 2569), “ดูสรุป” (view summary), and spending total. “จดล่าสุดวันนี้ HH:MM” (last recorded today HH:MM) uses actual latest recording time.
2. Daily headings show “วันนี้ ศ. 2 ต.ค.” (today, Friday 2 October) or “พฤ. 1 ต.ค.” (Thursday 1 October). Right-side total is “รายจ่าย 1,234” (expense 1,234). Income-only/transfer-only days use “รายรับ” (income)/“ย้ายเงิน” (transfer).

   Rows show category icon, title, and “อาหาร · สลิป” (food · slip). Income is green with +. Entries recorded today show “ใหม่” (new).

3. Uncategorized rows have a dashed pencil circle and orange “รอเลือกหมวด · จดเอง” (awaiting category · manual). Transfers are not pending-category work. They use ⇄ and “ย้ายเงิน · …” (transfer · …).
4. Left arrow opens the previous month (`05-home-previous`). Right becomes enabled there and remains faded/disabled in the current month. Empty months show “ยังไม่มีรายการในเดือนที่เลือก” (no entries in the selected month).
5. A custom start such as 25 shows “25 ก.ย. – 24 ต.ค.” (25 September–24 October) below “ยอดใช้จ่าย” (spending total). Entries match that range. Week/fortnight labels show actual ranges. VoiceOver says “รอบก่อน” (previous period)/“รอบถัดไป” (next period).
6. Wallet opens “เลือกบัญชีและบัตร” (choose accounts/cards) (`05-filter-sheet`) with only actually used banks/cards. No unused sample Krungthai/KTC appears. Each bank has one row. Cards show “บัตร KTC •• 4821” (KTC card ending 4821).

   Clearing through “เลือกทั้งหมด” (select all) (`05-filter-none`) shows “เลือกอย่างน้อย 1 รายการ” (select at least one). “แสดงรายการ” (show entries) becomes disabled.

7. Select one bank and “แสดงรายการ” (show entries) (`05-home-filtered`). Wallet gains an orange ring. “กำลังแสดง N รายการจากตัวกรอง” (showing N filtered entries) matches visible rows, and spending uses those entries. “ล้าง” (clear) restores all. Filtered “ดูสรุป” (view summary) preserves the same filter.
8. A manual “กสิกรไทย” (Kasikornbank) entry stays outside “รายการที่ไม่ระบุบัญชี” (unspecified-account entries). It belongs only to Kasikornbank.
9. Today's pending work shows “มี N รายการรอเลือกหมวด ›” (N entries await category) below Moo. Its “เลือกหมวด” (choose category) sheet (`05-queue`) shows “1 จาก N” (1 of N) for multiple entries. Include title/amount and “กสิกรไทย · จดเอง · วันนี้” (Kasikornbank · manual · today).

   Category choice saves and advances. “ข้ามไปก่อน” (skip for now) skips without saving and is absent on the last entry. Completion closes the sheet with “เลือกหมวดครบแล้ว” (categories complete) or “บันทึกหมวดแล้ว” (category saved) if other days remain pending. Home updates immediately.

10. A single pending-row tap opens only that entry's queue. A categorized-row tap opens editing.
11. “แก้ไขรายการนี้” (edit this entry) opens editing above the queue (`05-queue-edit`). × returns to the same queue item (`05-queue-back`). Saving a category in the editor makes the queue advance. Reopening the entry shows the latest category. The change fixes stale category text.
12. Offline category save shows “เลือกหมวดไม่สำเร็จ เชื่อมต่อไม่ได้ ลองอีกครั้ง” (category failed, cannot connect, retry) (`05-app-queue-error`) and retains the item. Offline month navigation shows “โหลดรายการไม่สำเร็จ” (load failed) and “–” rather than 0 (`05-app-home-error`). Restore network and tap “ลองอีกครั้ง” (retry) (`05-app-home-recovered`). Check whether iPhone also requires two taps, as the simulator did. See [24](24-ios-first-retry-after-outage.md).
13. Long titles/amounts remain within rows, with title ellipsis. Large Dynamic Type keeps links, arrows, Summary, and Add entry accessible.

**2026-10-02 — additional light/dark iPhone checks after review (c5fce8e, dd9121f, f066b35):** Check, check-types, and tests passed. The agent repeated simulator flows. Changed images replace `notes/05-app-<state>[-dark].png`. `05-app-summary-previous[-dark].png` is new.

14. Navigate Home to the previous month, for example “ก.ย. 69” (September 2569). “ดูสรุป” (view summary) opens that month (`05-app-summary-previous`). Summary arrows continue working. If a current weekly range spans two months, Summary opens today's month.
15. Earlier pending days in the viewed month keep “มี N รายการรอเลือกหมวด ›” (N entries await category) visible after today's categories finish. N matches dashed rows. Queue “1 จาก N” (1 of N) covers every day in that month (`05-app-queue`). Another month changes N.
16. A bank filter limits pending count/queue to visible matching entries.
17. “วันนี้เลือกหมวดครบแล้ว” (today's categories complete) appears only when today's entries are complete. Viewing a previous month cannot falsely mark today's pending work complete.
18. Open a queue with at least 2 entries. Use “แก้ไขรายการนี้” (edit this entry), categorize, and save each entry. When none remain, close with “เลือกหมวดครบแล้ว” (categories complete). Use “บันทึกหมวดแล้ว” (category saved) if work outside the queue remains. Avoid silent closure or an endless spinner.
19. A slip with bank/last4 but no card name shows “ไม่ระบุบัญชี” (unspecified account) in its queue card. It belongs to “รายการที่ไม่ระบุบัญชี” (unspecified-account entries), outside that bank group.
20. Filter/category sheets share handle, 17-sized title, and × placement. The filter header stays fixed while multiple account rows scroll. Previously it scrolled with the rows.
21. After the code rename, unspecified filters still agree on Home/Summary. A client running the earlier app remains filter-compatible with the new server.

2026-10-02: The user checked all items 1–21 on iPhone. All passed, and the ticket became `done`. Two-tap “ลองอีกครั้ง” (retry) remains tracked in [24](24-ios-first-retry-after-outage.md).

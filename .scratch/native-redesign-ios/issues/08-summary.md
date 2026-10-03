# 08: Summary totals and trends

**What to build:** Open Summary for the month related to the viewed Home range. Show totals, share bars, six-month trends, and scoped categorization.

**Blocked by:** 05 — [Home, filters, and category queue](05-home-filter-queue.md)

**Status:** done

**Done in:** b337701 feat(native): redesign Summary with month totals, share bars and six-month trend; 6da0d45 fix(native): address ticket 08 review findings (notes, ภาพ และ flow Maestro อยู่ใน bab7950 และ 513431d)

Commit record note: Notes, screenshots, and Maestro flows belong to bab7950 and 513431d.

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md)

**User stories:** 60–63

**Why blocked:** This needs Home's period/filter state and completed category queue.

- [x] Monthly/custom boundaries and income/expense/net match data/filters, including remaining or spending above income. (story 60)
- [x] Category/tag bars show actual amount/share. Pending groups open period/filter-scoped queues. Transfers remain separate from income/expense. (stories 61, 62)
- [x] Multi-tag shares use the selected kind's total. Keep actual shares even when their sum exceeds 100%. Do not normalize them to total 100%.
- [x] Six-month trends end at the selected month, with comparison and zero/empty/error states. (story 63)
- [x] Budget planning retains its relevant month. It does not imply wallet-filter-specific budgets without a contract.
- [x] Check API totals with multiple months/tags/custom dates and Home→Summary→queue on iOS.

## Comments

**Check iPhone (Expo Go) in light/dark.** At this point, check, check-types, and tests (309) passed. iPhone 11 simulator covered the screens below.

App images are `.scratch/native-redesign-ios/notes/08-app-<state>[-dark].png`. Design images are `notes/design-shots/08-summary-<state>[-dark].png`. Notes/08 describes “Deliberate differences”. Implementation is b337701 and 6da0d45. Images/notes are bab7950 and 513431d.

1. Home “ดูสรุป” (view summary) opens the same month (`08-app-summary`). Orange “ภาพรวม…” (overview…) shows received/spent and “เหลือ” (remaining)/“ใช้เกินรายรับ” (spent above income). Net equals received minus spent and agrees with Home.
2. Expense/income/transfer tabs show category amounts, counts, and percentages. Transfers have separate text and do not enter income/expense (`-transfer`).
3. Tag mode (`-tags`) includes a two-tag entry in both groups. Bar length uses the total for that kind. Shares may exceed 100%. No tags shows “ยังไม่มีแท็ก” (no tags yet).
4. “ยังไม่เลือกหมวด” (uncategorized) (`-pending`) opens only the current month/filter queue (`-queue`). Category saves update bars and toast (`-after-queue`).
5. One-bank filters (`-filtered`) show “สรุปเฉพาะบัญชีและบัตรที่เลือก” (summary for selected accounts/cards). Totals/bars/chart follow the filter. Planning text ends “· นับทุกบัญชี” (counts every account) (`-filtered-plan`).
6. Six-month charts (`-bottom`) end at the viewed month, whose bar is orange. Previous-month comparison remains accurate. Missing prior expenses show “เดือนก่อนยังไม่มีรายจ่ายให้เปรียบเทียบ” (no previous-month expenses to compare). Income/transfer use corresponding text.
7. Navigate left to the previous month (`-previous`), then “วางแผนงบ” (plan budget). Plan opens that month (`08-app-plan-from-summary`). Next remains faded/disabled for the current month.
8. Month start 25 adds “· 25 ก.ย. – 24 ต.ค.” (25 September–24 October) to the month label. Totals match monthly Home. At that point, simulator checks did not cover this.
9. From weekly/fortnightly Home, “ดูสรุป” (view summary) stays monthly and opens the final day's month. At that point, simulator checks did not cover this.
10. Offline month changes show “โหลดสรุปไม่สำเร็จ” (summary load failed) (`-error-dark`). Network restoration and “ลองอีกครั้ง” (retry) recover data (`-recovered-dark`).
11. At exactly the budget limit, Summary says not over-budget, while Plan still says over-budget. This known difference belongs to ticket 10.

2026-10-02: The user tried iPhone and said it was acceptable, without checking every item 1–11 in detail. By agreement, the ticket became `done`. Items 8–9 remained unobserved on device/simulator. Check them again in integrated acceptance ticket 22.

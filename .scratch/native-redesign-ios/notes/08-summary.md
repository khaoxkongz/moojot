# Notes from ticket 08 (Summary)

## Summary month and navigation

`features/summary/summary.ts` exports `summaryMonth(today, offset, monthStartDay)`. It returns `{ periodKey, from, to, title, overviewTitle, isCurrent }`. Summary remains monthly when Home is weekly/fortnightly.

Title is “กันยายน 2569” (September 2569). Non-first-day months add “ · 25 ก.ย. – 24 ต.ค.” (25 September–24 October), under prototype `monthTitle`. Fixed `longThaiMonth`/`shortThaiMonth` in `utils/format.ts` replace `Intl` labels. Plan 10 can reuse `summaryMonth`.

`utils/dates.ts` provides `periodKeyParts`, mapping "2026-09" to `{ year, month }`, and `nextMonthOffset`. Next advances one month but never past current month. Summary/Plan arrows share it.

Home “ดูสรุป” (view summary) still passes `date` from ticket 05. Summary “วางแผนงบ” (plan budget) pushes `/plan` with `params: { periodKey }`. `plan.tsx` opens that month through `periodKeyOffset(currentKey, target)` in `utils/dates.ts`. Later/malformed targets use 0. Plan arrows continue from there. Ticket 10 retains this parameter.

## Additive Analytics contracts

`analytics.service.ts` extends existing results:

- `getCategoryBreakdown` adds `pendingIds` for uncategorized groups, empty for other groups. IDs follow Home's newest-first `occurredOn desc, createdAt desc, id desc` order.
- Summary's “ยังไม่เลือกหมวด” (uncategorized) opens `/pending-categories` with those IDs. Queue scope matches month, kind, and wallet filter exactly.
- `getTagBreakdown` adds `percentage`, using the kind's entire filtered total rather than summed tag totals. Two-tag entries count in both groups. Shares may therefore sum above 100%.
- The returned `null` group means “ไม่มีแท็ก” (no tag). Summary excludes it from bars.
- `getPeriodSummary` and every `getMonthlyTrend` month add `transferCount`. Transfer text “N รายการ” means N entries.

## Rows, bars, and trends

`summaryOverview`, `summaryRows`, `summaryEmpty`, `summaryQuestion`, `summaryTrend`, and `planRowSubtitle` own prototype text/numbers. Category/tag widths use server `percentage` with a 2% minimum. Trend bars are 4–100 high within a 150 chart. Values use whole-baht `formatBaht(total, 0)`, or “–” for none. Labels use `shortThaiMonth` rather than server `Intl` text.

Comparison text includes “ใช้มากกว่าเดือนก่อน 1,000 ฿ (25%)” (spent 1,000 baht more than last month, 25%) and “…เท่ากับเดือนก่อน” (equal to last month). When the earlier month lacks this kind, use “เดือนก่อนยังไม่มีรายจ่าย/รายรับ/ย้ายเงินให้เปรียบเทียบ” (no previous expenses/income/transfers to compare). Prototype “ยังไม่มีรายการ” (no entries) is inaccurate when another kind exists. Icons are MDI `arrow-up`, `arrow-down`, `equal`, and `information-outline`.

Exported `amountLabel` adds satang only when present. It supplies the kind total above bars.

## Budget row

“วางแผนงบ” (plan budget) calls `planning.getBudgetStatuses(periodKey)` without wallet filter, as budgets retain their own scope. Under an active filter, `planRowSubtitle(statuses, { walletFiltered: true })` ends “ · นับทุกบัญชี” (counts every account). This explains budget counts beneath “สรุปเฉพาะบัญชีและบัตรที่เลือก” (selected account/card summary). Without budgets, the invitation remains unchanged.

`planRowSubtitle` uses prototype status: over only when spent **exceeds** the limit, near at warning percent otherwise. Server `isOverLimit` still uses `percentUsed >= 100`. Plan can disagree at exact equality until ticket 10's second criterion fixes it.

## Maestro and tests

`apps/native/.maestro/08-summary.yaml` creates one KBank 42 ฿ entry and opens Summary from Home. It checks tabs/modes/previous month/filter, categorizes pending work, opens the previous month's Plan, and deletes its entries. Cleanup loops also delete leftovers from interrupted runs. Plan's Back currently carries route label "(insights)/summary". The flow taps it. Ticket 10 restyles the header.

- `apps/native/features/summary/summary.test.ts` covers month/custom-start/year-change titles/bounds, net labels, kind/tag rows, empty text, trends/comparisons, equality, and filtered budget text.
- `apps/native/utils/dates.test.ts` covers Plan link offsets and next-month clamping.
- `apps/server/test/summary.test.ts` covers custom-period totals/transfer count, filtered six-month trends, multi-tag shares, scoped pending IDs, and queue choices reflected in bars.

## Test boundaries

The user was unavailable to approve boundaries. Continue ticket 04/05's direct pure-module tests for `features/summary/summary.ts` and `periodKeyOffset`. Integration links native → authenticated oRPC → Analytics/Ledger → MongoDB in `apps/server/test`. Simulator checks provide screen evidence.

## Design comparison

Checked `Moojot Home.dc.html` block `03 สรุป` (Summary), around lines 1447–1569. Script references are `openSummary`, `sumShift`, `sp`, `sumRows`, `trendBars`, `compareText` near 3546–3584, `planRowSub` near 3354/3394, and `monthTitle`.

Design captures are `design-shots/08-summary{,-bottom,-tags,-income,-transfer,-previous,-filtered,-queue}[-dark].png` through `capture/08-summary.mjs`. App captures are `08-app-<state>[-dark].png` beside this file.

Matched details:

- Header 52, Back 44/MDI chevron 30, and `raised` Wallet 44 with inset `accent` ring when filtered/open.
- Month chevrons 44/26 in `accentText`, title 15/minimum 140, and current-month Next disabled at 0.35.
- “สรุปเฉพาะบัญชีและบัตรที่เลือก / ล้าง” (selected accounts/cards summary / clear) notice.
- `accent` overview radius 20, padding 16/18/18, title 15, labels 14/amounts 17, and rule opacity 0.3.
- Net label 15 with “ได้รับ − ใช้ไป” (received minus spent) 12, amount 32/weight 500, and ฿ 18.
- Surface card radius 20/`raised` inset ring. Three-way segment radius 12/9 and height 40, selected `surface` with segment shadow.
- Question/total 16. Mode chips 34 within touch rows 44, `inverse` when selected.
- Bar rows: icon circle 36, name/amount 15, bar 6 on `raised` with `accent` fill, meta 12, divider from 48.
- Pending: dashed `accent` pencil, `accentText` name/meta, `border` bar, and chevron 22. Preserve empty text and transfer note.
- Trend: title 16, comparison 14/`muted`/icon 18, chart 150, bars 32 wide/radius 6/2, current `accent`/`accentText`, others `border`/`muted`, values 11.
- Planning row: height 64, radius 16, `raised` circle 36, MDI target.

### Deliberate differences

- Bars/trends/budgets use actual account data rather than prototype seeds.
- Pending queue uses actual Home newest-first order rather than seed order.
- Weekly/fortnightly Home opens Summary for its last day, or today. Prototype uses the first day. This follows ticket 05.
- Budget loading/failure retains “ดูงบของเดือนนี้” (view this month's budgets) and working Plan navigation. Prototype lacks this state.
- Added loading/error states use spinner and “โหลดสรุปไม่สำเร็จ / เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง / ลองอีกครั้ง” (summary failed / check network / retry).
- Cached-data refresh uses “อัปเดตข้อมูลไม่สำเร็จ … ลองอีกครั้ง” (update failed … retry). Bars use “โหลดยอดตามกลุ่มไม่สำเร็จ” (group totals failed). Trends use “โหลดแนวโน้มไม่สำเร็จ” (trend failed), with Retry.
- Tag meta retains “2 รายการ” (2 entries), rather than category-style “3 รายการ · 75%” (3 entries · 75%). Multi-tag shares can exceed 100%. A percentage beside each tag would suggest parts of one whole. Width still shows share of the kind total.
- “ไม่มีแท็ก” (no tag) receives no bar, matching prototype user-tag-only rows. Untagged amounts remain in the kind denominator. No tagged entries shows “ยังไม่มีแท็ก” (no tags yet).
- Empty prior-month comparison names the kind through “เดือนก่อนยังไม่มีรายจ่ายให้เปรียบเทียบ” (no earlier expenses to compare), rather than “ยังไม่มีรายการ” (no entries). Review c2 records this.
- Filtered Plan adds “ · นับทุกบัญชี” (counts every account), under review c3. Prototype lacks filtered Plan.
- Plan uses `nextMonthOffset` like prototype `planShift` and `Math.min(0, …)`. Its absolute Summary-seeded offset requires clamping rapid taps. Other Plan UI remains unchanged until ticket 10.
- `planRowSubtitle` follows prototype `status` and `planRowSub`: over above limit, near at warning percent when not over.
- Long net amounts shrink through `adjustsFontSizeToFit`.
- The floating gear is Expo's development menu.

## iOS evidence: iPhone 11 simulator, iOS 18.6, development build, 2026-10-02

The agent captured new images after review fixes. `ios-preview` drove the development database in light/dark:

- `08-app-summary` from Home Summary.
- `-pending`, `-bottom` with trend/Plan, and `-tags` showing “ยังไม่มีแท็ก” (no tags yet).
- `-income`/`-transfer` with empty copy and all-“–” trends.
- `-previous`: September empty month/zero trend/“ภาพรวมกันยายน” (September overview).
- `-filtered`: KBank only.
- `-queue`: pending KBank group with “1 จาก N” (1 of N).
- `-after-queue`: categorized group leaves filtered bars, with “บันทึกหมวดแล้ว” (category saved).
- `08-app-plan-from-summary`: September 2569 Plan from previous-month Summary.
- `08-app-summary-filtered-plan`: KBank 42 ฿ with a 40 ฿ all-category budget. “ตั้งไว้ 1 งบ · เกินงบ 1 · นับทุกบัญชี” means 1 budget, 1 over-budget, all accounts. Budget includes the account's 92 ฿. A temporary uncommitted flow created/deleted its entry and budget.

Dark-only failure/recovery used manually stopped API and uncommitted flows. `08-app-summary-refresh-error-dark` retains cached data with a refresh error. `08-app-summary-error-dark` shows a never-loaded month's error. `08-app-summary-recovered-dark` loads after one Retry, unlike Home [24](../issues/24-ios-first-retry-after-outage.md).

The flows deleted all entries they created. The account's pending 50 ฿ entry from 1 October remained pending. Only October has account data, so captures contain few bars. Many-category/multi-tag/transfer/nonzero comparisons have prototype-image and test evidence only.

Unverified on simulator: custom month start, weekly/fortnightly Home navigation, >1,000 rows, unfiltered budgets, inline bar/trend errors, Dynamic Type, VoiceOver, and physical iPhone 13 Pro. Custom start has unit/API evidence only. Month start is 1 here. A budget existed only for the filtered shot, and the agent induced only page/refresh errors.

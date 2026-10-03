# Notes from ticket 05 (Home, filter, category queue)

## Periods and Summary navigation

`features/home/period.ts` exports `selectedHomePeriod(today, offset, mode, { monthStartDay, weekStart, fortnightAnchor })`. It returns `{ from, to, label, caption, previousLabel, nextLabel, isCurrent, summaryDate }`.

`shortThaiMonth`/`shortThaiDate` in `utils/format.ts` use fixed Thai names rather than `Intl`. Examples are “ก.ย. 69” (September 2569) and “28 ก.ย. – 4 ต.ค. 69” (28 September–4 October 2569).

Non-first-day months caption the hero “ยอดใช้จ่าย · 25 ก.ย. – 24 ต.ค.” (spending, 25 September–24 October). Week/fortnight arrows say “รอบก่อน” (previous period)/“รอบถัดไป” (next period). Summary 08 can reuse month labels.

Home “ดูสรุป” (view summary) opens `/summary` with `params: { date: period.summaryDate }`. Date is the period's final day, or today while it runs. Summary uses `summaryMonthOffset(today, date, monthStartDay)`, then its own arrows. A week extending into next month opens the month of its elapsed days.

## Complete paging and day rows

`features/entries/all-entries.ts` exports `loadAllEntries(list, filters)`. It reads `listTransactions` in 1,000-row pages until a short page. `entriesQueryOptions.all(filters)` uses the Ledger key, so `refreshEntryReaders()`/slip import refresh it. `pendingCategories()` also uses it. The change deleted the old `pending-categories.ts` loader. Use `all` for complete Search 09/card 19 counts and totals.

`homeDays(entries, { today, categories })` preserves server order and groups days. Rows contain `pending`, `icon`, `meta`, and `isNew`. Icons are emoji, ⇄, or empty when pending. Meta examples are “อาหาร · สลิป” (food · slip) and “รอเลือกหมวด · จดเอง” (awaiting category · manual).

`latestJotLabel(createdAt, today)` and `homeSpeech(...)` own text. `sumOf(entries, kind)` totals. `needsCategory` in `features/entries/category-queue.ts` is the shared pending rule. Transfers never need a category.

`listTransactions` orders by `occurredOn desc, createdAt desc, id desc`. The final `id` makes ordering total, preventing repetition or omission of same-moment entries across offset pages.

Latest-recorded text reads `listTransactions({ sort: "recorded", limit: 1 })`. Optional `sort: "recorded"` puts newest `createdAt` first. The default still orders newest transaction day first.

## Unspecified identity and filters

Unspecified now means no bank and no card in Ledger `walletWhere` and Analytics `matchesWallet`. A manual bank-selected entry belongs only to that bank. This is the glossary's unspecified-account transaction.

The flag changed from `includeOther` to `includeUnspecified`. `packages/api/src/shared/finance/wallet-filter.ts` still decodes older `includeOther` values. Device `context/app-data` holds filters only in memory, so stored-state migration is unnecessary.

Device `entryWallet(entry)` in `features/wallets/entry-wallet.ts` shares this rule:

- Card name → card.
- Bank without last four → bank.
- Otherwise → “ไม่ระบุ” (unspecified).

Queue cards use it too.

`features/wallets/filter.ts` exports `walletFilterSections(options, value)`, `toggleWalletRow`, `toggleAllWalletSources`, and `hasNoWalletSource`. Sections contain bank groups through `bankFilterGroups`, cards through `walletCardLabel`, then unspecified. Example card is “บัตร KTC •• 4821” (KTC card ending 4821). The last group is “รายการที่ไม่ระบุบัญชี” (unspecified-account entries). Empty groups stay hidden. Options come only from actual user entries.

`includeDeletedCards` filtered nothing. The change deleted it from schema/types/sheet. “บัตรที่ลบไปแล้ว” (deleted cards) is gone. Both sheets share `SheetPanel`/`SheetBackdrop` from `components/ui/bottom-sheet.tsx`: surface, handle, title 17, and Close. Summary shares the sheet and `appliedWalletFilter` in `context/app-data`.

## Category queue

`features/entries/category-queue.ts` supports `app/(app)/(categories)/pending-categories.tsx`. The route is a `transparentModal` bottom sheet with its own shade/slide.

- `router.push("/pending-categories")` queues today's pending entries for streak work.
- `router.push({ pathname: "/pending-categories", params: { ids: "a,b,c" } })` queues specified IDs in order.
- Home's link supplies every pending entry of the viewed period/filter. A Home row supplies one ID.
- Summary 08's “ยังไม่เลือกหมวด” (uncategorized) and Search 09 should supply their own IDs.

Queue membership stays constant after opening. `currentInQueue` skips entries categorized/deleted elsewhere. Category selection calls `useEntryActions().setCategory`, refreshes every reader, and advances to the next pending entry. When none remain, the sheet closes through `queueEmptiedMessage`. This also covers outside categorization of remaining entries.

Completion says “เลือกหมวดครบแล้ว” (categories complete) or “บันทึกหมวดแล้ว” (category saved) if other pending work remains. Failed selection retains the entry with Thai error below the grid.

`entry/[id].tsx` now rereads stale cached data before opening. Previously, categorizing in queue then reopening showed the old empty category.

## Maestro and tests

`apps/native/.maestro/05-home-filter-queue.yaml` creates one KBank 42 ฿ entry, checks filters/queue, then deletes it. It also opens previous-month Summary (`05-app-summary-previous`). Runs affect the development account. Rerun interrupted flows to clean their “รายจ่าย 42 บาท” (42-baht expense) rows. Their loops categorize/delete only those rows. The flow closes the whole-month queue after its own choice, leaving other pending entries unchanged.

Icon glyphs appear in Pressable accessibility text unless `accessibilityLabel` exists. Label icon buttons. The change labels “เลือกทั้งหมด” (select all) and “แก้ไขรายการนี้” (edit this entry).

Tests are:

- `apps/native/features/home/{period,home-days}.test.ts`.
- `features/wallets/filter.test.ts`.
- `features/entries/category-queue.test.ts`.
- `apps/server/test/home-filter-queue.test.ts`.

Server cases cover unspecified versus manual-with-bank in Ledger/Analytics, 1,001 complete rows/daily totals, and queue scope/pick/skip/outside changes through real routes. They also cover wrong-kind refusal and latest recording time. Review additions cover stable same-moment paging, `entryWallet` agreement, legacy `includeOther`, and Home queue period/filter scope.

## Test boundaries

The user was unavailable to approve boundaries, so ticket 04's boundaries continued. Test pure native period/day/filter/queue modules directly. Integration links native → authenticated oRPC → Ledger/Analytics → MongoDB in `apps/server/test`. Screens use simulator checks rather than automated screen tests.

## Design comparison

Checked `Moojot Home.dc.html` blocks `01 หน้าแรก` (Home, lines about 52–185), `เลือกบัญชีและบัตร` (account/card sheet, about 319), and `เลือกหมวด` (category queue, about 350). Script references are `renderVals`, `rowVals`, `openQueue`, and `pickCategory`.

Design captures are `design-shots/05-{home,filter-sheet,filter-none,home-filtered,queue}[-dark].png`, through `capture/05-home-filter-queue.mjs`. `lib.mjs` now clicks the button when an SVG icon receives the hit. App captures are `05-app-<state>[-dark].png` beside this file.

Matched geometry:

- Top carrot chip: height 44, radius 12, carrot 26, text 14. Search/wallet circles are 44. Filtered/open wallet uses `accent` ring.
- Filter notice, mascot 72, speech 16/14, and `accentText` links 14.
- Hero radius 20 and `accent`, arrows 44/icons 20, month label 15, “ดูสรุป” (view summary) pill 34 on `rgba(30,27,25,.1)`.
- Hero caption 13, amount 36, ฿ 20, and latest-recorded row.
- Day heading: “วันนี้” (today) 14 `accentText`, date 13 `muted`, total 13.
- Cards: radius 16, 1px `raised` border, rows 62, icon circles 34, pending dashed `accent` pencil, divider from 60.
- “ใหม่” (new) badge and income `success` with +. Empty card and “จดเพิ่ม” (add entry): height 52, padding 16/20, plus 20.
- Sheets: handle, title 17, subtitle/progress 13, rows 56 on `raised` radius 14, checkboxes 24/radius 7, Apply 50.
- Category tiles 78 in three columns. Skip uses `accentText` 15. Edit uses `muted` 14.

### Deliberate differences

- Filters use actual banks/cards rather than sample “กสิกรไทย” (Kasikornbank)/“ไทยพาณิชย์” (SCB)/“กรุงไทย” (Krungthai)/“บัตร KTC” (KTC card). Hide empty groups.
- “ใหม่” (new) means recorded today by user/slip/rule. Prototype marks session additions. The app has no seen state yet.
- Queue meta omits time: “กสิกรไทย · สลิป · วันนี้” (Kasikornbank · slip · today). Entry time is unavailable and cannot come from `createdAt`. Prototype shows “วันนี้ 12:41” (today 12:41).
- Home count/link/queue cover the viewed period/filter rather than only today. Earlier pending days retain the link. Prototype `openQueue` includes all pending work but counts today in its link. The spec requires action-scoped queues.
- “วันนี้เลือกหมวดครบแล้ว” (today's categories complete) requires at least one today entry and none pending.
- Added states: loading spinner, error card “โหลดรายการไม่สำเร็จ / เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง / ลองอีกครั้ง” (load failed / cannot connect, check network / retry).
- Cached-data refresh errors show “อัปเดตข้อมูลไม่สำเร็จ … ลองอีกครั้ง” (update failed … retry). Unknown period totals show “–” rather than 0.00.
- Empty text retains week/fortnight and “ที่เลือก” (selected) variants. Prototype only describes a month.
- Hero retains the existing spinning counter. Prototype amounts are static.
- The captured floating gear belongs to Expo development tools.

## iOS evidence: iPhone 11 simulator, iOS 18.6, development build, 2026-10-02

`ios-preview` drove development-database checks in light/dark. Captures include `05-app-home`, `-home-previous`, `-home-pending`, `-filter-sheet`, `-filter-none`, `-home-filtered`, `-queue`, `-queue-edit`, `-queue-back`, and `-queue-done`.

Failure/recovery used manually stopped API and uncommitted flows, in light only. `05-app-queue-error` retains entry with Thai offline error. `05-app-home-error` shows period failure. `05-app-home-recovered` shows restored loading after “ลองอีกครั้ง” (retry). First Retry sent no request, while the second did. See [24](../issues/24-ios-first-retry-after-outage.md).

The flows deleted their created entries afterward. Soft-deleted rows remain in the development database under normal app behavior. After review, repeat light/dark flows replaced those captures and added `05-app-summary-previous`. September Home now opens September 2569 Summary.

The development account had pending work on 1 October. `05-app-queue` therefore shows “1 จาก 2” (1 of 2). `05-app-queue-done` advances to “2 จาก 2” (2 of 2), with “ไม่ระบุบัญชี · จดเอง · 1 ต.ค.” (unspecified · manual · 1 October). The flow closed the sheet and left that entry pending. Unchanged error/recovery code was not recaptured.

Unverified on simulator: custom month start, week/fortnight calendar, slip-reading state, more than 1,000 visible rows, Dynamic Type, and VoiceOver. Calendar has unit evidence only, with this account using month start 1.

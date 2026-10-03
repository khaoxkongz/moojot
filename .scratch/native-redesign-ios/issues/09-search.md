# 09: Search all months and amounts

**What to build:** Search remembered details across all months with complete results/totals, highlights, and recent queries. Continue to editing/categorization from results.

**Blocked by:** 05 — [Home, filters, and category queue](05-home-filter-queue.md)

**Status:** done

**Done in:** b786f2c feat(search): search every month by amount, bank name and card; dc0a5d2 fix(search): match a bank only when the whole term names it, and share search helpers

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md)

**User stories:** 64–69

**Why blocked:** This needs the editor, pending queue, and filter identity through Home.

- [x] Delete the two-month restriction. Pagination/aggregates produce complete counts/expense totals beyond 1,000 rows. (stories 64, 69)
- [x] Match title/note/category/Thai bank/card/amount with prototype baht-text behavior, including commas/decimals. Preserve text matching rather than imposing exact-only matching. (story 65)
- [x] Daily groups/newest ordering, matching highlights, initial focus/clear, examples/no-results, and recent-query addition/deletion work. (stories 66, 67)
- [x] Pending results open queue and others open editor. Prefilled search accepts exact card name+last4 scope for later card-screen use. (story 68)
- [x] Old requests/errors cannot overwrite the latest query. Recovery preserves the query.
- [x] Check authenticated search with >1,000 rows and same-name cards. Check search→editor/queue on iOS.

## Comments

**From ticket 04 review:** Bank identities use slip values: "KBank", "SCB", "KTB", "BBL", "Krungsri", "ttb", and "TrueMoney". `bankDisplayName` in `apps/native/features/wallets/banks.ts` supplies Thai names for screens. Older rows may store “กสิกรไทย” (Kasikornbank). At this point, the server directly searches `bank contains search`. “กสิกร” (Kasikorn) therefore misses "KBank" rows. Search must cover all names of the same bank, through identity normalization or aliases shared with the server.

**Ticket 09 — agent, 2026-10-03:** Code, tests, and simulator flows completed. See [notes/09-search.md](../notes/09-search.md). `apps/server/test/search.test.ts` passed API cases for more than 1,000 rows and two same-name KTC cards. Light/dark simulator search→editor/queue passed. At this point, the last criterion remained open for iPhone 13 Pro checks through Expo Go or a development build:

1. Tap Home search. Input autofocus opens the keyboard. The screen shows Moo, “หมูค้นให้ทุกเดือน” (Moo searches every month), and Grab / “อาหาร” (food) / “เงินเดือน” (salary) chips.
2. Search an existing amount with/without commas, such as "1,250". Results span months with orange amount highlights. “พบ N รายการ · รายจ่ายรวม … ฿” (N results · total expenses) matches expected counts/totals.
3. Search “กสิกร” (Kasikorn), then "kbank". Include Kasikornbank entries from slips and manual entry.
4. Tap “รอเลือกหมวด” (awaiting category). Categorize that entry in its sheet. Return to the same search, showing the chosen category.
5. Other results open editing. Closing returns to the same results/query.
6. Clear input with ×. “ค้นหาล่าสุด” (recent searches) retains the query for reuse. Row × deletes it. Starting the app again preserves the accurate recent list.
7. Disconnect Wi-Fi/network, then enter a new query. “ค้นหาไม่สำเร็จ” (search failed) preserves the query. Restore network and tap “ลองอีกครั้ง” (retry) once. Results load.
8. Check readable typography, spacing, and matching backgrounds in light/dark.

2026-10-03: The user tried iPhone and said it was acceptable, without checking every item 1–8 in detail. By agreement, the ticket became `done`. Item 7 and dc0a5d2 review changes remained unobserved on-device. These include "bangkok" and mixed bank-name text such as “ค่ารถไปกรุงเทพ” (fare to Bangkok). Recheck them in acceptance ticket 22.

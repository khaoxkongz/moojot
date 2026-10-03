# Notes from ticket 09 (Search)

## Search scope and pages

`entriesQueryOptions.search(term, card?)` is in `features/entries/query-options.ts`. It calls `entriesQueryOptions.all(searchFilters(term, card))` without date bounds. It reads pages of 1,000 until a page contains fewer results. The Ledger query key lets `refreshEntryReaders()` refresh these results.

The device calculates the count and expense total from every page. These totals therefore include results beyond 1,000. The existing `listTransactions` endpoint gained the matching rules below.

## Search terms

`transactionWhere` in `packages/api/src/features/ledger/ledger.service.ts` matches title, note, category name, tag name, bank, card name, and card last four. Tag matching already existed.

### Bank names

The alias table moved from `apps/native/features/wallets/banks.ts` to `packages/api/src/shared/finance/banks.ts`. The native file re-exports `@moojot/api/shared/finance/banks`. Metro resolves this import.

`bankMatchesSearch(storedName, term)` matches a stored spelling, bank identity, or Thai name. It also matches when the whole term is the initial part of one of the bank's `spellings`. It deletes a leading "ธนาคาร" (bank) first. Examples are "กสิกร" (Kasikorn), "kbank", and "bangkok".

A term containing a bank name among other words does not identify a bank. For example, "ค่ารถไปกรุงเทพ" means travel fare to Bangkok.

The Ledger reads the user's distinct stored banks. It applies `bank in [matching spellings]`, including stored names containing the term. Thus, "กสิกร" (Kasikorn) finds "KBank" rows. "kbank" finds old "กสิกรไทย" (Kasikornbank) rows. This resolves ticket 04's comment.

### Amounts

`packages/api/src/shared/finance/search-terms.ts` handles numeric terms. A term can contain digits, commas, and at most one decimal point. It matches a substring of the amount without commas. The amount includes satang only when present.

- "419" finds 419 and 4,190.
- "1,250" finds 1,250.50.
- "12." finds only amounts with satang.

This follows prototype `amountMatch`, which uses substring matching rather than exact equality. MongoDB cannot match a substring in the stored integer. The Ledger therefore reads the user's active `{ id, amountSatang }` values. It matches these values on the server.

This approach suits personal ledgers. Reconsider it if accounts reach hundreds of thousands of rows.

The review retained one cost: each digits-only search term reads every active amount once per page request. A long result list repeats this read for each 1,000-row page. If this causes a problem, use a stored text field or a cache per request.

## Card scope

Ticket 19's “ดูทั้งหมด” (view all) opens `/search` with `params: { q, cardName, cardLast4 }`. `walletFilter.cards` restricts results to the exact name and last four. Another card with the same name stays outside this scope.

The field shows "ค้นเฉพาะบัตร KTC •• 4821 / ค้นทุกบัญชี" (search only this card / search all accounts). A prefilled `q` skips initial focus, following prototype `openSearchFor`.

## Results and recent searches

`features/search/search.ts` exports `searchResults(entries, { term, today, categories })`. It returns `{ summary, days }`.

- "พบ N รายการ · รายจ่ายรวม X ฿" means N results and total expenses of X baht. Omit the total when no result is an expense.
- Days retain Ledger order and show "N รายการ" (N entries).
- Labels use Home's `dayLabel`. Dates outside this year add a two-digit Buddhist Era year. Example: "พ. 31 ธ.ค. 68" (Wednesday, 31 December 2568).
- `splitHits` divides `title` and `meta` into matching and other parts.
- Meta example: "อาหาร · กสิกรไทย" (food · Kasikornbank).
- Pending meta: "รอเลือกหมวด · บัตร KTC •• 4821" (pending category · card).
- Transfer meta: "ย้ายเงิน · ไม่ระบุบัญชี" (transfer · unspecified account).
- A note-only match shows "โน้ต: …" (note).
- `amountHit` identifies a matching amount. `income` identifies an income result.

Each term has its own query key. Results appear only when the settled term equals the visible input. The screen uses no placeholder data. An older answer stays under its own key and cannot replace the new term's results.

The results query continues while the editor or queue covers Search. Saving, deleting, or selecting a category refreshes results before the user returns.

Recent searches use existing per-user `financePreferences` `add`/`remove`/`get` operations. They retain the newest terms first, deduplicate without case sensitivity, and keep at most 8 terms. The prototype keeps 6.

Remember a term on Enter, when opening a result, or when selecting a recent term. Example chips do not save a term, following the prototype. A failed deletion shows a toast.

## Maestro and tests

`apps/native/.maestro/09-search.yaml` performs these checks:

1. Save 7,319 ฿ under “อาหาร” (food), without a bank.
2. Save 73,190 ฿ under KBank, with a pending category.
3. Search "7,319".
4. Open the pending result's queue.
5. Select “อาหาร” (food).
6. Open the other result in the editor.
7. Check recents, "กสิกร" (Kasikorn), and no results.
8. Delete the recent term.
9. Delete both entries through their results.
10. Open `moojot://search?q=KTC&cardName=KTC&cardLast4=4821`.
11. Tap iOS's "Open" prompt if it appears.

Expo's floating development gear on the left intercepts nearby taps. Search's “ลองอีกครั้ง” (retry) at x 36–100 can miss a tap. Tap its right side by `point`. This may also explain issue 24. That issue contains a comment about this possibility.

`apps/native/features/search/search.test.ts` checks highlights, day grouping, labels across years, and expense-only totals. It also checks category/wallet/note meta, amount highlights, and income signs.

`apps/server/test/search.test.ts` checks amount substrings with commas and decimals. It checks Thai/English aliases across stored spellings and per-user recents. It reads 1,003 results across 13 months with correct counts and expense totals. Card tests distinguish two KTC cards and a KTC entry without last four.

### Test boundaries

The user was unavailable to approve boundaries. The implementation retained tickets 04, 05, and 08's boundaries. Tests call the pure `features/search/search.ts` module directly. Server tests integrate native modules → authenticated oRPC → Ledger/Preferences → MongoDB in `apps/server/test`.

The recent-search test describes existing behavior. It passed when first written. Source inspection checks stale answers through TanStack Query's per-key cache. A test of that mechanism would test the library. Simulator checks provide screen evidence.

## Design reference

The comparison used `Moojot Home.dc.html`, block `11 ค้นหา` (Search), around lines 1005–1076. Script references include `openSearch`, `closeSearch`, `clearQuery`, `rememberQuery`, `onQueryKey`, and `searchVals` around 3136–3192. They also include `splitHits` and `amountLabel`.

Design images: `design-shots/09-search-{start,amount,bank,none}[-dark].png`, through `capture/09-search.mjs`. App images: `09-app-search-<state>[-dark].png`, beside this file.

### Matching geometry and behavior

- Header height 60, side padding 4/16. Back target 44 with MDI chevron-left 30.
- Field height 48, radius 24, `raised` background. Search icon 20/`muted`, input 16, clear target 36 with MDI close-circle 20/`muted`.
- Focus starts 320 ms after opening.
- "ค้นหาล่าสุด" (recent searches) uses 13/`muted`. Recent card radius 16 with `raised` ring, rows 52, history icon 20, text 15.
- Delete target 44 with MDI close 20. Divider starts at 46.
- Pig size 150. "พิมพ์ชื่อร้าน ชื่อผู้รับ โน้ต / หรือจำนวนเงินก็ได้" means type a merchant, recipient, note, or amount. Text size 15.
- "หมูค้นให้ทุกเดือน" means the pig searches every month. Text size 13/`muted`.
- Example chips “Grab”/“อาหาร”/“เงินเดือน” (Grab/food/salary): height 40, `border` 1.2, text 14.
- Summary line: 13/`muted`.
- Day header: “วันนี้” (today) 14/`accentText`, date 13/`muted`. Other days use 14, counts 13/`muted`.
- Day cards: radius 16, rows 62, icon circle 34. Pending entries use a dashed `accent` circle and pencil.
- Divider starts at 60. Title 15, meta 12/`accentText` when pending, amount 15/weight 500 with tabular numbers.
- Income uses `success` and a plus sign. Hits use `accent` with `onAccent` text. Matching amounts use a padded `accent` pill.
- Empty results show a pig and "ไม่พบ “…”" (no match). "ลองพิมพ์คำอื่น เช่น ชื่อร้าน หรือจำนวนเงิน" means try another term, such as a merchant or amount.
- Pending entries open their queue. Other entries open the editor.

### Deliberate differences

- Results, banks, and cards use account data instead of seeds.
- Dates outside this year add the year. Search spans all months and years, while prototype data covers one year.
- An identity match such as "kbank" receives no highlight because meta shows the Thai name. A Thai term such as "กสิกร" (Kasikorn) receives highlights.
- Tags retain existing matching. The prototype does not search tags. Rows show no tag, so tag-only matches have no highlight.
- The card scope line preserves the chosen card's identity. Prototype `openSearchFor` only enters "KTC".
- Loading shows a spinner. Errors retain the term and follow Home/Summary styling.
- Error copy: "ค้นหาไม่สำเร็จ / เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง / ลองอีกครั้ง" (search failed / check internet and retry / retry).
- Debounce waits 200 ms before requesting the server. The prototype filters memory during typing.
- The server retains 8 recent terms, while the prototype retains 6.
- The floating gear is Expo's development menu. Captures also include the status bar.

## iOS evidence: iPhone 11 simulator, iOS 18.6, development build, 2026-10-03

`ios-preview` drove the development database in light and dark modes:

- `09-app-search-start`: focused field, with no recent searches in the account.
- `-amount`: "7,319" matches both entries with highlights. "พบ 2 รายการ · รายจ่ายรวม 80,509 ฿" means 2 results and 80,509 baht of expenses.
- `-queue`: the pending result opens a queue for that entry.
- `-after-queue`: Search returns with “อาหาร” (food) and "บันทึกหมวดแล้ว" (category saved).
- `-edit`: the other result opens the editor.
- `-recent`: "7,319" appears in recents.
- `-bank`: "กสิกร" (Kasikorn) matches KBank and highlights the Thai name.
- `-none`: no results.
- `-card`: deep link shows "ค้นเฉพาะบัตร KTC •• 4821" (search only this card). The account has no KTC card, so results are empty.

Failure/recovery ran in light mode only. The API server stopped manually. The flows stayed outside the repository. `09-app-search-error` retained "ค่าโทร" (telephone costs) and showed the error card.

`09-app-search-recovered` shows server recovery. One “ลองอีกครั้ง” (retry) loaded "ค่าแก๊ส" (gas costs). This account had no matching results.

The flow deleted both created entries afterward. It deleted the recent term.

The simulator did not check more than 1,000 onscreen results or two cards with the same name. These have API evidence only. The account has no cards. A slow older answer arriving after a newer answer was not forced. Query keys provide that behavior. Dynamic Type, VoiceOver, and physical iPhone 13 Pro remain unchecked.

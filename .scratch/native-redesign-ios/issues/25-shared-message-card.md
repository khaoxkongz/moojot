# 25: Summary, Search, and Home use the shared message card

**What to build:** Summary, Search, and Home show their load-failed card with the shared `MessageCard` component. Summary and Home also read their load state from the shared `queryState()` helper when its states match theirs. The screens look and behave the same as before.

**Blocked by:** 10 — [Set budgets and restore deleted budgets](10-budgets.md)

**Status:** done

**Done in:** c3d1b88 refactor(native): Home, Summary and Search use the shared message card

**Source:** Found in the ticket 10 code review. Ticket 10 added `MessageCard` in `apps/native/components/ui/controls.tsx` and `queryState()` in `apps/native/utils/query-state.ts`. The plan screen and the budget form use them.

**Why blocked:** Ticket 10 owns the shared component and the shared helper.

Each screen has its own copy of the card styles: `messageCard`, `retryText`, and the text styles around them. A new screen can copy them again. The next change to the card then needs an edit in every copy.

- [x] Summary (`app/(app)/(insights)/summary.tsx`) uses `MessageCard` and no longer defines its own card styles.
- [x] Search (`app/(app)/(entries)/search.tsx`) uses `MessageCard` and no longer defines its own card styles.
- [x] Home (`app/(app)/(tabs)/index.tsx`) uses `MessageCard` and no longer defines its own card styles.
- [x] Summary and Home use `queryState()` when it gives the same states. Home and Summary compute their errors differently from `queryState()`. For example, `queryState()` hides a refresh error while a retry fetches. If a screen needs its own states, keep them and write the reason in a comment in this file.
- [x] The existing tests and Maestro flows for tickets 05, 08, and 09 pass. The error and recovery screenshots match the screenshots in `notes/` for those tickets.

## Comments

**Ticket 25 — agent, 2026-10-03:** Home, Summary, and Search now show their cards through `MessageCard`.
The new `align="start"` option keeps those cards flush left, as before. Plan and the budget form keep the centered default.
The `style` prop sets the outer margins of each screen.

Search keeps its spoken retry name “ลองค้นหาอีกครั้ง” (search again) through `retryLabel`.
Home also shows its empty-list card through `MessageCard`.
Summary keeps `retryText` only for its refresh line and its inline bar and trend errors. Those are not the card.

Load states:

- Home reads `ready`, `pageError`, and `retry` from `queryState()`. They give the same states as the old code.
- Home keeps its own refresh error for two reasons. First, `queryState()` hides the refresh line while a retry fetches.
  TanStack Query repeats a failed fetch three times. The line would then disappear for several seconds without a spinner.
  Second, Home shows the line while another query loads under the spinner. `queryState()` shows it only after every query has data.
- Summary reads `pageError` from `queryState()` for the month-start setting and the month totals.
  One edge case changes. Before, a failed refresh of the month-start setting showed the error card while a new month loaded.
  Now Summary shows the spinner, and it shows the card only when the month itself fails.
- Summary keeps its own refresh error and retry. The refresh line reports the month totals only, and it stays visible during a retry, as on Home.
  The retry also loads the bars, the trend, and the budgets again. These queries cannot go into `queryState()`.
  The breakdown that is off never has data, so `ready` would stay false.

Visible differences, from the screenshots:

- The Summary card has its “ลองอีกครั้ง” (retry) link 4 points lower. It now uses the same gap as Home and Search.
- The Home card has a 1-point inset ring in place of a 1-point border, in the same color. Its text moves up 1 point.

Tests: `apps/native/utils/query-state.test.ts` records the `queryState()` states that Home and Summary read.
These tests passed at their first run, because the helper existed before this ticket. The app has no component render tests.

Simulator check, iPhone 11, development build:

- Flows 05, 08, and 09 passed in light and in dark. Two runs stopped once at steps that this change does not touch.
  One was `hideKeyboard` in 09 (light). The other was the “จดเพิ่ม” (add entry) tap in 08 (dark). Each flow passed on the next run.
- For error and recovery, the agent stopped the API server manually. The flows stayed outside the repository.
  The screenshots are `notes/25-app-*`: Home, Summary, and Search error cards in both themes, the Summary refresh line (dark), and the recovered screens.
- The error cards and the Summary refresh line match the ticket 05, 08, and 09 screenshots, except for the differences above.
- Search loaded after one retry in both themes. Summary loaded after one retry in light, and in the second dark outage.
  Home needed two taps. In the first dark outage, two Summary taps sent no request to the server.
  [Issue 24](24-ios-first-retry-after-outage.md) records this behavior. The retry code did not change in this ticket.

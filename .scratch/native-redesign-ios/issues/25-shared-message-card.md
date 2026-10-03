# 25: Summary, Search, and Home use the shared message card

**What to build:** Summary, Search, and Home show their load-failed card with the shared `MessageCard` component. Summary and Home also read their load state from the shared `queryState()` helper when its states match theirs. The screens look and behave the same as before.

**Blocked by:** 10 — [Set budgets and restore deleted budgets](10-budgets.md)

**Status:** ready-for-agent

**Source:** Found in the ticket 10 code review. Ticket 10 added `MessageCard` in `apps/native/components/ui/controls.tsx` and `queryState()` in `apps/native/utils/query-state.ts`. The plan screen and the budget form use them.

**Why blocked:** Ticket 10 owns the shared component and the shared helper.

Each screen has its own copy of the card styles: `messageCard`, `retryText`, and the text styles around them. A new screen can copy them again. The next change to the card then needs an edit in every copy.

- [ ] Summary (`app/(app)/(insights)/summary.tsx`) uses `MessageCard` and no longer defines its own card styles.
- [ ] Search (`app/(app)/(entries)/search.tsx`) uses `MessageCard` and no longer defines its own card styles.
- [ ] Home (`app/(app)/(tabs)/index.tsx`) uses `MessageCard` and no longer defines its own card styles.
- [ ] Summary and Home use `queryState()` when it gives the same states. Home and Summary compute their errors differently from `queryState()`. For example, `queryState()` hides a refresh error while a retry fetches. If a screen needs its own states, keep them and write the reason in a comment in this file.
- [ ] The existing tests and Maestro flows for tickets 05, 08, and 09 pass. The error and recovery screenshots match the screenshots in `notes/` for those tickets.

## Comments

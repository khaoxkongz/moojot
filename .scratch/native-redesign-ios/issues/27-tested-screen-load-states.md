# 27: Unit tests for the load state of each screen

**What to build:** Home, Summary, Search, and Plan get their load state from a pure function with unit tests. The load state tells the screen what to show: the spinner, the load-failed card, the refresh line, or the data. A change to a load state makes a test fail.

**Blocked by:** 25 — [Summary, Search, and Home use the shared message card](25-shared-message-card.md)

**Status:** needs-triage

**Source:** The ticket 25 retrospective.

**Why blocked:** Ticket 25 sets the current load states of Home and Summary. Its Comments give the reasons for each state.

In ticket 25, the first change to Summary showed a different state when a month loaded. No test failed. The spec review found the change, and commit `c60485a` restored the old logic. The screens compute their load state inline, and the app has no component render tests. Thus a refactor of this logic cannot make a test fail first.

- [ ] Each of the four screens reads its load state from one pure function. The function is in the feature folder of the screen or in `apps/native/utils/`.
- [ ] Unit tests record the current states, as of `c60485a`. They include the states where Home and Summary differ from `queryState()`. For example, Summary shows the load-failed card if the month-start setting has data and a failed refresh while the month loads.
- [ ] The screens look and behave the same as before. The Maestro flows for tickets 05, 08, 09, and 10 pass.
- [ ] `CODING_STANDARDS.md` has one rule for the reviewer: a screen that reads several queries gets its load state from a tested pure function.

## Comments

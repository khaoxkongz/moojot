# 26: Keep the error and recovery Maestro flows in the repository

**What to build:** The repository contains a Maestro error flow and a Maestro recovery flow for each screen with a load-failed card. An agent runs them with the `ios-preview` recipe and writes no new flow.

**Blocked by:** None (can start immediately)

**Status:** done

**Done in:** 2bfe106 feat(native): keep the error and recovery Maestro flows in the repository; 03a043b fix(native): ticket 26 review fixes

**Source:** The ticket 25 retrospective. Tickets 05, 08, 09, 10, and 25 each wrote these flows again in a scratch directory. Their notes record “The flows stayed outside the repository.”

The `ios-preview` skill (`.claude/skills/ios-preview/SKILL.md`, step 4) gives the procedure for error and recovery states. The agent stops the API server and runs an error flow. Then the agent starts the server again and runs a recovery flow. Each ticket wrote these two flows again. The first ticket 25 implementer used 173 tool calls in 38 minutes, and this work was part of that cost.

- [x] Each screen with a load-failed card has two flows in `apps/native/.maestro/`. These screens are Home, Summary, Search, and Plan. One flow waits for the error card and takes `<NN>-app-<screen>-error`. The other flow taps “ลองอีกครั้ง” (retry) one time and takes `<NN>-app-<screen>-recovered`.
- [x] The screenshot names use the numbers of the tickets that own the screens. Home uses 05, Summary uses 08, Search uses 09, and Plan uses 10.
- [x] Step 4 of the `ios-preview` skill names these flows. An agent can then run them without changes.
- [x] Each flow passes in light and dark on the iPhone 11 simulator. The screenshots match the error and recovered screenshots in `notes/`.

## Comments

**Ticket 26 — agent, 2026-10-03:** The eight flows are in `apps/native/.maestro/`.
They are `05-home`, `08-summary`, `09-search`, and `10-plan`, each with an `-error.yaml` and a `-recovered.yaml` file.
Step 4 of the `ios-preview` skill names them and gives the run order.

Findings for later runs:

- When the app opens without the API server, it shows an error before Home. The error flows therefore run on the open app.
  `scripts/ios-preview.mjs --offline` now keeps the app open, as `--keep-app` does.
  Step 4 first opens the app with `sign-in.yaml` while the server runs. That relaunch empties the app's cache.
- Each error flow opens a screen that the app did not load: the month before on Home, Summary, Search with “ค่าโทร” (phone bill), and Plan.
  The Plan error flow opens `moojot://plan`, because the path through Summary needs the server.
- In one Home run, the first “เดือนก่อน” (previous month) tap did nothing. The flow now taps with `retryTapIfNoChange`.
- The Expo dev-tools button was on the right side of the screen in these runs, away from every retry link. Each flow taps the retry link by its name.

Simulator check, iPhone 11, development build:

- All four flow pairs passed in light and in dark. One retry tap recovered each screen.
- One dark Search run failed one time. Two retry taps sent no request to the server, and the card stayed.
  Three later dark Search runs passed at the first tap. That behavior is [issue 24](24-ios-first-retry-after-outage.md).
  The failed run had no log in the retry handler, so the data does not show if the tap reached the button.
- The error cards match the `notes/` screenshots of tickets 05, 08, 09, 10, and 25. Only the month and the dev-tools button position are different.
- New screenshots in `notes/`: `05-app-home-{error,recovered}-dark`, `08-app-summary-{error,recovered}`, `09-app-search-{error,recovered}-dark`, and `10-app-plan-{error,recovered}-dark`.

**Ticket 26 review fix — agent, 2026-10-03:** This fix applies the code review findings.

- `--offline` only skips the API server check again. The error runs give `--offline --keep-app`, and `--keep-app` keeps the app open.
  This replaces the `--offline` finding in the earlier comment.
- `05-home-recovered.yaml` waits for a total that ends in “บาท” (baht) after an amount with two decimals.
  This selector also matches the caption with dates, which Home shows when the month does not start on the 1st.
- Step 4 of the `ios-preview` skill says that the four flow pairs cover only Home, Summary, Search, and Plan.
  Sub-step 4 points to top-level step 1 (Services up). The dev-tools gotcha now gives the tap by name first.
- The flows have comments for `retryTapIfNoChange` and for the iOS prompt that opens `moojot://plan`.

Simulator check, iPhone 11, development build: the Home flow pair passed in light, with one retry tap.

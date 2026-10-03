# 26: Keep the error and recovery Maestro flows in the repository

**What to build:** The repository contains a Maestro error flow and a Maestro recovery flow for each screen with a load-failed card. An agent runs them with the `ios-preview` recipe and writes no new flow.

**Blocked by:** None (can start immediately)

**Status:** needs-triage

**Source:** The ticket 25 retrospective. Tickets 05, 08, 09, 10, and 25 each wrote these flows again in a scratch directory. Their notes record “The flows stayed outside the repository.”

The `ios-preview` skill (`.claude/skills/ios-preview/SKILL.md`, step 4) gives the procedure for error and recovery states. The agent stops the API server and runs an error flow. Then the agent starts the server again and runs a recovery flow. Each ticket wrote these two flows again. The first ticket 25 implementer used 173 tool calls in 38 minutes, and this work was part of that cost.

- [ ] Each screen with a load-failed card has two flows in `apps/native/.maestro/`. These screens are Home, Summary, Search, and Plan. One flow waits for the error card and takes `<NN>-app-<screen>-error`. The other flow taps “ลองอีกครั้ง” (retry) one time and takes `<NN>-app-<screen>-recovered`.
- [ ] The screenshot names use the numbers of the tickets that own the screens. Home uses 05, Summary uses 08, Search uses 09, and Plan uses 10.
- [ ] Step 4 of the `ios-preview` skill names these flows. An agent can then run them without changes.
- [ ] Each flow passes in light and dark on the iPhone 11 simulator. The screenshots match the error and recovered screenshots in `notes/`.

## Comments

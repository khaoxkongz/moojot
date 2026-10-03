# 28: Maestro steps that fail on some runs

**What to build:** Flows 08 and 09 pass on the first run, in light and dark. The steps that failed on some runs wait for their target before they act.

**Blocked by:** None (can start immediately)

**Status:** needs-triage

**Source:** The ticket 25 retrospective.

In the first ticket 25 run, two steps failed one time and passed on the next run. The ticket 25 change does not touch these steps:

- `hideKeyboard` in `apps/native/.maestro/09-search.yaml`, light theme. The flow has six `hideKeyboard` steps. The run did not record which step failed.
- The “จดเพิ่ม” (add entry) tap in `apps/native/.maestro/08-summary.yaml`, dark theme. The flow has one tap on this button, at line 10. It comes after sign-in and `waitForAnimationToEnd`, and it does not wait for the button.

In the second ticket 25 run, all flows passed on the first run. Ticket 24 has a comment about a related problem. Expo's floating development-tool button can stop taps near it. This button may be the cause of the failed tap. Nobody checked this cause.

- [ ] Find which `hideKeyboard` step failed in flow 09. `node scripts/ios-preview.mjs` prints the failed step, its error, and its screenshot.
- [ ] Each step that failed waits for its target before it acts.
- [ ] Flows 08 and 09 pass on the first run, five times in a row, in light and dark.

## Comments

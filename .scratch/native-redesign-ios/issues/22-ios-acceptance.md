# 22: Accept the complete app on iOS

**What to build:** Try every flow with fresh data on physical iPhone and simulator. Record evidence that design and data work together under the spec.

**Blocked by:** 21 — [Start fresh experimental data in the existing account](21-scoped-cutover.md)

**Status:** ready-for-agent

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md)

**User stories:** 1–110 (integration/visual acceptance)

**Why blocked:** Fresh data and core paths from ticket 21 precede whole-app acceptance.

- [ ] Complete primary tasks across auth/onboarding/Home/editor/slips/Summary/Search/budgets/rules/manager/calendar/streak/profile/cards/CSV. Include failure/recovery for load/save flows. (stories 1–110)
- [ ] Compare 29 images and unscreened states/sheets to handoff in light/dark. Preserve text/spacing/assets/motion/targets.
- [ ] Separate physical iPhone 13 Pro/Expo Go and iPhone 11 simulator/Device Hub results. Check permission/photo behavior physically where simulator evidence is insufficient.
- [ ] Keyboard, safe areas, Dynamic Type, Thai/long names/large amounts, scroll/back/dismiss, and unsaved drafts remain usable.
- [ ] Category/filter/calendar/undo/rule/work changes produce consistent actual data across consumers. Include other-screen data.
- [ ] Run check, changed tests, and type checks for modified workspaces. Pass key spec fixtures. Existing tests alone are insufficient.
- [ ] Retire unused legacy UI/font aliases after all callers migrate. Preserve supported flows/contracts.
- [ ] Report evidence/devices/versions/runtime and unverified cases accurately. Android is outside this round's acceptance. Record bugs as separate issues. Unmet criteria keep work open.

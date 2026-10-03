# 01: iOS typography and theme foundation

**What to build:** Run the existing app on iOS with working light/dark selection. Home/editor use shared design fonts, colors, and controls. Prepare the foundation before other flows while preserving existing reading/persistence.

**Blocked by:** None (can start immediately)

**Status:** done

**Done in:** 28a2ba6 feat(native): add iOS theme foundation for the redesign; 4cdc481 fix(native): keep fills readable and put baht after amounts

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md)

**User stories:** 1–5, 7, 10, 110

**Why blocked:** This supplies typography/theme/controls and the iOS startup path for later screens.

- [ ] Retain a versioned design reference with assets/fonts/text for later checks. Use the app runtime rather than the HTML runtime.
- [ ] Run the app with a test API on iOS. Separate iPhone 13 Pro/Expo Go from iPhone 11 simulator/Device Hub evidence. Explain any build requirement through an actual capability.
- [ ] Theme selection persists across app starts. Root/navigation/status/components use one palette and the stored choice.
- [ ] Reference screens use Thai Regular 400 and system-font 500/tabular amounts. Safe areas, targets, and Dynamic Type preserve action access.
- [ ] Adapt reusable controls while preserving old interfaces or adding new variants before migrating callers. Existing screens continue compiling and working.
- [ ] Theme load/save failures remain factual and keep preferences/display consistent. Capture light/dark and existing primary-task evidence on iOS.

## Comments

**2026-10-01 — agent:** Implementation commits:

- 28a2ba6 feat(native): add iOS theme foundation for the redesign
- 4cdc481 fix(native): keep fills readable and put baht after amounts

Merge into `feat/native-redesign-ios` is 12f77b9. `vp check`, `vp test` (201), native check-types, and lint passed. The design reference is `docs/design/native-redesign-2026-09-30/`.

At this point, human checks remain on iPhone 13 Pro (Expo Go) and iPhone 11 simulator (Device Hub). Set `Status: done` afterward:

- Start with `expo start --go`. Installed `expo-dev-client` makes Expo seek a development build without `--go`. Connect the actual test API.
- Select dark/light in theme settings. Close/reopen the app. Check the theme across screens, tabs, modals, status bar, and keyboard.
- Compare light/dark Home/editor with `screenshots/01a-home.png`, `01b-home-dark.png`, and `02a-entry-create-keypad.png`. Check Thai Regular, 500/tabular amounts, regular-weight trailing ฿, aligned hero currency, shrinking large amounts, and tabs above the home indicator.
- At maximum Dynamic Type, check editor Save and settings Back remain accessible.
- Create, edit, and save through the actual API.
- Capture light/dark evidence. The agent's simulator sign-in images are insufficient for this criterion.

**2026-10-01 — user checked iOS:** Passed.

- Dark selection survived reopening across screens. Light selection also survived reopening across screens.
- Home hero ฿ aligns with digits.
- API create/edit/save behavior remains intact.
- Maximum Dynamic Type was not tested. The user decided it was unnecessary for this ticket.

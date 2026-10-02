# Building UI from the design reference

Read this before building or restyling any screen, sheet, dialog or toast in this feature.

`docs/design/native-redesign-2026-09-30/Moojot Home.dc.html` is the **source of truth** for layout, sizes, radii, spacing, colours, copy and behaviour. The handoff `README.md` and `screenshots/` summarise it and leave many states out, for example the entry calendar, the category sheet and the exit dialog. When the HTML and the README disagree, follow the HTML and note the difference in the ticket's notes.

## For every UI element you touch

1. **Find its markup.** Each screen is a `data-screen-label` block and each sheet or dialog is a `role="dialog"` with an `aria-label`. Search by that label or by the Thai copy you see on screen:
   ```sh
   grep -n 'data-screen-label=\|role="dialog" aria-label=' "docs/design/native-redesign-2026-09-30/Moojot Home.dc.html"
   grep -n 'aria-label="เลือกวันที่จด"' "docs/design/native-redesign-2026-09-30/Moojot Home.dc.html"
   ```
   State and behaviour (what opens what, validation, timings) live in the script at the bottom of the file. Search for the handler named in `onClick="{{ … }}"`.
2. **Read the inline styles** of that block and its children, and carry the numbers into React Native: 1 CSS px = 1 pt. Map each value to a theme token (`radius.*`, `space`, `touch.*`, palette names in `constants/theme.ts`, see [notes 01](01-theme-foundation.md)). When no token holds the value, add one rather than guessing a nearby number.
3. **Look at it rendered.** Open the matching image in [design-shots/](design-shots/) (light and `-dark`). If the state you are building has no image, capture it first (below) and commit the images with your ticket.
4. **Compare** your screen against the image, light and dark (capture the app with the `ios-preview` skill as `notes/<NN>-app-<state>[-dark].png`), before calling the ticket done, and list any deliberate differences in the ticket's notes.

## Reviewing a UI diff

A spec review of this feature also checks design fidelity. For each screen, sheet, dialog or toast the diff adds or restyles, find its block in the HTML (step 1 above) and report every size, radius, spacing, colour, icon or copy that differs from it, unless the ticket's notes list that difference as deliberate. A UI diff that adds no app captures (`notes/<NN>-app-<state>.png`) or names no reason it could not render the app is itself a finding.

## Capturing prototype states

The prototype runs in headless Chrome. The scripts in [design-shots/capture/](design-shots/capture/) sign in to the demo account and click through it:

```sh
# one-time, outside the repo
mkdir -p "$TMPDIR/design-shots" && (cd "$TMPDIR/design-shots" && npm i puppeteer-core@23)
# serve the prototype
(cd docs/design/native-redesign-2026-09-30 && python3 -m http.server 8765 &)
# run from the capture directory; images land in design-shots/
cd .scratch/native-redesign-ios/notes/design-shots/capture
DESIGN_SHOTS_DEPS="$TMPDIR/design-shots" node 04-manual-entry.mjs light
DESIGN_SHOTS_DEPS="$TMPDIR/design-shots" node 04-manual-entry.mjs dark
```

`lib.mjs` has `open(theme)`, `signIn`, `click(page, label)` (matches `aria-label` or text of the button on top), `visible(page)` (lists what can be tapped now, useful for finding the next label), and `shot(page, path)` (crops to the 402×874 iPhone frame). For a new ticket, copy `04-manual-entry.mjs` to `<NN>-<slug>.mjs` and name images `<NN>-<state>[-dark].png`.

## Captured so far

| Ticket                 | Images                                                                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 04 entry editor        | `04-keypad-calculating`, `04-category-sheet`, `04-tag-add`, `04-form-new`, `04-form-empty`, `04-save-missing-amount`, `04-type-transfer`, `04-calendar`, `04-exit-dialog`, `04-edit-manual`, `04-edit-menu`, `04-delete-toast` |
| 05 Home, filter, queue | `05-home`, `05-filter-sheet`, `05-filter-none`, `05-home-filtered`, `05-queue`                                                                                                                                                 |
| 08 Summary             | `08-summary`, `08-summary-bottom`, `08-summary-tags`, `08-summary-income`, `08-summary-transfer`, `08-summary-previous`, `08-summary-filtered`, `08-summary-queue`                                                             |
| 09 Search              | `09-search-start`, `09-search-amount`, `09-search-bank`, `09-search-none`                                                                                                                                                      |
| 10 Budgets             | `10-plan`, `10-plan-bottom`, `10-plan-previous`, `10-form-edit`, `10-form-replace`, `10-delete-toast`, `10-form-new`, `10-form-missing`                                                                                        |

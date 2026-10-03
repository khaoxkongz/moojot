# Build UI from the design reference

Read this before building or restyling a screen, sheet, dialog, or toast in this feature.

`docs/design/native-redesign-2026-09-30/Moojot Home.dc.html` is authoritative for layout, sizes, radii, spacing, colors, text, and behavior. Handoff `README.md` and `screenshots/` summarize it but omit states, such as entry calendar, category sheet, and exit dialog. When HTML and README differ, follow HTML. Record the difference in ticket notes.

## For each changed UI element

1. **Find markup.** Screens use `data-screen-label`. Sheets/dialogs use `role="dialog"` with `aria-label`. Search the label or actual Thai text:

   ```sh
   grep -n 'data-screen-label=\|role="dialog" aria-label=' "docs/design/native-redesign-2026-09-30/Moojot Home.dc.html"
   grep -n 'aria-label="เลือกวันที่จด"' "docs/design/native-redesign-2026-09-30/Moojot Home.dc.html"
   ```

   “เลือกวันที่จด” means choose transaction date. Keep the selector's Thai value exact. State/behavior, validation, and timing live in the bottom script. Search the handler in `onClick="{{ … }}"`.

2. **Read styles.** Read the block's inline styles and children. Transfer values to React Native at 1 CSS px = 1 pt. Map them to `radius.*`, `space`, `touch.*`, or palette tokens in `constants/theme.ts`. See [notes 01](01-theme-foundation.md). Add a missing token instead of approximating its value.

3. **Inspect rendering.** Open matching light/`-dark` images in [design-shots/](design-shots/). Capture missing states first through the procedure below. Commit those images with the ticket.

4. **Compare before completion.** Capture app states through `ios-preview` as `notes/<NN>-app-<state>[-dark].png`. Compare light/dark against design images. Record deliberate differences in ticket notes before marking done.

## Review a UI diff

Spec review also checks design fidelity. Find the HTML block for every added/restyled screen, sheet, dialog, or toast. Report differing sizes, radii, spacing, colors, icons, or text unless notes identify them as deliberate. Missing app captures (`notes/<NN>-app-<state>.png`) are a finding unless the review explains why rendering was unavailable.

## Capture prototype states

The prototype runs in headless Chrome. Scripts in [design-shots/capture/](design-shots/capture/) sign in to the demo account and drive its UI:

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

`lib.mjs` provides:

- `open(theme)`.
- `signIn`.
- `click(page, label)`, matching `aria-label` or the top button's text.
- `visible(page)`, listing currently tappable elements to find the next label.
- `shot(page, path)`, cropping to the 402×874 iPhone frame.

For new tickets, copy `04-manual-entry.mjs` to `<NN>-<slug>.mjs`. Name images `<NN>-<state>[-dark].png`.

## Captured states

| Ticket               | Images                                                                                                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 02 signup / sign-in  | `02-signup`, `02-signup-errors`, `02-password-shown`, `02-signup-duplicate`, `02-signin-wrong-password`, `02-signin-unknown`, `02-greeting`                                                                                    |
| 04 entry editor      | `04-keypad-calculating`, `04-category-sheet`, `04-tag-add`, `04-form-new`, `04-form-empty`, `04-save-missing-amount`, `04-type-transfer`, `04-calendar`, `04-exit-dialog`, `04-edit-manual`, `04-edit-menu`, `04-delete-toast` |
| 05 Home/filter/queue | `05-home`, `05-filter-sheet`, `05-filter-none`, `05-home-filtered`, `05-queue`                                                                                                                                                 |
| 08 Summary           | `08-summary`, `08-summary-bottom`, `08-summary-tags`, `08-summary-income`, `08-summary-transfer`, `08-summary-previous`, `08-summary-filtered`, `08-summary-queue`                                                             |
| 09 Search            | `09-search-start`, `09-search-amount`, `09-search-bank`, `09-search-none`                                                                                                                                                      |
| 10 Budgets           | `10-plan`, `10-plan-bottom`, `10-plan-previous`, `10-form-edit`, `10-form-replace`, `10-delete-toast`, `10-form-new`, `10-form-missing`                                                                                        |

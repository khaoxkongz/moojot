# Plan the Moojot app redesign

Label: wayfinder:map

## Destination

Complete the decisions for adapting the existing mobile app to the new appearance and behavior. Include necessary data and backend changes. Prepare a spec and implementation tickets with clear order and acceptance criteria.

## Notes

### Approved design and sources

- The user chose the Claude Design redesign and approved its necessary backend changes. This approval is the map's starting point.
- The app is experimental. The user said development started on 24 September 2569 (2026). See [existing-data preference](issues/08-existing-data-preference.md#answer).
- Source directory: `/Users/computer/Downloads/design_handoff_moojot_app/`. `README.md` explains behavior. `Moojot Home.dc.html` is the prototype. `screenshots/` contains 29 images, alongside `assets/` and `fonts/`.
- Inspect the prototype when images or README lack detail.
- Initial inspection covered images, documents, and code. It did not include physical-device checks or browser interaction with the prototype.
- Use the existing `apps/native` app as the base. Inspect its capabilities before estimating changes. Check Expo details in `apps/native/package.json`.
- Identify previous requirements that the redesign replaces. Decide new details in the relevant ticket, especially [native automatic slip import](../native-slip-auto-import/spec.md).

### Planning sessions

- Use `grilling` and `domain-modeling` in every session.
- Use `expo-overview` when considering Expo. Read domain documents through `GLOSSARY-MAP.md` when exploring code.
- Speak Thai with the user. Use real scenarios and easy questions. The agent checks technical facts, then presents options and a recommendation.
- The user reported difficulty following details. Slow the discussion. Explain necessary terms before asking about one scenario. Mark provisional agreements as open to review.
- Preserve the chosen screens and controls. Inspect the prototype before asking about behavior. The agent checks the meaning of simulated data.
- For slip/CSV times, see [the time-input correction](issues/02-finance-data-model.md#correction-about-time-input).
- This Wayfinder map covers planning. App implementation starts after spec handoff.
- Use the local Markdown tracker in `docs/agents/issue-tracker.md`. Child tickets belong in `issues/`. Declare dependencies through `Blocked by:`.
- The latest user instruction requires iOS acceptance first. Android verification follows later. See the platform decision below.

## Decisions so far

<!-- Add only resolved tickets, with a brief decision and an Answer link. -->

- [Platforms and validation](issues/01-device-validation.md#answer): check iOS through iPhone 13 Pro/Expo Go and iPhone 11/Device Hub. Defer Android checks.
- [Banks, cards, dates, and times](issues/02-finance-data-model.md#answer): group by bank. Identify cards by name and last four. Manual entry selects a date. Leave CSV time blank without actual transaction time.
- [Delete and undo](issues/03-delete-undo.md#answer): deleting a category also deletes linked budgets. Entries remain. Undo restores the category, budgets, and affected entry relationships.
- [Slip-reading lifecycle](issues/04-slip-reading-lifecycle.md#answer): retain pending work across rounds. Incomplete data waits for manual entry without rereading the same image. Retry temporary failures conditionally. Continue across in-app navigation.
- [Existing-data preference](issues/08-existing-data-preference.md#answer): existing data is experimental. A fresh dataset is acceptable. Define reset steps and scope before implementation.
- [Recurring-rule resume](issues/09-recurring-resume.md#answer): resume at the next occurrence. Skip the intentional pause period. Preserve previously recorded entries.
- [First credit card](issues/10-first-credit-card.md#answer): add a card by name and last four, then select it. This additional flow is provisional until real use.
- [Data and API coverage](issues/07-data-api-coverage.md#answer): inspection covers every screen and flow. Many use existing operations. Main gaps concern undo, recurring rules, slip work/evidence, amount search, CSV, and auth errors.
- [Data transition](issues/05-data-transition.md#answer): reset finance data and preferences in the existing account. Reset mobile memory. Keep auth. Cut over when schema, API, and client are ready.
- [Delivery order and acceptance](issues/06-delivery-sequence.md#answer): four phases cover foundations, core flows, summaries/planning, and additional features. Accept iOS first. Check Android later.

## Not yet specified

<!-- Previous open topics now have plans. Review them in the delivery-order decision. -->

## Out of scope

- Implementation within this map. Hand off a spec in a new feature directory when decisions are clear.
- Features marked “จะทำในรอบถัดไป” (planned for a later round) in the handoff.
- Web app visual changes and App Store / Google Play publication.
- Separate accounts within one bank during this redesign. The user chose bank grouping. See [the decision and future extension](issues/02-finance-data-model.md#answer-about-bank-grouping).
- Android tooling and runtime/UI checks during this iOS acceptance round. See [the latest platform scope](issues/01-device-validation.md#answer).

## Handed off

- [iOS-first redesign spec](../native-redesign-ios/spec.md) uses a new feature directory. The handoff recorded status ready-for-agent. It uses the latest agreements and iOS acceptance criteria. Android follows later.

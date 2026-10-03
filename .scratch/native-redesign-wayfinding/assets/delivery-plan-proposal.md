# Proposed delivery order and redesign acceptance

For [delivery planning](../issues/06-delivery-sequence.md), using [the map](../map.md) and [data/API coverage](data-api-coverage.md). This proposal supports review before spec handoff. No implementation changed.

## User-selected goal and order

Adapt the existing app to the handoff's appearance and behavior. Target iPhone/Android, with iOS acceptance now and Android verification later under the latest instruction. Prioritize the user's entry/slip flows, then complete the design, including optional credit cards.

Every phase must offer inspectable screens and primary tasks using the actual system. Sample-data images without working saves do not establish acceptance.

## Four phases

| Phase                                   | Visible and usable result                                                                              | Required data/system work                                                                                                                                                              | Acceptance                                                                                                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shared foundations                      | Sample screens match text, buttons, amounts, and sheets in both themes.                                | Shared typography/theme/components/navigation. Contracts for undo, actual time/slip evidence, cards/recurring rules, and pending work. Fixtures and iOS run methods.                   | Thai Regular text, system numbers at 500/tabular, safe areas, and keyboard. Check contracts in an isolated test database. Preserve user data during contract tests.                                          |
| Core use                                | Login/four-step onboarding → Home → manual entry/edit/category queue → slip reading/manual resolution. | Auth errors, shared consent, bank/filter identity, app-level scanning, persisted work, targeted retry, manual resolution, entry deletion/restore, separate recording/transaction time. | Follow [core use acceptance](#core-use-acceptance).                                                                                                                                                          |
| Summaries and planning                  | Summary → all-month Search → budgets/recurring rules → category/tag/calendar management.               | Amount matching, pagination/counts, custom-period consistency, cascade/full undo, recurring cards/link/effective periods/pause history, immediate settings persistence.                | Consistent totals beyond 1,000 entries, exact budget equality, month starts 29–31, restored relationships. New-rule backfill, next-only edits, skipped pauses. Immediate calendar settings and reset undo.   |
| Additional features and complete checks | Live Profile → carrots/tutorial/help → cards/add card → CSV and complete flows.                        | Queries/status aggregation, optional card choices shared by editor/rules/cards, 10-column CSV with known/unknown time, fresh-data cutover.                                             | Core use without cards, consistent name/last-four identity, complete Thai/BOM CSV. Accurate help, both themes, failure/recovery. Physical/simulated iPhone checks under the iOS plan. Android follows later. |

### Core use acceptance

- Use actual read/write flows.
- Retain pending work across rounds and restart.
- Keep remembered incomplete images outside automatic resends.
- Retry temporary failures under the agreed policy.
- Prevent duplicate entries from manual resolution and active import requests.
- Continue reading across app screens.
- Suspend new images when the app becomes inactive.
- Preserve drafts after validation or save failures.

Within foundations/core phases, independent UI work can start before schema work. Flows requiring new contracts must wait for their owner. Use the repository's feature-branch workflow. Create build issues in a new feature directory at spec handoff.

## Technical approach for the spec

### Existing app and contracts

Retain Expo Router, TanStack Query/Form, useAppTheme, and typography wrappers. Use handoff palette/assets/fonts/copy as acceptance values. General UI skill rules do not replace the chosen appearance, including brand colors, MDI icons, or “จดเพิ่ม” (add entry).

Inspect actual prototype geometry/timing. Do not copy its HTML runtime into the production app.

Keep integer satang and ISO calendar-day strings. Actual transaction time is optional and requires evidence. createdAt means recording time. Timezones must not shift transaction dates. CSV time must not come from createdAt.

All-month search, cards, and many statuses can reuse existing operations. Add amount predicates and normalized bank names in the search owner. Obtain complete counts/totals across pages. A 1,000-row read cannot represent all data.

### Deletion and undo

The server owns deletion/restoration of server entities. Record the specific operation's effects to restore original identities and relationships. Native UI shows the latest 5-second toast. Restore actual data, rather than creating new entities with the same names.

Choose deletion schemas for categories, tags, budgets, and recurring rules that preserve restoration data and cascades in one operation. Before implementation, identify receipt/snapshot ownership and every restoration path. Check ownership and repeated calls. Restore transactionally without overwriting other edits. Conflicts return explainable errors. Partial restoration cannot report full success.

Closing a toast does not prove server success. Provide real pending/failure/recovery states. Retention for repeated/failed requests is an implementation detail. The UI action window remains as designed.

### Slip work and evidence

Use per-account mobile pending-work memory for this round. Cross-device synchronization is not a requirement. Separate persisted work items from discovery/outcome cleanup after 30 days.

Records need:

- Asset ID.
- Photo date for prefill.
- Cause/status.
- Necessary retry metadata.
- Transaction binding.
- Completion state.

The signed-in app owns scanning across routes. New sends require app activity, permission, and the correct account. Pause new sends while inactive. Continue when eligible again. Add no closed-app execution promise.

Preserve `slip:<assetId>` and server deduplication. Manual resolution shares the image identity and reconciles conflicts with active requests. Success binds the image and completes work. Photo time and album names do not prove transaction time or bank identity without evidence.

Extend schema/prompt/extraction/mapping for actual UI evidence. Preserve unknown values. Qualify candidates before entry creation. Separate generic skipped reasons: incomplete needs help, while duplicate/no-candidate skip. Missing files or limited access retain work and show actual limits.

### Recurring rules, cards, and settings

Recurring rules must retain selected cards and support complete editor-to-rule links. Choose effective periods or rule versions so generation understands history. Current isActive plus old startsOn cannot backfill everything using edited dates/amounts.

New rules backfill only the handoff-defined period. Edits affect the next occurrence. Resume skips intentional pauses. App inactivity is not a pause. Define app-entry generation triggers that respect end dates and deduplication.

First-card input uses name and four final digits as an optional flow. Share choices across editor/rules/cards. Its representation must support later selection without sample data. Preserve bank-wide views and agreed card identity.

Calendar/theme/consent can use existing persistence. All consumers must refresh from the same value. An enabled Save button does not authorize repeated mutation submissions. Prevent duplicates and preserve drafts after failures.

### Auth and onboarding

Reuse auth services. Distinguish unknown email/wrong password only when actual contract data supports it. Do not guess from INVALID_EMAIL_OR_PASSWORD. Inspect installed-library contract options before implementation. Record actual limitations if any flow cannot match the handoff.

Unfinished onboarding must continue through the existing guard. README signin→Home applies to ready accounts. Four-step onboarding and Profile share consent keys/values. Check loading/errors/partial saves and preserve existing terms requirements.

## Fresh data and validation

Follow [the transition decision](../issues/05-data-transition.md#answer) after compatible schema/API/client and passing contract tests. Identify account/environment. Stop old writes before resetting that account's finance data and local memory. Preserve auth and check fresh onboarding.

Use the available iPhone 13 Pro/Expo Go and iPhone 11/Device Hub during development. Expo Go is the initial method supported by earlier evidence. If a capability requires a development build, document the actual reason. Prepare that build in its issue. Always report physical/simulator checks and their coverage separately.

Defer Android SDK/AVD preparation and Android runtime/UI verification under the latest instruction. They do not gate this iOS round. Later checks cover Android simulators and physical devices, especially permission/photo-library/keyboard/back/layout. Shared code remains the base. iOS success does not establish Android results.

### Machine readiness during planning

- Xcode 27.0 build 27A266a and `/Applications/Xcode.app/Contents/Applications/DeviceHub.app` exist. Configuration includes iPhone 11 / iOS 27.0.
- Installed-bundle inspection found neither Expo Go nor Moojot in that simulator. Prepare app startup before citing simulator evidence.
- PATH lacked adb/emulator. Checked standard locations lacked SDK/AVD. Custom paths remain possible. Inspect or prepare the actual environment in early work.
- Installed dependencies matched manifests: Expo 57.0.25, React Native 0.86.3, and related Expo packages. This does not establish successful Expo Go/build runs.
- Inspection read filesystem/config only. It did not boot simulators, open apps, install SDKs, or try native builds.

Every phase needs images and a primary-task walkthrough. For each read/write flow, check one failure and successful recovery. Check Thai, long text/amounts, large system text, light/dark, keyboard, closing/back navigation, and permissions. Preserve touch targets and entered data.

Run the repository Review Checklist and changed-workspace check-types scripts. Current `vp check` sets typeCheck:false. It does not replace type checks. Test changed results and important contract/database/scanner boundaries. Do not add tests that only repeat style constants.

## Prototype details requiring actual-system decisions

Network timers and seeds do not define an SLA or API contract. Use actual loading/error/empty/data states, mutation states, and draft recovery. Review onboarding/help/Profile alongside scanner changes. Their instructions must match automatic reading.

Use the 29 images as a screen-reference checklist. Missing sheet/error screenshots do not remove those flows. Inspect HTML/README for uncovered details. Store a versioned handoff in the repository when implementation starts. Later agents need the same reference set.

This document supports user review of order and scope. Representation, receipts, and effective scheduling are engineering decisions under these requirements. The user need not choose database types or endpoint names for developers.

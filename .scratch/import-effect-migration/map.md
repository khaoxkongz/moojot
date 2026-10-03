# Plan the Import API migration into Feature and Effect

Label: wayfinder:map

## Destination

Complete the decisions for moving the slip API into `packages/api/src/features/import/`. Every feature function uses Effect. The API automatically saves transactions for authenticated users. Retire the old statement/PDF API. Prepare the plan for implementation in the next round.

## Handed off

- The destination is complete. [Spec: Automatic slip import with Effect](../slip-auto-import-effect/spec.md) contains implementation tickets in its own directory.
- The separate `apps/native` work continues in [Spec: Adapt mobile Home to automatic slip import](../native-slip-auto-import/spec.md).

## Notes

- This round plans the work through Wayfinder. Implementation remains unchanged at this point.
- Scope covers the slip API that Home autoScan calls with one image per request. Include necessary `features/index.ts`, runtime, and server integration.
- Plan, review, and import screens do not call this new API. Updating `apps/native` falls outside scope. This decision accepts temporary incompatibility with old clients.
- API path, input, output, and error contracts may change.
- `features/import/import.route.ts`, `import.schema.ts`, `import.service.ts`, and `import.error.ts` are empty boilerplate. Existing logic lives in `packages/api/src/import/*`.
- At this point, import returns candidates for review without persistence. A candidate may lack date or amount. `FinanceTransaction` requires both.
- Sessions working on this map should use `grilling` and `domain-modeling`. Read all of `node_modules/effect/AGENTS.md` before writing Effect code, as required by the repository's `AGENTS.md`.
- The tracker uses local Markdown under `docs/agents/issue-tracker.md`. Child tickets live in `issues/`.

## Decisions so far

<!-- Add only resolved tickets. Include a summary and a link to the ticket's answer. -->

- [Define automatic persistence policy](issues/01-automatic-persistence-policy.md): Save complete candidates. Skip incomplete candidates or proven duplicates with reasons. Treat `issues` as warnings. Exclude `confidence`.
- [Define persistence ownership and partial results](issues/02-persistence-ownership-and-atomicity.md#answer): ImportService delegates creation to LedgerService. Home autoScan saves per image, uses asset ID for duplicate protection, and reports created/skipped/failed per image.
- [Define the authenticated automatic import API](issues/03-authenticated-import-api-contract.md#answer): `import.autoImportSlip` accepts an authenticated user's image and asset ID. It returns created or skipped results with reasons. The user assigns categories.
- [Define Effect boundaries for the Import Feature](issues/04-effect-service-boundaries.md#answer): ImportService orchestrates Effect work. Gemini/configuration use a Layer. LedgerService persists and checks duplicates. The route converts errors to oRPC.
- [Define Import capacity and failure policy](issues/05-import-resource-and-failure-policy.md#answer): An Effect Semaphore permits 2 Gemini calls and 2 waiters. Define deadlines, cancellation, image limits, and codes/retry that distinguish `skipped` outcomes from system errors.
- [Define migration evidence and retirement of the old Import API](issues/06-migration-proof-and-cutover.md#answer): Prove the API with fixtures/fakes and temporary MongoDB. Retire old routes/import/PDF code. Record temporary native incompatibility within scope.

## Not yet specified

## Out of scope

- Updating `apps/native` for the new API during this migration.
- Statement/PDF support in the new API, and calls from plan, review, or import screens.
- Editing or reversing slip-created transactions. Ticket [authenticated API contract](issues/03-authenticated-import-api-contract.md#answer) already defines required source input.
- Slip identity across devices. Retain `slip:<assetId>` and the limitations in [persistence ownership](issues/02-persistence-ownership-and-atomicity.md#answer).
- Migrating other features or redesigning Ledger as a whole.

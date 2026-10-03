# Define migration evidence and retirement of the old Import API

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: 02, 03, 04, 05

## Question

Which tests and fixtures prove the new slip API? How should migration retire `packages/api/src/import/*` and statement import? Define router, runtime, authentication/session, and middleware changes. Include normal results, damaged images, malformed AI output, repeated images, partial scan success, and proof independent of `apps/native` changes.

## Answer

### Migration completion

`import.autoImportSlip` is the only import operation in `appRouter`. `POST /rpc/import/slip/auto-import` requires a session. It returns created/skipped or errors under the earlier tickets. Old `POST /rpc/import/slip` and `POST /rpc/import/statement` return 404. No public slip/statement reading route remains.

This round hands over a migration plan. Implementation remains unchanged at this point.

### Evidence required before accepting implementation

#### 1. Deterministic fixtures and outcome fields

Add deterministic tests through `vp test`.

- Use small valid JPEG/PNG fixtures and empty, damaged, unsupported, or mismatched-MIME images.
- Gemini fixtures cover valid, empty, incomplete, malformed JSON/schema, unknown `kind`, and multiple candidates.
- Use controllable fake Gemini and time instead of live services in the automated gate.
- Assert `status`, `reason`, `transactionId`, `reasons`, `warnings`, HTTP status, and machine-readable `code`.
- Use the earlier contracts rather than Thai messages or uncertain OCR output.

#### 2. Service outcomes and error matrix

Prove image and `assetId` checks occur **before** Gemini.

- A `created` result has one row with `source: "slip"`, `categoryId: null`, `slipImageUri: null`, and `dedupeKey: slip:<assetId>`.
- Blank titles receive fallback/warning. AI `issues` remain nonblocking warnings.
- Absent or incomplete candidates return `skipped` with reasons without persistence.
- Malformed/multiple candidates return `AI_INVALID_RESPONSE` without persistence. AI/database failures remain errors rather than `skipped`.
- Cover 400, 401, 413, 415, 429, 5xx, and 504.
- Cover `Retry-After` for `BUSY`/`AI_RATE_LIMITED`.

#### 3. HTTP, authentication, headers, and configuration

Test Hono → RPC → `protectedProcedure` with a test user's session.

- Missing session returns 401. The request uses `userId` only from the session.
- Old routes return 404.
- Actual bodies over 14 MiB return `PAYLOAD_TOO_LARGE` before parsing.
- Retain `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`.
- Errors/logs exclude base64, keys, and raw AI output.
- Missing/malformed Gemini configuration prevents startup.
- Runtime configuration comes from a Layer rather than request context.

#### 4. Database identity and races

Use **test MongoDB isolated from real data** as the persistence gate.

- Prove first creation.
- Prove repeated `assetId` values return `skipped: duplicate` without another row/Gemini call.
- Prove duplicate protection after soft deletion.
- Identical `assetId` values across users remain separate.
- Different `assetId` values with identical transaction data remain independent.
- Concurrent same-key requests create one row. The other request returns duplicate.
- A unique conflict without the matching key returns persistence error.
- Retry after a lost post-commit response creates no extra row.

Fake Ledger cannot replace evidence for unique constraints or races.

#### 5. Queue, deadlines, cancellation, and independent images

Control clock/SDK for these cases:

- Gemini permits at most 2 active calls and 2 FIFO waiters.
- The fifth request or wait over 10 seconds returns `BUSY`.
- Cancellation releases permit/queue space.
- The 110/140-second timeouts distinguish `AI_TIMEOUT`/`IMPORT_TIMEOUT`.
- SDK retries stay disabled.
- Persistence cannot cause misleading timeout reports.

Send 3 independent images with `created`, `skipped`, and AI/database-error results.

- Saved transactions remain.
- Rollback never crosses images.
- Per-image results support created/skipped/failed counts.

This API proof does not require `apps/native`.

#### 6. Acceptance gates and live smoke

Pass these gates:

- `vp check`.
- `vp test`.
- `vp run --filter @moojot/api check-types`.
- `vp run --filter server check-types`.
- `vp run --filter server build`.
- The MongoDB evidence above.

After deployment, use a test account/data for live Gemini smoke checks of output and configuration.
Record live smoke separately from fixture gates.
Live smoke is not an automated gate because network, quota, and model output vary.

### Retirement sequence for the next implementation round

- Point `packages/api/src/features/index.ts` to `features/import/import.route.ts`. Compose Import/Gemini/configuration Layers in `createAppRuntime` once at server startup. Move Gemini key/model from oRPC `Context` to server startup configuration. Delete `geminiApiKey` from `packages/api/src/context.ts` and `apps/server/src/context.ts`.
- Delete session bypasses for `/rpc/import/slip` and `/rpc/import/statement` from `apps/server/src/context.ts`. Delete `/rpc/import/**` from evlog authentication exclusions so the new endpoint identifies authenticated users. Preserve native development CORS and import no-store/nosniff. Move the Hono 14 MiB body limit to `/rpc/import/slip/auto-import`. Delete the 28 MiB statement limit. Check 401/413 through actual HTTP.
- Retire `packages/api/src/import/procedures.ts`, `gemini.ts`, `result.ts`, `types.ts`, and `pdf-parse` when no remaining imports need them. Delete exposed `import.slip`/`import.statement` and PDF/password/model-override contracts from router/types. Preserve `source: "statement"` and historical statement rows in Ledger/schema/database for historical access. Retiring the API preserves user history. Check API/server dependencies and references afterward. Check old routes return 404.
- Existing `apps/native` Home autoScan and import/review still reference `client.import.slip`/`statement`. Native changes remain outside this migration under the map's scope. Expect `vp run --filter native check-types` and repository-wide `vp run check-types` to fail after old operations retire. Installed clients temporarily cannot import.

  Record the known incompatibility. Assign native adaptation to later work. Report actual repository results. API acceptance requires the API/server gates above without native changes.

No new uncertainty requires another ticket before implementation. Native adaptation and statement/PDF support already fall outside the map's scope.

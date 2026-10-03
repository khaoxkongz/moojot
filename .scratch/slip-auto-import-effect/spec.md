# Spec: Automatic slip import with Effect

Status: done

## Problem Statement

Home autoScan reads slips through a public Import API. The mobile app then creates `FinanceTransaction` in a separate request. Reading and persistence therefore lack one authenticated operation. The old result is an `Import Candidate` for review. Home autoScan needs created, skipped, or retryable outcomes instead. Old import code also sits outside the new Import Feature.

That code mixes slip import with statement/PDF import. Statement/PDF import falls outside the direction of this slip API.

## Solution

Add `import.autoImportSlip` for authenticated users. One request accepts one slip image and its asset ID. Gemini reads the image. The API saves a complete candidate as `FinanceTransaction` in the same request. It returns `created` with a transaction ID, `skipped` with a reason, or an error that guides client retry.

The Import Feature owns image reading and orchestration through Effect. Ledger owns transaction creation and duplicate identity checks. After proving the new API, retire the old slip and statement/PDF routes. Preserve saved statement transactions.

## User Stories

1. As an authenticated user, I want a slip image to create a finance transaction automatically. This avoids saving the same result manually.
2. As an authenticated user, I want a created result with its transaction ID. The app can then show and link the saved transaction.
3. As an authenticated user, I want each image request to create at most one transaction. A model response must not create extra entries silently.
4. As an authenticated user, I want an image without a visible transaction to return skipped with a reason. This distinguishes it from a system failure.
5. As an authenticated user, I want a candidate without a valid amount or date to return skipped with field reasons. This excludes incomplete ledger entries.
6. As an authenticated user, I want a blank title to receive a safe fallback title and warning. The entry remains usable while missing detail remains visible.
7. As an authenticated user, I want AI warnings and candidate issues in the result even after creation. This keeps uncertainty visible.
8. As an authenticated user, I want new transactions to have no category. I can then assign the category myself.
9. As an authenticated user, I want retry with the same asset ID to prevent another transaction. A lost response must not duplicate my ledger.
10. As an authenticated user, I want a deleted transaction to block automatic recreation from its asset ID. This respects my deletion.
11. As an authenticated user, I want different image assets treated independently even when extracted text matches. Similar data must not cause the system to skip a real transaction.
12. As an authenticated user, I want another user's asset ID to leave my import independent. Duplicate checks must remain within my account.
13. As an authenticated user, I want valid JPEG and PNG originals accepted. Unnecessary image conversion must not reduce readability.
14. As an authenticated user, I want specific codes for invalid or oversized images. The app can then correct input instead of retrying unchanged data.
15. As an authenticated user, I want temporary AI, queue, and database failures reported as errors. The app can retry that image later.
16. As an authenticated user, I want successful images preserved when another image fails. One failure must not reverse a whole scan.
17. As an authenticated user, I want results to distinguish created, skipped, and failed images. This keeps scan totals accurate.
18. As a user concerned about privacy, I want imports tied to my session and provider storage disabled. My document must remain specific to my account.
19. As a user concerned about privacy, I want errors and logs to exclude image bytes and secrets. This protects sensitive information.
20. As a Home autoScan developer, I want stable machine-readable outcome and error codes. Retry logic must remain independent of Thai messages.
21. As a Home autoScan developer, I want the server to derive dedupe keys from asset IDs. Clients cannot choose another user's transaction identity.
22. As a Home autoScan developer, I want the API to return the created transaction ID. A later native update can attach the local image to that entry.
23. As an operator, I want bounded Gemini concurrency and a short queue. One album burst must not exhaust server resources.
24. As an operator, I want startup to fail when Gemini configuration is missing. The server must not accept imports it cannot process.
25. As an operator, I want distinct upstream, timeout, and persistence errors. Diagnosis must not require private image data.
26. As an operator, I want deterministic HTTP and database tests. These tests prove the migration without live model output.
27. As a maintainer, I want old import routes retired after migration. This leaves one supported import behavior to maintain.
28. As a maintainer, I want historical statement transactions preserved. Retiring statement import must preserve users' financial history.

## Implementation Decisions

### Request and asset identity

- The sole new import operation is `import.autoImportSlip` at `POST /import/slip/auto-import`. Its RPC URL is `POST /rpc/import/slip/auto-import`.
- Use the protected procedure. Derive `userId` only from the session. One request contains one image and may create at most one transaction.
- Accept only `assetId`, `fileBase64`, and `mimeType` (`image/jpeg` or `image/png`). Reject client-supplied user ID, dedupe key, source, category, local URI, PDF password, and model choice. The server chooses Gemini model configuration.
- Treat `assetId` as an opaque identity. Require a nonempty value without leading/trailing whitespace or control characters. Limit it to 256 UTF-8 bytes. Preserve the value exactly.
- Construct `slip:<assetId>` on the server within the user's identity scope. Matching kind, amount, date, or title is insufficient evidence of duplication.
- Asset IDs cannot establish identity across devices. Retain the existing namespace for this migration.

### Image input

- Accept standard base64 file bytes without a data URI prefix or whitespace.
- Check encoded length before allocation. Check decoded length afterward.
- Empty input returns `FILE_REQUIRED`. Malformed base64 or detectable corruption returns `INVALID_FILE`. Decoded files over 10 MiB return `FILE_TOO_LARGE`.
- Hono rejects HTTP JSON bodies over 14 MiB before RPC parsing.
- Check JPEG/PNG signatures against the declared MIME type.
- The later client update should send the original image when it meets the limit. Resize only when necessary. Preserve readable text.

### Gemini and Effect boundaries

- Gemini uses an Effect provider and a shared Layer. Configuration remains constant after server startup.
- The provider sends a slip-only prompt and response schema. It uses `store: false`, disables SDK retries, and requests at most one candidate.
- Keep the API key outside request context. Missing or invalid local configuration prevents startup.
- The Import Service uses Effect for request/image checks, the initial Ledger duplicate check, Gemini extraction, untrusted decoding, qualification, creation, and outcome mapping.
- Import Feature helpers return Effect. The oRPC handler is the sole Promise boundary and Effect-to-oRPC error adapter.
- Use Effect Schema for request, result, untrusted model response, and candidate shapes.

### Candidate qualification

A complete candidate has:

- Kind `expense`, `income`, or `transfer`.
- A positive safe integer `amountSatang`.
- A real ISO `occurredOn` date.
- A nonempty title.

A blank title becomes “รายการจากสลิป” (transaction from a slip) with a warning. A missing or invalid required amount/date returns `skipped: incomplete_candidate` with field reasons. AI `issues` and document warnings remain warnings. They cannot block a complete candidate. The contract neither computes, stores, nor returns `confidence`.

An empty candidate array returns `skipped: no_candidate`. Multiple candidates, invalid JSON/structure, unknown kind, or absent parseable output returns `AI_INVALID_RESPONSE`. Reject the response as a whole. Never select its first item or discard malformed candidates silently.

### Ledger persistence and results

- Ledger is the only `FinanceTransaction` writer. It retains existing data checks and user binding.
- Created rows use `source = slip`, `categoryId = null`, and `dedupeKey = slip:<assetId>`. They contain no server-side slip image URI. Category assignment belongs to the user rather than AI.
- Ledger exposes a per-user identity lookup that includes rows it marks as deleted. An initial match can avoid Gemini.
- The unique `(userId, dedupeIdentity)` constraint decides concurrent conflicts. After a create conflict, query that exact identity again.
- Only a matching key returns `skipped: duplicate`. Every other conflict is a persistence error.
- Retry after a lost post-commit response can use the same asset ID without creating another transaction.
- `created` contains `transactionId` and `warnings`. `skipped` contains `reason`, `reasons`, and `warnings`. Its reason is `duplicate`, `no_candidate`, or `incomplete_candidate`.
- Skipped images create no transaction. Reading and persistence failures remain in the error channel.
- Several images use independent requests with results per image. Successful requests remain saved when another fails. There is no rollback across images.

### Error contract

Use typed oRPC errors with stable machine codes and HTTP status:

| HTTP | Codes                                                                  |
| ---: | ---------------------------------------------------------------------- |
|  401 | `UNAUTHORIZED`                                                         |
|  400 | `INVALID_REQUEST`, `INVALID_ASSET_ID`, `FILE_REQUIRED`, `INVALID_FILE` |
|  413 | `PAYLOAD_TOO_LARGE`, `FILE_TOO_LARGE`                                  |
|  415 | `UNSUPPORTED_IMAGE`, `UNSUPPORTED_FILE`                                |
|  429 | `BUSY`, `AI_RATE_LIMITED`                                              |
|  502 | `AI_INVALID_RESPONSE`, `AI_UPSTREAM_ERROR`                             |
|  503 | `AI_UNAVAILABLE`, `PERSISTENCE_UNAVAILABLE`                            |
|  504 | `AI_TIMEOUT`, `IMPORT_TIMEOUT`                                         |
|  500 | `PERSISTENCE_FAILED`, `IMPORT_FAILED`                                  |

Map schema failures to the specific input code when one exists. A 429 response includes a valid `Retry-After`. Use 30 seconds for `BUSY`.

### Capacity, deadlines, and cancellation

- Share one Effect Semaphore per server instance. Permit two active Gemini calls and two FIFO waiters.
- Enter after input checks and the initial duplicate check. The permit covers only the model call.
- Wait at most 10 seconds. A full or expired queue returns `BUSY`. Cancellation releases queue space or the permit.
- Multiple server instances may still reach model quota. That case returns `AI_RATE_LIMITED`.
- Gemini times out after 110 seconds with `AI_TIMEOUT`.
- The overall 140-second deadline starts at handler entry and ends just before Ledger creation. Other deadline expiry before persistence returns `IMPORT_TIMEOUT`.
- Disconnection cancels queued/model work and prevents a new write.
- After database creation starts, await its real result despite disconnection or expiry of the deadline before persistence. Never report a timeout that might hide a commit.

### Retry and migration

- The server does not retry Gemini or Ledger automatically.
- The later Home autoScan update should retry `BUSY`, `AI_RATE_LIMITED`, and 5xx/504 on a later scan. Use the same asset ID.
- Wait at least 30 seconds. Apply exponential backoff with jitter, capped at 15 minutes. Respect any longer valid `Retry-After`.
- Unchanged 401/400/413/415 input and skipped results do not qualify for automatic retry.
- Retire old public slip and statement/PDF operations and their unused parsing dependency at migration.
- Delete the import session bypass. Include import requests in normal user identification.
- Move the 14 MiB body guard to the new path. Preserve native development CORS and import `no-store`/`nosniff` headers.
- Preserve historical statement source values and rows in Ledger/storage.
- API/server migration is separate from the native caller. Existing Home autoScan and import/review screens call retired operations until a later native update.
- API/server acceptance may pass while native and repository type checks fail from that known incompatibility. Record the limitation when assessing application compatibility.

## Testing Decisions

### Test boundary

Test externally visible behavior rather than private helper order. Use HTTP through Hono, RPC, authentication, Import Feature, and Ledger into an isolated test MongoDB. Inject deterministic fake Gemini at the Layer boundary. Control time where needed. This boundary proves outcomes, statuses/codes, authentication, headers, persistence, and migration.

Narrow Ledger tests cover unique-index races and soft deletion. A fake database cannot prove those guarantees. No existing Import API suite provides direct examples. Reuse repository Effect service conventions, oRPC routing, and `vp test`. Introduce the HTTP fixture harness once.

### Input and model fixtures

- Cover valid JPEG/PNG, empty/malformed bytes, unsupported/mismatched signatures, oversized encoded/decoded payloads, invalid asset IDs, and absent sessions.
- Assert specific 400/401/413/415 codes. Rejected input must not call Gemini.
- Cover complete/absent candidates, missing/invalid amount or date, blank title, warnings/issues, malformed JSON/schema, unknown kind, and multiple candidates.
- Save only complete candidates. Wrong model output returns `AI_INVALID_RESPONSE` without persistence.

### Database and timing evidence

- Prove one created row and its fields in MongoDB. Cover repeated keys without another Gemini call, soft-deleted duplicates, user isolation, and independent asset IDs with identical fields.
- Cover concurrent same-key requests, unrelated unique conflicts, and retry after a committed write loses its response.
- Prove two active calls, two FIFO waiters, and `BUSY` for the fifth request or a 10-second wait.
- Prove cancellation cleanup, 110/140-second timeout codes, disabled SDK retries, and no timeout after persistence starts.
- Use three independent image requests to prove created/skipped/error counts and no rollback across requests.

### HTTP, privacy, and acceptance gates

- Old import URLs return 404. The new path requires a session.
- `PAYLOAD_TOO_LARGE` occurs before RPC parsing. Responses retain `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`.
- Errors/logs exclude image bytes, API keys, raw model output, and database details.
- Startup rejects missing or malformed model configuration.
- Acceptance requires `vp check`, `vp test`, API/server type checks, server build, and isolated MongoDB tests.
- Record a live Gemini smoke test with test data after deployment separately. Model output and network access are nondeterministic.
- Record native/repository type failures caused solely by retired import operations as known later work. Report their actual result.

## Out of Scope

- Updating `apps/native` Home autoScan, import/review, plan screens, local image binding, scan totals, or retry scheduling in this migration.
- New statement/PDF import, PDF passwords, manual review candidates, or an import UI.
- Identity across devices, broader Ledger redesign, other Effect migrations, transaction editing, or undo flows.
- Changing or deleting previously saved statement transactions.

## Further Notes

- Source decisions: [wayfinder map](../import-effect-migration/map.md) and its six resolved decision tickets. Later decisions narrowed the first policy ticket's statement wording to **slip-only** scope.
- API migration intentionally breaks installed callers of retired operations until the separate native update. The map records this product trade-off.
- This build spec uses a separate feature directory. Its implementation tickets start at `01` without overwriting the six resolved decision tickets.

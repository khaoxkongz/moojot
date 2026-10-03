# Define Import capacity and failure policy

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: 03, 04

## Question

How should `import.autoImportSlip` enforce its 10 MiB decoded JPEG/PNG limit and 14 MiB JSON payload limit? What limits apply to concurrency, timeouts, cancellation, and candidate count? Specify codes, HTTP status, and retry for images, Gemini, Schema, and database failures. Preserve the distinction between skipped outcomes and request/system errors from [authenticated API contract](03-authenticated-import-api-contract.md#answer).

## Answer

### Input limits

Hono enforces the actual 14 MiB HTTP JSON body limit on `/rpc/import/slip/auto-import` before oRPC parsing. Oversized bodies return `PAYLOAD_TOO_LARGE` (413). Use an error shape whose `code` the client can read.

`fileBase64` must be standard file base64 without data URI prefix, whitespace, or other characters. Check length before allocating a Buffer. Check decoded byte count afterward. The decoded file limit is 10 MiB.

- Empty image: `FILE_REQUIRED`.
- Invalid base64 or detectable corruption: `INVALID_FILE`.
- Unsupported JPEG/PNG signature: `UNSUPPORTED_IMAGE`.
- Signature mismatched with `mimeType`: `UNSUPPORTED_FILE`.

`assetId` is opaque. Require a nonempty trimmed value, at most 256 UTF-8 bytes, without control characters. Reject leading/trailing whitespace instead of silently changing the ID. Preserve exact `slip:<assetId>` identity.

### Concurrency and queue

Limit Gemini to **2 calls per server instance**. Create one shared Effect `Semaphore` in Layer/runtime. The permit covers only the Gemini call. Release it on success, failure, timeout, or cancellation.

After input/image checks and the initial duplicate check, allow **2 FIFO waiters** for at most **10 seconds**. A full queue or expired wait returns `BUSY` (429) with `Retry-After: 30`. Bound the waiters rather than allowing an unlimited `Semaphore` queue. Disconnection while waiting releases queue space.

The limit applies within one instance. Multiple instances may still reach Gemini quota, which returns `AI_RATE_LIMITED`. Use Effect's existing primitives rather than adding `p-limit`. The later Home autoScan client should also bound concurrent images to reduce `BUSY` on days with many images.

### Deadlines and cancellation

Gemini has a **110-second timeout per call**. The overall deadline is **140 seconds from handler entry until just before `LedgerService.createTransaction`**. It includes queue time, checks, and Gemini work. Timeout during Gemini returns `AI_TIMEOUT` (504). Deadline expiry in another step before persistence returns `IMPORT_TIMEOUT` (504).

Disable Gemini SDK retries explicitly. The installed `interactions.create` version retries by default. Otherwise, the 110-second interval could contain multiple attempts.

Client disconnection cancels queue/Gemini work and prevents a new write. After creation starts, await the real database result despite disconnection or expiry of the deadline before persistence. Do not timeout the database Effect and falsely report failure when a commit may occur. Retry after a lost post-commit response returns `skipped: duplicate` with the same asset ID.

The later client should use a timeout longer than the server deadline. Client changes remain outside this migration.

### Candidate count

Prompt/schema request at most 1 candidate. Runtime checks the count again before persistence.

- A valid empty array returns `skipped: no_candidate`.
- One structurally valid but incomplete candidate returns `skipped: incomplete_candidate`.
- Multiple candidates, malformed JSON/schema, unknown `kind`, or absent parseable output returns `AI_INVALID_RESPONSE` (502).

Reject invalid output as a whole instead of choosing the first candidate or saving part of it. A blank title retains the fallback and warning from [Effect boundaries](04-effect-service-boundaries.md#answer).

### Error contract

The route maps tagged Effect errors to oRPC code/status. Body-limit middleware uses a compatible error shape. Messages/logs exclude base64, Gemini keys, raw AI output, and database details from client output. `skipped` is a normal outcome rather than an HTTP error.

| Case                                                                | Code                            | HTTP | Automatic retry of the same image                             |
| ------------------------------------------------------------------- | ------------------------------- | ---: | ------------------------------------------------------------- |
| Missing session                                                     | `UNAUTHORIZED`                  |  401 | After authentication only.                                    |
| Other malformed JSON/input                                          | `INVALID_REQUEST`               |  400 | After input correction only.                                  |
| Empty or invalid asset ID                                           | `INVALID_ASSET_ID`              |  400 | After input correction only.                                  |
| Missing image                                                       | `FILE_REQUIRED`                 |  400 | After supplying an image only.                                |
| Invalid base64 or detectable corruption                             | `INVALID_FILE`                  |  400 | After file correction only.                                   |
| Body over 14 MiB                                                    | `PAYLOAD_TOO_LARGE`             |  413 | After reducing payload only.                                  |
| Decoded bytes over 10 MiB                                           | `FILE_TOO_LARGE`                |  413 | After reducing image size only.                               |
| Signature outside JPEG/PNG                                          | `UNSUPPORTED_IMAGE`             |  415 | After supplying a supported image only.                       |
| Signature/MIME mismatch                                             | `UNSUPPORTED_FILE`              |  415 | After correcting MIME/file only.                              |
| Full queue or wait over 10 seconds                                  | `BUSY`                          |  429 | Later scan after `Retry-After`.                               |
| Gemini 429                                                          | `AI_RATE_LIMITED`               |  429 | Later scan after `Retry-After`.                               |
| Gemini timeout/408 or deadline before persistence                   | `AI_TIMEOUT` / `IMPORT_TIMEOUT` |  504 | Later scan.                                                   |
| Invalid Gemini JSON/schema or more than 1 candidate                 | `AI_INVALID_RESPONSE`           |  502 | Later scan.                                                   |
| Other Gemini 4xx without proven invalid input                       | `AI_UPSTREAM_ERROR`             |  502 | Later scan. Notify the operator to check configuration/model. |
| Gemini network/5xx                                                  | `AI_UNAVAILABLE`                |  503 | Later scan.                                                   |
| Ledger/database connection failure or timeout                       | `PERSISTENCE_UNAVAILABLE`       |  503 | Later scan with the same asset ID.                            |
| Other Ledger/database failure, including a nonmatching-key conflict | `PERSISTENCE_FAILED`            |  500 | Later scan with the same asset ID. Notify the operator.       |
| Unexpected defect                                                   | `IMPORT_FAILED`                 |  500 | Later scan. Notify the operator.                              |

Missing/malformed configuration prevents startup before requests, as specified in [Effect boundaries](04-effect-service-boundaries.md#answer). Google rejection of key/model during a real call returns `AI_UPSTREAM_ERROR` and notifies the operator. A failed database duplicate lookup returns a persistence error before Gemini.

A unique conflict returns `skipped: duplicate` **only** after Ledger finds the same user's `slip:<assetId>`, including soft-deleted rows. Other conflicts remain errors. Valid AI output without a transaction, or with incomplete data, returns skipped under the contract despite warnings/issues.

### Retry policy

The server does not retry Gemini or Ledger automatically. Disable SDK retries. The later Home autoScan client retries only `BUSY`, `AI_RATE_LIMITED`, and 5xx/504 in a **later scan**. Avoid immediate repeated requests within the same scan. Always retain the asset ID.

Wait at least 30 seconds before retry. Repeated failures per asset use exponential backoff with jitter, capped at 15 minutes. For 429, respect a valid `Retry-After` longer than that interval. Check the value before use.

Unchanged 401/400/413/415 input and skipped outcomes do not qualify for automatic retry. Several images retain independent requests and results. One image's error does not reverse another image's transaction.

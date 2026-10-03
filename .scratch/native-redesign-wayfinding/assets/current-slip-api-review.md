# Current slip API and mobile outcome memory

Inspected the codebase on 1 October 2569 (2026), at the user's request. Pending “ต้องช่วยหมู” (needs help) retention across rounds was still undecided.

## Findings from code

The system already reads and saves one slip image at a time. Mobile outcome memory is separate per account. The server currently has no endpoint listing pending or failed slip-reading work.

| Function             | App endpoint                        | Behavior                                                                                                             |
| -------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Read and save a slip | `POST /rpc/import/slip/auto-import` | The API accepts one image. It checks input and reads through AI. It creates an entry when required data is complete. |
| Read saved entries   | `POST /rpc/ledger/listTransactions` | Read ledger entries, including `source: slip` filters and `limit`/`offset` pages.                                    |
| Check server         | `GET /`, `POST /rpc/healthCheck`    | Return `OK`.                                                                                                         |
| API reference        | `GET /api-reference/spec.json`      | Generate OpenAPI for exposed router routes. The reference excludes import.                                           |

The server mounts import RPC through special object keys. Native transport uses the same keys. Use the path above. Do not infer `/rpc/import/autoImportSlip` from the method name.

Evidence: [server app](../../../apps/server/src/app.ts), [native transport](../../../apps/native/features/slips/auto-import/transport.ts), [import route](../../../packages/api/src/features/import/import.route.ts), [ledger routes](../../../packages/api/src/features/ledger/ledger.route.ts).

## Input and outcomes

Input contains `assetId`, `fileBase64`, and `mimeType`, supporting JPEG/PNG. It requires the signed-in user's session.

Successful requests have two outcomes:

- `created`: saved entry, with `transactionId` and `warnings`.
- `skipped`: no new entry, with `reason`, `reasons`, and `warnings`. Reasons are `duplicate`, `no_candidate`, or `incomplete_candidate`.

`incomplete_candidate` means missing or invalid amount/date. It is not a network error. The current app remembers it as `skipped`. It normally avoids rereading the image unless the image changes. The redesign must classify it as needing manual help. Other skipped outcomes can require no action.

`BUSY`/`AI_RATE_LIMITED` errors use 429 and `Retry-After`. Upstream, timeout, and persistence errors have separate codes. Mobile code uses these codes to distinguish retry from rejected outcomes.

The server deduplicates `slip:${assetId}` within each account. It checks identity before reading and conflicts again during writes. Resending an image should not create another entry.

Evidence: [input/outcome schema](../../../packages/api/src/features/import/import.schema.ts), [import errors](../../../packages/api/src/features/import/import.error.ts), [import service](../../../packages/api/src/features/import/import.service.ts), [candidate qualification](../../../packages/api/src/features/import/candidate.ts).

## Mobile memory and current limits

- Store `saved`, `duplicate`, `skipped`, `rejected`, and `retry` per asset ID in `moojot-slip-scan-v1.<account>.json`. Keep accounts separate.
- This memory file contains no image, session, or AI text result.
- Retry stores attempt count, next reading time, and error code. Reading resumes in an eligible round after the retry time.
- Discovery scans supported albums for 30 days. It deletes memory records absent from discovery, except retries still awaiting their next time. This is not work retention until user completion.
- `lastRound` is an in-memory summary. A finished new round replaces it. Home shows reading/animation/access, without the redesign's pending-work screen.
- New images require Home focus and an active app. Navigation or suspension stops scheduling. Already-sent requests can finish.

Evidence: [native adapter/storage](../../../apps/native/features/slips/auto-import/index.ts), [scan memory](../../../apps/native/features/slips/auto-import/scan-memory.ts), [scan session](../../../apps/native/features/slips/auto-import/scan-session.ts), [discovery](../../../apps/native/features/slips/auto-import/discovery.ts), [Home eligibility](../../../apps/native/features/slips/auto-import/home-scan.ts).

## Redesign consequences and questions open at inspection

- Reuse existing reading, saving, and deduplication.
- Expose reading outcomes to UI. Separate skip reasons into “ต้องช่วยหมู” (needs help) and “ข้ามไป” (skipped).
- Manual entry from incomplete results must link the image and completion state. Prevent renewed pending work or duplicate recording.
- If retaining unresolved work, store it separately from the 30-day discovery cleanup. Include missing-image and changed-permission cases.
- Cross-round retention and mobile/server storage remained undecided. The user requested system inspection before answering.

## Additional runtime evidence

Before the user chose code inspection, this checkout's development server ran without a session:

- Both health routes returned 200/OK.
- `ledger/listTransactions` and import returned 401/UNAUTHORIZED.
- OpenAPI returned 200 with 52 documented paths. It excluded import, matching code.
- Trial path `/rpc/import/listResults` returned 404. Router inspection primarily established the missing results endpoint. A guessed path's 404 alone did not establish it.

These checks establish exposed routes, session enforcement, and API documentation. They do not establish successful slip reading or signed-in entry queries. No complete Device Hub app flow ran. Inspection finished through the codebase, as the user chose.

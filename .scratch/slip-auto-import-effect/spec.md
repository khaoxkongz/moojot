# Spec: นำเข้าสลิปอัตโนมัติด้วย Effect

Status: done

## Problem Statement

Home autoScan อ่านสลิปผ่าน Import API ที่เปิดเป็น public แล้วให้แอปมือถือสร้าง `FinanceTransaction` แยกอีกคำขอหนึ่ง ขอบเขตการอ่านและบันทึกจึงไม่ใช่คำสั่งเดียวที่ผูกกับผู้ใช้ ผลเดิมเป็น `Import Candidate` สำหรับตรวจทาน ทั้งที่ Home autoScan ต้องการผลว่าบันทึกแล้ว ข้าม หรือควรลองใหม่ โค้ด import เดิมยังอยู่ต่างที่จาก Import Feature ใหม่และปะปนกับ statement/PDF ซึ่งอยู่นอกทิศทางของ API สลิปนี้

## Solution

เพิ่ม API `import.autoImportSlip` สำหรับผู้ใช้ที่เข้าสู่ระบบ: รับภาพสลิปหนึ่งรูปกับ asset ID อ่านด้วย Gemini แล้วบันทึก **รายการพร้อมบันทึก** เป็น `FinanceTransaction` ในคำขอเดียว ผลตอบกลับบอกทันทีว่า `created` พร้อม transaction ID, `skipped` พร้อมเหตุผล หรือเป็นข้อผิดพลาดที่แอปใช้ตัดสินใจลองใหม่ได้ บริการอ่านภาพและลำดับงานอยู่ใน Import Feature ด้วย Effect; Ledger เป็นเจ้าของการสร้างรายการและการตรวจอัตลักษณ์ซ้ำ หลังพิสูจน์ API ใหม่แล้วถอด import route สลิปและ statement/PDF เดิม โดยเก็บรายการ statement ที่เคยบันทึกไว้

## User Stories

1. As an authenticated user, I want my slip image to create a finance transaction automatically, so that I do not need to save the same result manually.
2. As an authenticated user, I want a clear created result with its transaction ID, so that the app can show and link the saved transaction.
3. As an authenticated user, I want one image request to create at most one transaction, so that a model response cannot silently create extra entries.
4. As an authenticated user, I want a slip with no visible transaction to be skipped with a reason, so that I do not mistake it for a system failure.
5. As an authenticated user, I want a candidate without a valid amount or date to be skipped with field reasons, so that an incomplete entry does not enter my ledger.
6. As an authenticated user, I want a valid candidate with an empty title to receive a safe fallback title and warning, so that the entry remains usable without hiding missing detail.
7. As an authenticated user, I want AI warnings and candidate issues in the result even when an entry is created, so that uncertainty is visible.
8. As an authenticated user, I want the new transaction uncategorized, so that I can assign its category myself.
9. As an authenticated user, I want a retry with the same asset ID to avoid creating another transaction, so that a lost response does not duplicate my ledger.
10. As an authenticated user, I want a deleted transaction to keep blocking automatic recreation from the same asset ID, so that my deletion is respected.
11. As an authenticated user, I want different image assets treated independently even when their extracted text matches, so that the system does not discard a real transaction by guessing.
12. As an authenticated user, I want another user's asset ID not to block my own import, so that duplicate checks stay within my account.
13. As an authenticated user, I want valid JPEG and PNG originals accepted, so that unnecessary image conversion does not reduce readability.
14. As an authenticated user, I want invalid or oversized images rejected with specific codes, so that the app can correct the input instead of retrying unchanged data.
15. As an authenticated user, I want temporary AI, queue, and database failures reported as errors, so that the app can retry the affected image later.
16. As an authenticated user, I want successful images preserved when another image fails, so that one failure does not undo a whole scan.
17. As an authenticated user, I want the result to distinguish created, skipped, and failed images, so that scan totals are accurate.
18. As a privacy conscious user, I want import requests tied to my session and the model call not stored by the provider, so that my document is processed for my account only.
19. As a privacy conscious user, I want image bytes and secrets omitted from error responses and logs, so that sensitive information is not exposed.
20. As a Home autoScan developer, I want stable machine readable outcome and error codes, so that retry logic does not depend on Thai message text.
21. As a Home autoScan developer, I want the server to generate the dedupe key from an asset ID, so that client code cannot choose another user's transaction identity.
22. As a Home autoScan developer, I want the API to return a transaction ID after creation, so that a later native update can attach the local image to the saved entry.
23. As an operator, I want bounded concurrent Gemini calls and a short queue, so that one burst of album images does not exhaust server resources.
24. As an operator, I want startup to fail for missing Gemini configuration, so that the server does not accept imports it cannot process.
25. As an operator, I want distinct upstream, timeout, and persistence errors, so that failures can be diagnosed without inspecting private image data.
26. As an operator, I want deterministic HTTP and database tests, so that the API migration can be verified without relying on live model output.
27. As a maintainer, I want old import routes removed after cutover, so that there is one supported import behavior to maintain.
28. As a maintainer, I want historical statement transactions preserved, so that removing statement import does not erase a user's financial history.

## Implementation Decisions

- The sole new import operation is `import.autoImportSlip` at `POST /import/slip/auto-import` (RPC URL `POST /rpc/import/slip/auto-import`). It uses the protected procedure and derives `userId` only from the session. One request contains one image and may create at most one transaction.
- Input contains only `assetId`, `fileBase64`, and `mimeType` (`image/jpeg` or `image/png`). Reject client supplied user ID, dedupe key, source, category, local URI, PDF password, and model choice. The server chooses the Gemini model from configuration.
- `assetId` is an opaque identity: nonempty, no leading or trailing whitespace, no control characters, and at most 256 UTF-8 bytes. Keep it unchanged. Build the per-user key `slip:<assetId>` server side. Do not infer duplicates from matching kind, amount, date, or title. Asset IDs do not establish cross-device identity; retain the existing namespace for this migration.
- Accept standard base64 of the file bytes only, with no data URI prefix or whitespace. Check encoded length before allocation and decoded length afterward. Empty image gives `FILE_REQUIRED`; malformed base64 or detectably corrupt image gives `INVALID_FILE`; decoded images over 10 MiB give `FILE_TOO_LARGE`. The Hono server rejects HTTP JSON bodies over 14 MiB before RPC parsing. Confirm JPEG/PNG signatures and their declared MIME type. The client follow-up should send the original while under the limit and resize only when necessary, preserving readable text.
- Gemini is an Effect provider with a shared Layer and configuration fixed at server startup. The provider sends a slip-only prompt and response schema, uses `store: false`, disables SDK retries, and requests at most one candidate. No request context carries the API key. Missing or invalid local configuration prevents startup.
- The Import Service runs request validation, image validation, a Ledger duplicate lookup, Gemini extraction, untrusted response decoding, candidate qualification, Ledger creation, and final outcome mapping as Effect work. Helpers owned by the Import Feature return Effect; the oRPC handler is the single Promise boundary and the single Effect-to-oRPC error adapter.
- Use Effect Schema for request, result, untrusted model response, and candidate shapes. Empty candidate array means `skipped: no_candidate`. More than one candidate, invalid JSON/structure, unknown kind, or no parseable response means `AI_INVALID_RESPONSE`; never select the first item or silently drop a malformed one.
- A **รายการพร้อมบันทึก** has kind `expense`, `income`, or `transfer`; a positive safe integer `amountSatang`; a real ISO `occurredOn` date; and a nonempty title. A blank title becomes “รายการจากสลิป” with a warning. An absent or invalid required amount/date makes `skipped: incomplete_candidate` with field reasons. AI `issues` and document warnings remain warnings and never gate a complete candidate. Do not compute, store, or return `confidence`.
- Ledger remains the only writer of `FinanceTransaction` and applies its existing validation and user binding. Created rows have `source = slip`, `categoryId = null`, no server side slip image URI, and `dedupeKey = slip:<assetId>`. No AI category inference occurs.
- Ledger exposes a per-user identity lookup that includes soft-deleted rows. A preflight lookup can avoid another model call; the existing unique `(userId, dedupeIdentity)` constraint is authoritative under concurrency. After a create conflict, look up that exact identity again. Only a found matching key becomes `skipped: duplicate`; every other conflict is a persistence error. A lost response after commit can be retried using the same asset ID.
- Success has two tagged forms: `created` carries `transactionId` and `warnings`; `skipped` carries `reason` (`duplicate`, `no_candidate`, or `incomplete_candidate`), `reasons`, and `warnings`. Skipped images create no transaction. Reading or writing failures stay in the error channel. Several images are several independent requests with best effort results and no cross-image rollback.
- Use typed oRPC errors with stable machine codes and HTTP status: `UNAUTHORIZED` 401; `INVALID_REQUEST`, `INVALID_ASSET_ID`, `FILE_REQUIRED`, `INVALID_FILE` 400; `PAYLOAD_TOO_LARGE`, `FILE_TOO_LARGE` 413; `UNSUPPORTED_IMAGE`, `UNSUPPORTED_FILE` 415; `BUSY`, `AI_RATE_LIMITED` 429; `AI_INVALID_RESPONSE`, `AI_UPSTREAM_ERROR` 502; `AI_UNAVAILABLE`, `PERSISTENCE_UNAVAILABLE` 503; `AI_TIMEOUT`, `IMPORT_TIMEOUT` 504; `PERSISTENCE_FAILED`, `IMPORT_FAILED` 500. Schema failures must map to the more specific input code where defined. The 429 responses include a valid `Retry-After` value, using 30 seconds for `BUSY`.
- Share one Effect Semaphore per server instance: two active Gemini calls and two FIFO waiters. Enter after validation and preflight duplicate lookup; permit covers only the model call. Wait no longer than 10 seconds. Full or expired queue returns `BUSY`, and cancellation releases queue space or permit. Multiple server instances may still hit model quota and then return `AI_RATE_LIMITED`.
- Gemini calls time out after 110 seconds. The overall 140 second deadline runs from handler start until just before Ledger creation; Gemini timeout is `AI_TIMEOUT`, and other pre-write deadline expiry is `IMPORT_TIMEOUT`. Disconnect cancels queued or model work and prevents a new write. Once database creation starts, await its real result despite disconnect or expired pre-write deadline; never report a timeout that might hide a commit.
- Server does not retry Gemini or Ledger automatically. The later Home autoScan update should retry `BUSY`, `AI_RATE_LIMITED`, and 5xx/504 on a later scan using the same asset ID, with at least 30 seconds delay, exponential backoff and jitter capped at 15 minutes, and any longer valid `Retry-After`. It should not retry unchanged 401/400/413/415 inputs or skipped results.
- Remove the old public slip and statement/PDF import operations and their unused parsing dependency at cutover. Remove the import session bypass, include import requests in normal user identification, move the 14 MiB body guard to the new path, and preserve native development CORS and import `no-store`/`nosniff` headers. Keep historical statement source values and rows in Ledger and storage.
- API/server migration is scoped separately from the native caller. Existing Home autoScan and import/review screens continue to call removed operations until a follow-up native change. The API/server acceptance gate may pass while native and repo-wide type checks fail from that known incompatibility; do not claim full application compatibility.

## Testing Decisions

- Test externally visible behavior, not the private order of helper calls. The primary seam is an HTTP request through Hono, RPC, authentication, the Import Feature, and Ledger into an isolated test MongoDB. Inject a deterministic fake Gemini provider at the Layer boundary and controlled time where needed. This one seam verifies outcomes, status/codes, authentication, headers, persistence, and cutover. Narrow Ledger tests cover unique-index races and soft deletion because a fake database cannot prove those guarantees.
- No current Import API test suite provides direct prior art. Reuse the repository's Effect service and oRPC routing conventions and `vp test` runner; introduce the HTTP fixture harness once rather than duplicating test helpers across layers.
- Fixture cases cover valid JPEG/PNG, empty and malformed bytes, unsupported and mismatched signatures, oversized encoded/decoded payloads, invalid asset IDs, and missing session. Assert specific 400/401/413/415 codes and that rejected inputs never call Gemini.
- Fake model cases cover one complete candidate, no candidates, missing/invalid amount or date, blank title, warnings/issues, malformed JSON or schema, unknown kind, and more than one candidate. Assert only the completed candidate is saved and that wrong model output produces `AI_INVALID_RESPONSE` without a write.
- The MongoDB test database verifies one created row and fields, repeated keys without a second Gemini call, soft-deleted duplicates, user isolation, different asset IDs with identical extracted fields, concurrent same-key requests, unrelated unique conflicts, and retry after a committed write whose response was lost.
- Controlled model timing verifies two active calls, two FIFO waiters, a fifth request or 10-second wait yielding `BUSY`, cancellation cleanup, 110/140-second timeout codes, no SDK retry, and the no-timeout-after-write rule. Three independent image requests prove created/skipped/error counts and no cross-request rollback.
- HTTP tests also verify old import URLs return 404, the new path requires a session, `PAYLOAD_TOO_LARGE` occurs before RPC parsing, and import responses retain `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`. Error responses and logs must omit image bytes, API keys, raw model output, and database details. Startup tests reject missing or malformed model configuration.
- Acceptance gates are `vp check`, `vp test`, the API and server type checks, the server build, and the isolated MongoDB test suite. A live Gemini smoke test with test data after deployment is recorded separately because model output and network access are nondeterministic. Native and repo-wide type failures caused solely by removed import operations are recorded as known follow-up work, not reported as passing.

## Out of Scope

- Updating `apps/native` Home autoScan, import/review, plan screens, local image binding, scan totals, or its retry scheduler in this migration.
- New statement/PDF import, PDF passwords, manual review candidates, or an import UI.
- A cross-device slip identity scheme; broad Ledger redesign; migration of other features to Effect; transaction editing or undo flows.
- Changing or deleting previously saved statement transactions.

## Further Notes

- Source decisions: [wayfinder map](../import-effect-migration/map.md) and its six resolved decision tickets. Later decisions narrowed the first policy ticket's statement wording to **slip-only** scope.
- The API cutover intentionally breaks installed callers that still use the removed operations until the separate native follow-up lands. This is an explicit product trade-off already recorded in the map.
- The tracker for this build spec is a separate feature directory so new implementation tickets can start at `01` without overwriting the six resolved wayfinder decision tickets.

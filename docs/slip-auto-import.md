# Slip auto-import migration

The supported operation is `import.autoImportSlip`, sent to **POST /rpc/import/slip/auto-import**.
It requires the normal signed-in session and `X-CSRF-Token: orpc`. The RPC body is
`{ "json": { "assetId": "...", "fileBase64": "...", "mimeType": "image/jpeg" } }`.
PNG is also supported. The server chooses the owner, model, source and duplicate identity.

An HTTP 200 response contains either `json.status = created` with `transactionId` and
`warnings`, or `json.status = skipped` with `reason`, `reasons` and `warnings`.
Incomplete-candidate reasons identify `amountSatang` or `occurredOn` with code
`required_or_invalid`. Other errors carry the stable `json.code` documented in
`packages/api/src/features/import/import.error.ts`. Rate-limit responses include
`Retry-After` in seconds, exposed through CORS.

RPC uses object keys to select its URL, independently of procedure route metadata.
The server explicitly mounts this operation at `import/slip/auto-import`; a future
native caller must use that wire path rather than assume `/import/autoImportSlip`.

## Configuration and operation

- `GEMINI_API_KEY` must contain a locally valid key string. It is held by the shared
  provider, never the request context.
- `GEMINI_MODEL` defaults to the previous server model, `gemini-3.5-flash-lite`.
  Missing or malformed configuration prevents runtime startup. Remote key/model
  authorization is checked only when a request reaches Gemini.
- The model is called with `store: false` and SDK retries disabled. Two calls can
  run concurrently, with two FIFO waiting places and a ten-second queue deadline.
- Image validation fully decodes JPEG/PNG with Sharp without converting the bytes
  sent to Gemini. Deployment must install the lockfile's Sharp native dependency
  for the deployment platform.
- The model deadline is 110 seconds and the pre-write deadline is 140 seconds.
  Bun's connection timeout is disabled for this exact route so it cannot cut off
  the Effect deadline or an in-progress database write. Configure any reverse proxy
  consistently; retries must reuse the same asset ID after a lost response.
- Identity is per user and includes soft-deleted rows. The existing MongoDB unique
  `(userId, dedupeIdentity)` index is authoritative; no new data migration is needed.

## Automated verification

Run commands from the repository root after `vp install`:

```sh
vp check
vp test
vp run --filter @moojot/api check-types
vp run --filter server check-types
vp run --filter server build
```

The isolated MongoDB suites can also be run directly:

```sh
vp test apps/server/test/ledger-identity.test.ts apps/server/test/slip-import.test.ts
```

The fixture starts an ephemeral, loopback MongoDB replica set, creates a unique test
database and pushes the repository's actual Prisma schema/indexes. It never reads
the development `DATABASE_URL`. The first run downloads a MongoDB binary into the
runner's cache, so it needs network access once. Tests use real Better Auth sessions,
Hono, oRPC, Import and Ledger. Gemini is replaced at the Layer boundary; provider
contract tests intercept the SDK's HTTP boundary. Effect's test clock advances
deadlines without waiting minutes. The unrelated-index conflict test creates and
removes an additional unique index only in this isolated database.

Results on 2026-09-28:

| Gate                                 | Result                                                    |
| ------------------------------------ | --------------------------------------------------------- |
| `vp check`                           | Pass: formatting and lint                                 |
| `vp test`                            | Pass: 98 tests across three files                         |
| Isolated MongoDB suites              | Pass: 93 HTTP tests and two Ledger tests, included above  |
| API/server type checks               | Pass                                                      |
| Web type check                       | Pass                                                      |
| Server build                         | Pass                                                      |
| Built server startup under Bun       | Pass: synthetic configuration, health response `200 OK`   |
| Native / repository-wide type checks | Expected failure: the two removed import operations below |
| Live Gemini after deployment         | Not run; use the separate smoke-test record below         |

## Standards

Independent review of `03adbabf..4ed613e`: no actionable Standards findings.
The new import code follows the documented Effect conventions: services and Layers
own orchestration, reusable Effect functions use `Effect.fn`/`Effect.fnUntraced`,
untrusted request and model structures use Schema, errors are tagged, and the route
provides the Promise/error boundary. The Ledger addition follows the existing
Prisma pattern. No baseline code smell warrants a change.

## Spec

Independent review of `03adbabf..4ed613e`: no Spec findings. The review checked strict
input/model validation, Ledger ownership and duplicate races, SDK configuration and
retries, cancellation and deadline boundaries, queue capacity/FIFO behavior, and
HTTP paths/privacy/headers. Native incompatibility is explicitly permitted by the spec.

Review totals: Standards **0**, Spec **0**; neither axis has an outstanding finding.

## Native follow-up

This is an intentional API cutover. The removed `/rpc/import/slip` and
`/rpc/import/statement` operations return 404. Historical `source = statement` rows
remain readable and unchanged.

`apps/native/features/imports/client.ts` still calls `import.slip` and
`import.statement` (lines 65 and 67 at cutover). Native typechecking and consequently
the repository-wide type gate fail for those two removed operations. Home autoScan
and import/review screens will not import until the separate native migration lands.
No full application compatibility is claimed.

The follow-up should send the original JPEG/PNG when below 10 MiB, resize only when
needed, bind the local image after receiving `transactionId`, and count created,
skipped and failed requests independently. Retry BUSY, AI_RATE_LIMITED and 5xx/504
on a later scan with the same asset ID: at least 30 seconds, exponential backoff
with jitter capped at 15 minutes, honoring any longer valid `Retry-After`. Do not
retry unchanged 401/400/413/415 inputs or skipped outcomes.

## Live Gemini smoke test after deployment

Status: **not run**. This is separate from the deterministic acceptance gate and
does not require deploying or sending real financial documents during implementation.

1. Use a dedicated test account and a synthetic, readable slip with known amount,
   date and title; never put the image, session token or API key in logs or this record.
2. Authenticate normally and send the image with a new test asset ID to the new URL.
   Verify `created`, its transaction ID, owner, amount/date, `source = slip`, null
   category and null server image URI.
3. Send the same request again, then soft-delete its transaction and retry once more.
   Both retries must return `skipped` with `reason = duplicate`.
4. Send a non-slip test image and verify `no_candidate`. Confirm the old URLs return
   404 and the new URL without a session returns 401. Inspect no-store/nosniff headers.
5. Record deployment revision, timestamp, configured model, test-case outcomes and
   any stable error codes below. Keep document content and credentials out of the record.

| Deployment revision | Timestamp | Model   | Created / duplicate / deleted / no candidate | Notes                         |
| ------------------- | --------- | ------- | -------------------------------------------- | ----------------------------- |
| Pending             | Pending   | Pending | Not run                                      | Requires deployed environment |

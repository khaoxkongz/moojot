# Define the authenticated automatic import API

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: 01, 02

## Question

What operation, path, input, output, and errors should the authenticated automatic slip API use? Each request accepts one image. Specify asset identity, created/skipped/warning results, file conversion, model options, and size limits. The existing `apps/native` contract may change. Define which other flows can call the API.

## Answer

### Operation and caller

The new oRPC operation is `import.autoImportSlip` at `POST /import/slip/auto-import`. Here, import means reading a slip **and saving an actual `FinanceTransaction`** in one request. It does not return candidates for review. Use `protectedProcedure`. Require a session and derive `userId` only from that session.

Retire `import.slip` at `POST /import/slip` and statement/PDF import during migration. See [migration evidence](06-migration-proof-and-cutover.md#answer).

One request accepts one image and creates at most one transaction. Home autoScan is the intended caller. Plan, review, and import screens do not call this operation. Updates to `apps/native` remain outside this migration. This decision accepts temporary incompatibility with old clients.

### Input and persistence

Accept the narrow object `{ assetId: string, fileBase64: string, mimeType: "image/jpeg" | "image/png" }`. Require a nonempty `assetId` that remains identical when retrying the same image. The server constructs `dedupeKey` as `slip:<assetId>`. User-scoped uniqueness follows [persistence ownership](02-persistence-ownership-and-atomicity.md#answer).

Reject client-supplied `userId`, `dedupeKey`, `source`, `categoryId`, device-local URI, PDF password, and model override. The server selects the Gemini model from configuration.

Saved rows use `source = "slip"` and `categoryId = null`. The server stores no `slipImageUri`. A later client update can attach its local image through the returned transaction ID. The user assigns the category. Delete category inference from automatic import without adding later AI enrichment work.

### Image format

`fileBase64` contains actual file bytes without a data URI prefix. Accept JPEG/PNG. Check the signature against `mimeType`. Decoded files have a 10 MiB limit. HTTP JSON payloads have a 14 MiB limit. Move the existing body guard to the new path during migration.

The client sends the original file when it meets the limit. Resize/compress only when necessary to meet the limit. Preserve readable slip text. The server does not require JPEG conversion or resizing for every request. Enforcement/testing of size, timeout, and concurrency belongs to [capacity and failure policy](05-import-resource-and-failure-policy.md#answer).

### Successful results

The tagged result gives the client the final outcome immediately:

```ts
type AutoImportSlipResult =
  | { status: "created"; transactionId: string; warnings: string[] }
  | {
      status: "skipped";
      reason: "duplicate" | "no_candidate" | "incomplete_candidate";
      reasons: string[];
      warnings: string[];
    };
```

`reasons` explains outcomes per image, particularly missing/invalid fields for `incomplete_candidate`. `warnings` includes document warnings and AI `issues` even after creation succeeds. The new result excludes `candidate`, `confidence`, OCR scores, and `review` state.

No transaction, an incomplete candidate, or an existing `dedupeKey` returns `skipped`. Existing keys include transactions that Ledger marks as deleted. These are normal outcomes rather than errors. Creation returns an ID for local image binding and created counts. Images with `skipped` do not count as created transactions.

### Errors and session integration

Use oRPC errors with HTTP status and machine-readable `code`. Clients decide retry from codes rather than Thai message text.

Unchanged input does not qualify for retry for:

- `UNAUTHORIZED` (401).
- `INVALID_ASSET_ID`/`FILE_REQUIRED`/`INVALID_FILE` (400).
- `FILE_TOO_LARGE`/`PAYLOAD_TOO_LARGE` (413).
- `UNSUPPORTED_IMAGE`/`UNSUPPORTED_FILE` (415).

Home autoScan may retry the image in a later scan for:

- `BUSY`/`AI_RATE_LIMITED` (429).
- `AI_INVALID_RESPONSE` or upstream failures (502/503).
- Persistence/system failures (5xx).

A decoded image without a transaction returns `skipped: no_candidate`. System reading/persistence failures remain errors. [capacity and failure policy](05-import-resource-and-failure-policy.md#answer) specifies detailed codes, timeouts, and retry rules while preserving this outcome/error distinction.

Delete or adapt the old server context exception that bypasses session loading for import. The new path must load the session before `protectedProcedure`. This is a migration criterion in [migration evidence](06-migration-proof-and-cutover.md#answer).

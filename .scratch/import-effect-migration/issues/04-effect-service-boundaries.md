# Define Effect boundaries for the Import Feature

Type: grilling
Label: wayfinder:grilling
Status: resolved

## Question

How should `route`, `schema`, `service`, `error`, image/Gemini providers, configuration, and persistence divide responsibility? Every function in `features/import` must use Effect, including formerly pure helpers. Define Layer/runtime composition, AI result checks, and the Effect-to-oRPC error boundary.

## Answer

### Orchestration

`ImportService.autoImportSlip(userId, input)` uses Effect for this sequence:

1. Check the request.
2. Check the image.
3. Check existing `slip:<assetId>` identity.
4. Read through Gemini.
5. Check AI output and candidate completeness.
6. Ask Ledger to create the transaction.
7. Return `created`/`skipped` under the map's contract.

Derive `userId` only from the session. `skipped` is a normal outcome. Reading and persistence system failures remain in the error channel.

### Route

`import.route.ts` declares `protectedProcedure` for `import.autoImportSlip` and the agreed path. Read `context.session.user.id`. Call `context.runtime` once per request. This adapter alone converts tagged Effect errors to oRPC errors. Authentication middleware owns `UNAUTHORIZED`.

The route calls neither Gemini nor Prisma directly. Services decide candidate qualification. The oRPC callback returns `Promise` as the framework requires. This is the Effect conversion boundary. Feature functions and formerly pure helpers that we write return Effect.

### Schema and candidate checks

`import.schema.ts` uses Effect Schema for input, tagged output, untrusted Gemini output, and candidate types. Decode real data through Effect.

- Wrong JSON type/structure or unknown `kind` returns `AI_INVALID_RESPONSE`.
- Structurally valid candidates with `null` or invalid `amountSatang`/`occurredOn` return `skipped: incomplete_candidate`.
- An empty array returns `skipped: no_candidate`.
- A blank title uses “รายการจากสลิป” (transaction from a slip) with a warning, as previously decided.
- Retain `issues` as warnings. Exclude `confidence` computation. Report malformed candidates instead of discarding them silently.

[capacity and failure policy](05-import-resource-and-failure-policy.md#answer) decides candidate count and resource limits.

### Service and helpers

`import.service.ts` is a `Context.Service` with Effect orchestration methods. Checks of `assetId`, base64, byte size, and JPEG/PNG signatures are Effect helpers within the feature. Separate files are acceptable when they improve readability. These calculations need no provider.

Convert direct-value/throw helpers to `Effect.fnUntraced` or Effect Schema decoding. Use `Effect.fn` for steps that need tracing. Helpers use Effect rather than hidden `Promise` calls or thrown business errors.

### Gemini provider and configuration

Gemini is a provider `Context.Service` separate from `ImportService`. It accepts checked bytes/MIME. Send prompt/JSON schema with `store: false`. Wrap SDK calls in Effect. Convert upstream failures and malformed results to tagged errors.

The server supplies key/model through a configuration Layer when creating the app runtime. Request handling uses that configuration rather than `process.env` or keys in oRPC context. Check missing or unusable configuration before the server accepts requests.

### Ledger persistence

`LedgerService` is the sole provider that creates `FinanceTransaction`. `ImportService` does not access Prisma. Expose the user's `dedupeKey` lookup, including rows that Ledger marks as deleted.

An initial check can avoid repeated AI reading. The unique constraint still decides concurrent requests. After a `createTransaction` conflict, check the same identity through Ledger again. A matching `slip:<assetId>` returns `skipped: duplicate`. An absent match returns a persistence error. Convert only matching-key conflicts, rather than every `FinanceConflictError`, to duplicate.

### Errors and runtime

`import.error.ts` defines tagged input/image, AI, configuration, and persistence errors. Services/providers use these instead of `ORPCError`. The route maps HTTP/code according to [authenticated API contract](03-authenticated-import-api-contract.md#answer).

Use specific schema codes where defined: `INVALID_ASSET_ID`, `FILE_REQUIRED`, `INVALID_FILE`, `UNSUPPORTED_IMAGE`, and `UNSUPPORTED_FILE`. Preserve these distinctions rather than generic `BAD_REQUEST`. Unexpected defects return 5xx. Log their internal cause while excluding secrets from client output. Detailed timeout/concurrency/retry codes belong to [capacity and failure policy](05-import-resource-and-failure-policy.md#answer).

`createAppRuntime` composes configuration Layer, Gemini provider, ImportService, and existing `LedgerService`. Create one shared `ManagedRuntime` for server reuse. `features/index.ts` points to `import.route.ts`. Session exceptions, body-limit paths, and old route retirement follow [migration evidence](06-migration-proof-and-cutover.md#answer).

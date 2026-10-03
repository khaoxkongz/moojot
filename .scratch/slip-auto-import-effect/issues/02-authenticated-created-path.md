# 02: Create a transaction through the authenticated slip API

**What to build:** An authenticated user sends one JPEG/PNG image and its asset ID to `import.autoImportSlip`. Ledger creates exactly one `FinanceTransaction`. The response contains `created` and its transaction ID. The Import Feature uses Effect throughout the work. Gemini receives configuration from a Layer at server startup. HTTP enforces image limits before expensive work.

**Blocked by:** 01 — Check the user's slip identity through Ledger

**Status:** done

**Done in:** `aa8cc3b` Implement authenticated slip auto-import with Effect

- [ ] `POST /rpc/import/slip/auto-import` requires a session. It returns 401 without one. The client cannot choose user ID, dedupe key, source, category, model, or PDF options.
- [ ] Input accepts only asset ID, base64 bytes, and JPEG/PNG MIME type. Check asset ID, base64, the 10 MiB image limit, signature/MIME, and the 14 MiB HTTP JSON limit before Gemini. Apply the spec. Invalid input returns the matching machine code with 400/413/415.
- [ ] An image with a complete candidate creates one Ledger row. Use `source = slip`, `categoryId = null`, `slipImageUri = null`, and `dedupeKey = slip:<assetId>`. Return `created` with the transaction ID.
- [ ] The real Gemini provider requests at most one candidate. It uses `store: false` and disables SDK retries. A Layer supplies key/model after startup checks. The request context contains no key. Missing or malformed configuration prevents server startup.
- [ ] The route converts Effect to Promise and oRPC errors. Import Feature helpers use Effect. The Import Service delegates database creation to Ledger.
- [ ] HTTP tests use fake Gemini and a test database. Check normal creation, user binding, `no-store`/`nosniff` headers, input rejection before AI, and `created` results. API/server type checks pass.

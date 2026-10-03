# 05: Retire the old Import API and prove the migration

**What to build:** The server exposes only the new import operation. Retire the old slip/statement/PDF paths. Preserve saved statement data. Prove the new API through HTTP, a test database, and API/server builds.

**Blocked by:** 04 — Bound Gemini work, queue length, and deadlines

**Status:** done

**Done in:** `aa8cc3b` Implement authenticated slip auto-import with Effect; `304de8a` Document slip import validation and native follow-up

- [ ] The Import router points only to the new operation. Old slip and statement RPC URLs return 404. Delete unused PDF code, password/model overrides, and dependencies from API/server.
- [ ] The server requires session loading and user identification for import. Move the 14 MiB body guard to the new path. Delete the 28 MiB statement guard. Preserve native development CORS and `no-store`/`nosniff`.
- [ ] Historical `FinanceTransaction` rows with `source = statement` remain readable. Preserve their data and source value in Ledger/schema.
- [ ] HTTP integration tests prove 401/413, created/skipped/error, and 404 on old routes. Multiple images use independent requests. A created transaction remains when another image returns skipped or failed. Errors/logs exclude secrets.
- [ ] Pass `vp check`, `vp test`, API/server type checks, server build, and MongoDB integration tests. Prepare a live Gemini smoke procedure with test data and a place to record results after deployment. Keep that record separate from the automated gate.
- [ ] Record that the old native caller still calls retired operations. Native/repository type checks fail, and import remains unavailable until the native update. Report this incompatibility accurately when assessing the application as a whole.

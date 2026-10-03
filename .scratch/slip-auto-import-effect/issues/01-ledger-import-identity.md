# 01: Check the user's slip identity through Ledger

**What to build:** Let Ledger check whether the user's `slip:<assetId>` already created a `FinanceTransaction`. Include rows that Ledger marks as deleted. Repeated images and concurrent requests must not create extra transactions. Prepare the existing creation path before the new API becomes available.

**Blocked by:** None (can start immediately).

**Status:** done

**Done in:** `aa8cc3b` Implement authenticated slip auto-import with Effect

- [ ] Ledger checks identity within the user's account. It includes rows that Ledger marks as deleted. It prevents access across users.
- [ ] The existing `FinanceTransaction` creation path owns data checks and binds `userId`. It retains the unique `(userId, dedupeIdentity)` constraint. Preserve the existing Ledger contract unless a change is necessary.
- [ ] Use an isolated test MongoDB. Check that the key remains available after soft deletion. Check that identical keys from different users remain independent. Check that the unique constraint prevents duplicates under concurrent requests.
- [ ] The Ledger preparation passes the API type check. It preserves the behavior of the existing import routes.

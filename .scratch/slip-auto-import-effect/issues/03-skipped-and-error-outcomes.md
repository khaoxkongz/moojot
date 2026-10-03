# 03: Distinguish skipped outcomes from errors

**What to build:** The import request returns `skipped` with reasons for absent transactions, incomplete required data, or an existing asset ID. Reading or persistence problems return errors that support retry where appropriate. The user receives warnings without manual candidate review.

**Blocked by:** 02 — Create a transaction through the authenticated slip API

**Status:** done

**Done in:** `aa8cc3b` Implement authenticated slip auto-import with Effect

- [ ] No candidate returns `skipped: no_candidate`. An invalid ISO date or an amount outside positive safe integers returns `skipped: incomplete_candidate` with field reasons. Neither case writes a transaction.
- [ ] A blank title uses “รายการจากสลิป” (transaction from a slip) with a warning. Return AI `issues` and warnings even after creation succeeds. The new result contains no `confidence`, candidate, or review state.
- [ ] A repeated asset ID returns `skipped: duplicate`, including a row that Ledger marks as deleted. An initial match avoids Gemini. Different asset IDs can create transactions even when kind, amount, date, and title match.
- [ ] After a concurrent Ledger conflict, check the same identity again. A matching key means duplicate. Other conflicts mean persistence error. Retry after a lost post-commit response must not create another transaction.
- [ ] Invalid Gemini JSON/schema, unknown kind, absent parseable output, or multiple candidates returns `AI_INVALID_RESPONSE` 502 without persistence. AI/database failures return distinct 5xx codes and statuses. They remain errors rather than skipped outcomes.
- [ ] HTTP fixtures cover created/skipped/error results, warnings, model/persistence 5xx, and MongoDB races, soft deletion, and user isolation. Responses/logs exclude image bytes, keys, raw model output, and database details.

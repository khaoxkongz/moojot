# 04: Bound Gemini work, queue length, and deadlines

**What to build:** The slip API respects the server's configured capacity. It returns `BUSY` when the queue fills or waiting exceeds the limit. Caller disconnection cancels work before persistence starts. After database creation starts, the API waits for the real result instead of reporting a misleading timeout.

**Blocked by:** 03 — Distinguish skipped outcomes from errors

**Status:** done

**Done in:** `aa8cc3b` Implement authenticated slip auto-import with Effect

- [ ] One Effect Semaphore per server instance permits two Gemini calls and two FIFO waiters. Enter after input checks and the initial duplicate check. A full queue or a wait over 10 seconds returns `BUSY` 429 with `Retry-After: 30`.
- [ ] Success, error, timeout, and cancellation release the permit or queue space. Client disconnection during queuing/Gemini cancels work and prevents new transaction creation.
- [ ] Gemini timeout after 110 seconds returns `AI_TIMEOUT` 504. The 140-second deadline before persistence returns `IMPORT_TIMEOUT` 504. Gemini 429 returns `AI_RATE_LIMITED` 429 with a valid `Retry-After`. Distinguish network/5xx/other upstream 4xx codes according to the spec.
- [ ] After Ledger creation starts, await its real commit result despite disconnection or expiry of the deadline before persistence. The server does not retry Gemini or Ledger automatically.
- [ ] Controlled time and fake Gemini tests prove active 2/waiting 2, FIFO, the fifth request, queue timeout, and cancellation cleanup. They also prove deadlines, disabled SDK retries, and no misleading timeout after persistence starts.

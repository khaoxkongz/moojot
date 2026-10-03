# 07: Slip results and needs-help work

**What to build:** Show three result groups. Allow navigation during reading. Resolve pending slips manually or retry according to their cause, without duplicate transactions.

**Blocked by:** 05 — [Home, filters, and category queue](05-home-filter-queue.md); 06 — [Read slips and show actual evidence](06-slip-evidence.md)

**Status:** ready-for-agent

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md)

**User stories:** 47–59

**Why blocked:** This needs completed Home navigation/status and slip evidence/transaction binding from ticket 06.

- [ ] Authenticated-app scan ownership continues across routes. Background/lock/permission loss pauses scheduling, and eligibility resumes it. Logout/account switching isolates results. (stories 47, 48, 49)
- [ ] Results map created→“จดให้แล้ว” (recorded), duplicate/no-candidate→“ข้ามไป” (skipped), and incomplete→“ต้องช่วยหมู” (needs help). Provide working actions. (stories 50, 57)
- [ ] Device work persists per account across rounds/days/restarts and beyond the 30-day discovery window until handled. Use durable storage rather than only lastRound. (story 51)
- [ ] Remembered incomplete images are not automatically resent to GenAI. Transient failures honor backoff/Retry-After/eligibility, with targeted retry of selected work. (stories 52, 53)
- [ ] Manual resolution prefills photo date, retains handled state, and binds the image to the successful transaction ID. (stories 54, 55)
- [ ] Manual/in-flight races, lost responses, and repeated requests share image identity. Reconcile conflicts to one transaction and factual success feedback. (story 56)
- [ ] Missing images/changed access preserve work with limitations. Old-account data cannot change the new account's state. (stories 58, 59)
- [ ] Prove session/native transport/server/test-database behavior with controlled clock/photo/storage/provider. Check results→manual resolution/retry on iOS.

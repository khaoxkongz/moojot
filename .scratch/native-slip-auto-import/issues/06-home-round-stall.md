# 06: Find why Home reading stalled on the iPhone

**What to build:** No implementation yet. During [ticket 05's first device session](05-device-check.md), Home reading never ended 3 times in one long Expo Go session. Swift-async `Album.getAll`/`Query` stopped resolving. Promise-callback `getPermissionsAsync`/`copyAsync` and fetch continued. One round also stalled in final ledger refresh.

Session `ScanDeadlines` is a safety measure. A stalled step now ends the round instead of keeping Home busy. It does not fix the unknown cause.

**Blocked by:** None.

**Status:** needs-info

## Why it is waiting

Fresh Expo Go processes did not reproduce the stall. See ticket 05's condition table. Diagnosis lacks a reproducible feedback loop. Resume with `/diagnosing-bugs` when either source of evidence becomes available:

- A round log reports `DeadlineError` or `refresh-timeout`. Keep the process alive. Capture native threads through Xcode → Debug → Attach to Process → pause, or Console.app logs.
- A development build runs long enough to assess whether the stall is specific to Expo Go.

Keep images, session tokens, and the Gemini key outside notes.

- [ ] Reproduce the stall or establish that it is specific to Expo Go.
- [ ] State the cause. Fix it with a regression test or record it as a limit.

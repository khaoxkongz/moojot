# 06: Find why Home reading stalled on the iPhone

**What to build:** Nothing yet. During the first device session in [05](05-device-check.md), a Home round kept reading and never ended, three times in one long Expo Go session. Swift-async Expo calls (`Album.getAll`, `Query`) stopped resolving, while Promise-callback calls (`getPermissionsAsync`, `copyAsync`) and fetch kept working. One round also never finished its final ledger refresh.

`ScanDeadlines` in the scan session is a safety net, not a fix: a stalled step now ends the round instead of keeping Home reading. The cause is unknown.

**Blocked by:** None.

**Status:** needs-info

## Why it is waiting

The stall has not happened again in fresh Expo Go processes (see the table in 05's first device session), so there is no feedback loop to diagnose against. Pick this up again with `/diagnosing-bugs` once one of these exists:

- A round log showing `DeadlineError` or `refresh-timeout`. Keep the process alive and capture a native thread sample (Xcode → Debug → Attach to Process → pause) or Console.app logs.
- A development build run long enough to show whether the stall is specific to Expo Go.

Keep images, session tokens and the Gemini key out of any notes.

- [ ] The stall is reproduced, or shown to be specific to Expo Go
- [ ] The cause is stated, and either fixed with a regression test or recorded as a limit

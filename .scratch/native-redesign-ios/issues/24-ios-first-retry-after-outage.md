# 24: First iOS retry does not reload after server recovery

**What to build:** After Home fails because the server is unavailable, the first “ลองอีกครั้ง” (retry) tap reloads once the server recovers.

**Blocked by:** 05 — [Home, filters, and category queue](05-home-filter-queue.md)

**Status:** needs-triage

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md) (error/recovery states). Found during ticket 05.

**Why blocked:** Ticket 05 owns the new “โหลดรายการไม่สำเร็จ” (load failed) card and Retry button.

## Observed behavior (iPhone 11 simulator, development build, 2026-10-02)

1. Open Home with the server running. Stop the server.
2. Tap “เดือนก่อน” (previous month). The load-failed card appears correctly.
3. Restart the server. Wait for `curl localhost:3000` to return 200. The checks included 5-second and 30-second waits.
4. Tap Retry once. No request reaches the server, its logs stay empty, and the card remains.
5. Tap again. All requests arrive and Home loads.

This reproduced three times. Retry calls `refetch()` on every enabled query. The cause remains unknown.

One possible cause involves queries still fetching or paused. With no data, `refetch()` may return their existing Promise through `continueRetry`. Another possibility is `expo/fetch` failing to send after disconnection. Check physical iPhone to distinguish simulator behavior, for example by disabling/restoring Wi-Fi.

- [ ] Find the cause. Log each query's fetchStatus/failureCount at the tap. Check whether `rpcFetch` runs.
- [ ] One tap reloads both Home and the category queue.
- [ ] Check physical iPhone after disconnecting/restoring network.

## Comments

**From ticket 09 on simulator:** Maestro taps on Search's upper-left Retry never called `onPress`. Expo's floating development-tool gear intercepted nearby taps. The handler logged nothing. One tap on the button's right half (`point: "96,226"`) refetched and loaded after server recovery.

Before investigating TanStack/`expo/fetch`, check whether ticket 24's first no-request tap actually reaches the button. Add `console.log` in `onPress`. Also try iPhone without that gear overlay.

**From ticket 25 on simulator, 2026-10-03:** Summary showed the same problem one time. In the first dark outage, two Summary retry taps sent no request to the server. A Metro hot reload then loaded the month. In the light outage and in a second dark outage, one tap recovered Summary. Home needed two taps again. See the [ticket 25 Comments](25-shared-message-card.md#comments).

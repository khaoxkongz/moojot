# Adapt mobile Home to automatic slip import

Interview state: The user confirmed the complete grill-with-docs conclusions, including the correction that Home remains the same screen throughout.

## Confirmed conclusions

- First make Home read and save slips automatically. Retire menus that call the old, unavailable import system.
- A broader visual redesign is separate later work.

### New users

The user described this sequence:

1. Register an account.
2. Sign in. Enter onboarding.
3. Near the end of onboarding, request full photo-library access.
4. Find bank albums. Show slip-photo counts per bank. Show the total photo count.
5. Complete the remaining confirmation steps. Enter Home.
6. Home discovers photos from the past 30 days. AI reads and saves them automatically under the existing API decisions.

Onboarding discovery/counting and Home reading/persistence are separate steps. Discovered photos are not yet saved transactions. Use this sequence as the baseline. The discussion did not select a separate activation button for automatic reading.

### Returning users

- Users who completed onboarding enter Home directly.
- Home discovers the past 30 days and uses the same automatic reading/persistence rules as for new users.
- Returning users retain automatic import without repeating onboarding.

### Incomplete photo access

- This includes denied access, selected-photo access, and later revocation.
- Users retain app access, historical transactions, and manual entry.
- Pause automatic slip reading until full photo access is available.
- Home explains the required access and offers a settings button.

### Return from another app

- Returning to Home from another app triggers discovery and automatic reading.
- Agreed example: start at Home, transfer money/save a slip in a bank app, then return to Moojot. Discovery starts without a refresh gesture.
- Retain permission checks, the 30-day window, and duplicate protection from existing decisions.

### Activation and refresh gestures

- Work runs while Home is open in the active app. The user keeps that screen open during processing.
- Entering Home triggers discovery/reading. Returning from another app or after unlocking also triggers it.
- There is no continuous work in another app or while locked. Returning to Home resumes unfinished work.
- A held pull gesture shows pull-responsive animation only. It does not start a new scan.
- Release to refresh starts work. Automatic Home activation remains a separate trigger.

### Old import menus

- Delete “อ่านสลิป” (read slip) and “ใบแจ้งยอด” (statement) from Home's “+” menu.
- Update related links and guidance for automatic reading.
- Preserve manual entry and access to historical transactions.

### Visible state and continued processing

- Discovery, reading, and saving remain on the same Home screen. Starting/ending a round changes visible state within that screen. There is no separate waiting route.
- During discovery/reading, show “หมูกำลังอ่านสลิปใหม่” (Moo is reading new slips) with animation until the round ends.
- After the round, return the same Home screen to its normal state with newly saved transactions.
- The user's decision excludes the assistant's proposed round summary and scan-detail screen.
- A skipped or failed photo does not block the next photo. Continue until no photos remain or there are no new photos.
- Retain API rules: skipped outcomes do not retry unchanged images automatically. Temporary failures retry later after the specified delay. Continuing processing does not mean immediately repeating failed images.
- In these conclusions, background/quiet means automatic reading/persistence while Home is open, without a round summary. The selected activity text and animation remain visible.
- Retain the permission explanation and settings action when full access is unavailable.

## Sources

- [API Wayfinder plan](../import-effect-migration/map.md) and its linked answers provide the earlier decisions.
- [API spec](../slip-auto-import-effect/spec.md) defines the slip contract and requirements for later native work.
- [API migration record](../../docs/slip-auto-import.md) records the actual RPC route and later native work.

Use existing decisions as the native baseline. Record any proposed change to previously agreed behavior explicitly.

## Related text changes

- Update onboarding/help for the two stages. Onboarding discovers/counts photos. Home sends images to AI and saves automatically.
- Adapt old instructions about manual image selection and review before persistence to the confirmed sequence.

## Next step

The [native spec](spec.md) recorded status ready-for-agent at handoff. The user confirmed product behavior, automated tests, and device/emulator UI checks. Next, use to-tickets to divide the spec into ordered implementation tickets.

# Define slip reading across navigation and app pauses

Label: wayfinder:grilling
Type: grilling
Mode: HITL
Status: resolved
Assignee: Codex (/root)
Parent: [Plan the Moojot app redesign](../map.md)

## Question

When adding the new slip-results screen, when should reading continue or pause? Consider leaving results, opening entry creation, returning Home, and suspending the app. How do retry and manual-entry actions connect to the original result?

Inspect `features/slips/auto-import/` and API outcomes before proposing options. Record requirements replacing [the native automatic-import spec](../../native-slip-auto-import/spec.md). That spec made Home the status surface and stopped scheduling when Home lost focus.

## Answer

### Pending work and resends

- Retain unresolved slip work across rounds until completion. New daily results must retain yesterday's unresolved work.
- GenAI results with incomplete data enter “ต้องช่วยหมู” (needs help) for manual entry. Do not automatically resend the same image while its outcome remains remembered. Retaining work does not request repeated reading.
- Temporary failures, including unavailability, network errors, and timeouts, retain existing retry rules. Retry in an eligible round when due. Show causes and actions separately from incomplete data.
- Successful manual entry links the image, records completion, and prevents another entry from the same image.

### Approved design behavior

- Provide “ต้องช่วยหมู” (needs help), “จดให้แล้ว” (recorded), and “ข้ามไป” (skipped). `incomplete_candidate` needs help. Keep it separate from duplicates and non-slips.
- In-app navigation does not stop an active round while the app stays open. App suspension or locking stops new images. Continue when the app returns. Reuse existing pause and deduplication behavior. Add no promise of execution after the user closes the app.
- Manual entry starts with the photo date. Successful entries support category selection and editing.

### System consequences

- Replace the linked spec's lack of a results screen and Home-only round ownership.
- Separate pending-work retention from outcome-memory cleanup for the 30-day image-discovery window. Inspect storage and metadata in API coverage.
- This agreement does not guarantee memory after app-data deletion or reinstallation. It does not select cross-device synchronization. Propose these only if required.
- Missing images or changed permissions must show actual access limits. Keep work states inspectable. Do not assume successful recording.

## Comments

### Behavior already defined by the design

- README says “เปิดแอปไว้ก่อนน้า ปิดหน้านี้ได้ หมูจะอ่านต่อให้” (keep the app open, close this screen, and reading continues). Prototype batches do not belong to a route. Accept continued reading across in-app navigation.
- Results have “ต้องช่วยหมู” (needs help), “จดให้แล้ว” (recorded), and “ข้ามไป” (skipped). Successful entries support category selection or editing.
- An unavailable service allows retry or manual entry. Incomplete data allows manual entry. Manual entry starts with the photo date. Saving changes the original row to “จดเองแล้ว” (recorded manually).
- Prototype timers replace network calls. Its title/amount/day duplicate checks use simulated data. Use actual data contracts when designing the system.

### Existing differences and technical approach

- Existing `home-scan.ts` requires Home focus and an active app. Move round ownership to support navigation.
- An inactive app stops new images, while requests already sent can finish. Use this behavior for app switching or locking, then continuation on return. The prototype does not prove background execution.
- The actual system links images to transaction IDs and deduplicates asset IDs. Preserve this behavior for manually recorded failed results too. Rereading one image must not create another entry.
- The new spec replaces the absence of a results screen and Home-only ownership. Existing app-open execution remains consistent with the handoff.

### Pending-work question at that point

A new prototype round replaces all `scan.items`. It does not simulate results retained across days. README only mentions the latest results. Retention of unresolved “ต้องช่วยหมู” (needs help) was unclear.

The agent recommended retaining unresolved work when new slips arrive the next day. This awaited the user.

### API inspection before the decision

The user requested inspection of the actual app API. After unstable Device Hub control, the user chose codebase inspection. The agent inspected router, schema, import service, and native scan memory. See [current slip API and mobile state](../assets/current-slip-api-review.md) for evidence limits.

The mobile app already remembers outcomes. The server has no endpoint for pending reading work. Incomplete data differs from a non-slip skip. Retention still awaited approval. Requesting API inspection did not approve that proposal.

### Explanatory example

The user requested another explanation. [The pending-slip example](../assets/slip-work-queue-example.html) shows yesterday, today, and completion with interactive controls. It uses invented data and calls no API. It distinguishes slip images, work states, and saved entries. Trying the example did not approve retention.

### Confirmation after explaining rereads

The user asked whether images awaiting manual help would go to GenAI again. The agent inspected `isSettled`. An unchanged image with a remembered incomplete result receives no automatic resend. Unavailability, network failures, and timeouts can retry in later rounds according to retry time. The user then agreed.

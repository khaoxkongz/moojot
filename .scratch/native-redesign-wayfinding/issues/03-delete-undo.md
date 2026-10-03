# Define delete and undo behavior

Label: wayfinder:grilling
Type: grilling
Mode: HITL
Status: resolved
Assignee: Codex (/root)
Parent: [Plan the Moojot app redesign](../map.md)

## Question

What does “เอากลับคืน” (undo) restore after deleting an entry, budget, recurring rule, category, or tag? Include relationships with affected entries and budgets. What happens after toast expiry, consecutive deletions, failed saves, or app closure? Inspect existing delete/restore capabilities before proposing storage for the chosen behavior.

## Answer

### User agreements

- Deleting a user-created category also deletes linked budgets.
- Existing expense entries remain complete and await a new category, following the design.
- “เอากลับคืน” (undo) restores the category, deleted linked budgets, and affected entries' original category relationships.

### Approved design behavior

- Delete immediately with a 5-second “เอากลับคืน” (undo) toast. A new toast replaces the previous action. Undo applies to the latest action whose button remains visible.
- Budget undo restores the original budget. Entry undo restores the entry and its original details.
- Deleting a recurring rule preserves recorded entries. Undo restores the rule.
- Deleting a tag unlinks it from entries. Undo restores the tag and affected relationships while preserving other entry data.
- Calendar reset supports undo, following the prototype. After expiry or replacement of the button, retain the completed action.

### Spec and backend consequences

- Undo restores every relationship changed by that deletion, including budgets deleted with a category. Apply the same relationship rule to tag-linked budgets. Deletion and restoration must keep budget targets consistent.
- Inspect and define restoration for recurring rules referencing categories/tags. Preserve data integrity. Avoid prototype-style budgets with deleted targets and persistent fallback names.
- API planning must choose storage that supports restoration for every object type and delete/restore failures. Preserve other changes made meanwhile. Restoring one entry must not revert the entire dataset.
- This agreement defines required behavior. Storage structures and delete/restore contracts belong to the next technical planning step.

## Comments

### Behavior found before discussion

- README and the prototype already specify immediate deletion and “เอากลับคืน” (undo). The action lasts 5 seconds. A new toast replaces the previous action through HTML `showToast`. Accept this chosen design behavior.
- Undo restores the original entry or budget. Category/tag undo restores the object and affected entry relationships. Deleting recurring rules preserves recorded entries. Undo restores the rule.
- HTML `deleteMg` ignores budgets/rules referencing deleted categories or tags. Budgets then show fallback names and zero spending. This gap requires a decision. Choosing the design does not confirm it.
- Existing `packages/api/src/features/ledger/ledger.service.ts` also deletes linked budgets. It unlinks entries and recurring rules. This differs from the prototype.
- The backend restores entries, but not budgets, rules, categories, or tags. Define complete relationship restoration in the spec.

### Initial proposed scenario

Suppose the user creates “กาแฟ” (coffee) and a 1,000-baht budget. Should deleting that category delete its budget too? The agent recommended deleting both and restoring both through “เอากลับคืน” (undo). This proposal awaited the user.

### Budget explanation

The user asked what a linked budget meant. The agent distinguished a 1,000-baht coffee spending limit from an existing 60-baht coffee entry. Deleting the budget deletes the plan. Existing expenses remain and await another category after category deletion. The user agreed.

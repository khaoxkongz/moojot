# Define existing-data retention needs

Label: wayfinder:grilling
Type: grilling
Mode: HITL
Status: resolved
Assignee: Codex (/root)
Parent: [Plan the Moojot app redesign](../map.md)

## Question

Does the user need experimental app data in the redesign? Does any dataset need special preservation? Decide retention needs first. Migration and checks are a separate question awaiting API coverage. Experimental status alone does not authorize deletion.

## Answer

The user selected a fresh start because existing data is experimental. The redesign therefore does not require migrating existing financial entries.

- This answer defines planning requirements. No deletion or reset occurred.
- Define the reset dataset, cutover timing, and checks in [the transition decision](05-data-transition.md) after data/API inspection.
- Distinguish experimental finance data from the login account. A fresh dataset does not require deleting the user account or changing credentials.

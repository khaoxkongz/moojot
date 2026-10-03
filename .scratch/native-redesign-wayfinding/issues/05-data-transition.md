# Define the transition from experimental data

Label: wayfinder:grilling
Type: grilling
Mode: HITL
Status: resolved
Assignee: Codex (/root)
Blocked by: 02, 03, 07, 08, 09, 10
Parent: [Plan the Moojot app redesign](../map.md)

## Question

How should the new structure preserve agreed data and provide inspectable results? Use existing-data preferences and API gaps to propose migration or a fresh experimental dataset. This decision defines the method for the previously chosen retention needs.

## Answer

Start finance data and preferences fresh inside the existing login account. Keep auth data. Do not drop the whole database for this transition.

- Sign in with the same email. Repeat four-step onboarding when the revised app/API is ready for testing.
- Clear only the identified account's experimental entries, recurring rules, budgets, tags, user-created categories, and startup preferences. Preserve auth data and base categories.
- Reset that account's mobile scan outcome memory, any pending slip work, linked transaction images, and related query cache.
- Fresh discovery may reread old images within the supported window and create entries. This fills a fresh ledger, rather than duplicating the old ledger.

### Cutover sequence for the spec

1. Identify the actual account/environment and app/API versions before starting. Experimental status alone does not authorize clearing other accounts.
2. Stop new image sends and mutations. Establish definite outcomes for active requests before clearing data. Closing the client does not prove that server writes stopped.
3. Prepare compatible schema/indexes/generated client, API contracts, and native client. Test new contracts in an isolated test database before cutover.
4. Reset the selected account and its mobile data. Refresh/invalidate every related consumer according to the actual schema/contract.
5. Check existing auth, fresh onboarding, manual entry, old-image reading, category selection, summaries, recurring entries, and CSV. Use fixtures where checks require definite outcomes.

This is a planning answer. No actual data deletion or reset occurred in this session. Put exact schema/reset commands and scope in reviewable cutover work before execution.

## Comments

### Preparation after the experimental-data decision

The user accepted a fresh dataset in the existing-data ticket. The agent inspected resetUserData/schema and prepared [reset options](../assets/data-transition-options.md). These options still awaited API coverage and a reset agreement. Preparation did not resolve the ticket or execute a reset.

### Proposal after data/API inspection

Coverage finished, and pause/resume and first-card questions had answers. The agent proposed keeping the login account and email. Finance data and preferences would start fresh when the redesign was ready. The user would repeat the design's four-step onboarding.

Before cutover, identify the account/environment and complete these preparations:

1. Stop scans and settle existing requests.
2. Prepare compatible schema/indexes and clients.
3. Clear that account's experimental finance data, mobile scan memory, and linked images.
4. Clear or invalidate all related queries.
5. Check onboarding, image reading, entries, summaries, and CSV in the fresh dataset.

No reset occurred during planning. The proposal awaited agreement to keep the existing login/email with a fresh dataset.

### User approval and delegated choice

The user approved the existing email and fresh experimental data. The user originally intended to delete the entire database, but authorized the agent to choose an appropriate method.

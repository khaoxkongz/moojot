# Options for fresh experimental data

Preparation for [the transition decision](../issues/05-data-transition.md), after the user accepted a fresh experimental dataset. These options were not yet an agreed method. No database changes occurred.

## Findings

- `FinanceTransaction`, `FinanceRecurringRule`, `FinanceBudget`, `FinanceCategory`, `FinanceTag`, and `FinanceSetting` separate users through `userId`. See [finance.prisma](../../../packages/db/prisma/schema/finance.prisma).
- `resetUserData` in [preferences.service.ts](../../../packages/api/src/features/finance-preferences/preferences.service.ts) deletes the signed-in user's finance data in one transaction. It deletes entries, recurring rules, budgets, tags, user-created categories, and all settings. It preserves base categories and login data.
- Deleted settings include onboarding flags, month start, calendar, consent, and recent searches. Define fresh onboarding or restoration of deliberately retained settings.
- Mobile outcome memory, linked images, and query cache are separate from the server. Coordinate them with the selected account reset. Inspect existing `settings/account.tsx` callers and `slipScanSession.forget` before choosing the method.
- Deleting finance entries also deletes their ledger deduplication identities. Rereading old images can create entries in a fresh ledger. This is an expected result. Old image memory should not block filling the fresh dataset.
- Schema/index preparation and new-data checks need the API coverage findings before final cutover commands.

## Options after API coverage

| Option                                      | User effect                                                                                    | Preparation                                                                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Fresh dataset in the existing login account | Keep the same email/login. Replace experimental entries and selected settings with fresh data. | Specify reset scope. Reset mobile memory/query cache. Check onboarding and image reading.                           |
| Separate experimental dataset               | Preserve old data separately. Try the schema in another database or test account.              | Define the acceptance environment/account. Prevent connections to the wrong dataset. Plan the return/switch timing. |

Initial recommendation: use fresh finance data in the existing login account if the user wants the same email. The changed schema must not affect other datasets. Inspect database/environment scope before the final choice.

## Required cutover criteria

- Identify account/environment without documenting credentials.
- Specify reset data/settings and preserved login data.
- Order server/schema/client changes so old clients cannot call incompatible new contracts during testing.
- Align account-specific mobile slip memory and query cache with the server.
- Check onboarding, new entries, old-image rereads, category selection, summaries, recurring entries, and CSV after cutover.
- Show the actual scope and executable steps to the user before resetting.

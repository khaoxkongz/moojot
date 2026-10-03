# 11: Add and select the first card

**What to build:** Add the actual card's name/last four digits and select it in later entries. Users without cards retain app use.

**Blocked by:** 04 — [Manual entry and transaction editing](04-manual-entry.md)

**Status:** ready-for-agent

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md)

**User stories:** 42, 103–104

**Why blocked:** The completed manual editor must persist card selection.

- [ ] Provide card creation through the chosen flow. Check name/last4 and preserve drafts on save failure. (story 104)
- [ ] Persist actual choices per account across app starts. Sample KTC cards cannot become user cards. (story 104)
- [ ] Reuse choices in editor/rules/cards. Normalize name+last4 identity consistently with bank/card filters. (story 42)
- [ ] Same-name cards with different last4 remain separate. Unspecified/no-card use leaves bank and ordinary entry available. (story 103)
- [ ] Card entries return the complete original identity through details/queries.
- [ ] Check persistence/ownership/input and add-card→entry→reopen on iOS. Debt/payment work remains outside scope.

## Comments

**From ticket 04 review:** Editor “เพิ่มบัตร” (add card) currently calls `router.push({ pathname: "/settings/cards", params: { from: "entry" } })`. Cards with `from=entry` calls `router.back()` to the existing editor rather than opening another `/entry`. Replace this with actual name/last4 creation. Return with the new card selected in the draft through `selectEntrySource`. Use `walletCardKey` from `features/wallets/cards.ts` as identity.

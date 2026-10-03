# Define first-time credit-card identification

Label: wayfinder:grilling
Type: grilling
Mode: HITL
Status: resolved
Assignee: Codex (/root)
Parent: [Plan the Moojot app redesign](../map.md)

## Question

How does a first credit-card entry capture the card's name and last four before saved entries identify it? Inspect images and the prototype before proposing additional controls. Preserve the agreed name/last-four identity.

## Answer

- Provide “เพิ่มบัตร” (add card) to enter a name and last four initially. Make the card selectable in later entries.
- This is a provisional approach for review with actual card users. The user/family's experience does not establish complete credit-card requirements.
- Card setup is optional. Users without cards can record entries, use banks, and access other core features without setup.
- Preserve name/last-four identity. This answer adds no debt, billing-cycle, repayment, or credit-limit requirements.

### Planning consequences

- Use one card-choice set in the editor, recurring rules, and card screen. Inspect existing capabilities and required additions for first storage/selection. Do not use sample KTC as actual data.
- Preserve drafts after failed saves. Check the name and last four. Show validation errors. Retain the design's unspecified-card option.
- Future changes must consider entries referencing existing cards and old data. Extensibility does not eliminate migration work for every representation change.
- Prioritize the user's existing entry/slip flows in delivery planning. Check cards later within full scope. Keep cards in the approved design.

## Comments

The prototype includes sample KTC card 4821, so its chip is already selectable. This is not actual user data. Existing discovery uses FinanceTransaction. createTransaction already accepts cardName/cardLast4. The decision concerns first-use input, without assuming a new card catalog or endpoint.

### User response

The user accepted name and last four as an initial approach. The user and family have no credit cards, but relatives or nearby users may use them. The user wants changes or additions after real use.

# Define banks, cards, dates, and transaction times

Label: wayfinder:grilling
Type: grilling
Mode: HITL
Status: resolved
Assignee: Codex (/root)
Parent: [Plan the Moojot app redesign](../map.md)

## Question

How do manual, slip, and recurring entries identify banks, cards, dates, and times? Account selection, filters, search, credit-card screens, and CSV must share these meanings. Compare the actual model with prototype `wallet`, `date`, and `time`. Discuss expense, income, and transfer examples before choosing database structures.

## Answer

### User agreements

- Group entries by bank in this round. Separate accounts at one bank are a future extension. Old entries without account identity retain bank grouping or require user assignment.
- Manual entry retains the design's date selector, with no additional time input.
- The user approved blank CSV “เวลา” (time) for date-only entries. Use actual transaction time when a trusted source provides it. Do not substitute prototype times or recording times.

### Meanings inherited from the approved design

- A card uses its name and last four. Recurring entries preserve the selected bank/card.
- Manual transaction dates come from selection, slip dates from extraction, and recurring dates from due dates.
- Recording time differs from transaction time. Use recording data for “จดล่าสุด” (last recorded). Handle transaction-time evidence according to its actual source.
- Transfers select one source and stay outside income/expense totals.
- “ไม่ระบุ” (unspecified) means no identified bank/card. A manual entry with a bank belongs to that bank's group.

### Planning consequences

- Inspect API/database gaps and trusted sources for bank, card, and actual transaction time before creating tickets.
- Include recurring-card fixes, “อื่น ๆ” (other) filters, and both CSV paths, using the evidence in Comments.
- Data representation and transition are later planning work. This decision defines meanings and visible results while preserving design controls.

## Comments

### Initial facts

- Handoff `README.md` and prototype `WALLET_NAME`/`ALL_WALLETS` group choices by bank. Examples: “กสิกรไทย” (Kasikornbank), “ไทยพาณิชย์” (Siam Commercial Bank), “กรุงไทย” (Krungthai), KTC card, and unspecified. They do not distinguish two accounts at one bank.
- `packages/db/prisma/schema/finance.prisma` stores textual `bank`, `cardName`, and `cardLast4`. `walletWhere` in `packages/api/src/features/ledger/ledger.service.ts` filters bank names. Inspection found no individual-bank-account or balance model.
- Prototype transfers select one source account and stay outside income/expense totals. Discuss this after clarifying bank choices.
- `packages/api/src/features/import/import.schema.ts` has no bank/card fields in SlipCandidate. Inspect album and entry-creation data before defining slip account identification.

### First proposed question

Suppose the user has two Kasikornbank accounts. Should entries share “กสิกรไทย” (Kasikornbank), or should each account have a separate view? The agent recommended bank grouping from the handoff. This remained a proposal until the user answered.

### Answer about bank grouping

- The user chose bank grouping for now. Family and nearby users currently have no two accounts at one bank. The user asked whether separate accounts could come later.
- The agent recorded “ธนาคารของรายการ” (transaction bank) in `apps/native/GLOSSARY.md` for this grouping. Card and date/time meanings remained open then.
- Future individual accounts are possible. That extension requires changes to the model, UI choices, filters, and data transition. Preserve bank-wide views too.
- Old bank-only entries cannot reliably identify their individual account. Future changes must retain unspecified accounts or let users assign old entries. Do not guess.
- The spec must identify bank grouping as current scope. Individual accounts are a later extension. Discussing feasibility does not add them to this round.

### Correction about time input

- The agent asked about backdated entries without a time before inspecting the prototype. The user pointed out that the design has no time input. The proposal received no approval and is not an agreement.
- Reinspection found only date selection in `README.md` and the HTML entry screen. Draft selection and `pickDate` change `occurredOn` without a time control. Preserve this approved UI.
- Prototype `nextTime` generates simulated manual-entry times. It starts at 12:00 or adds 4 minutes to that day's latest time. These are not actual transaction times. They cannot define backend behavior.
- Slip data and CSV display time. Inspect actual sources and meanings before proposing behavior. Prototype time data does not require user time input.

### Design meanings and existing gaps

- Manual entries use the selected date. Slips use the extracted date. Recurring entries use the due date. These follow the approved UI.
- Cards use name and last four, following “บัตรเครดิตของฉัน” (my credit cards) and discovery from entries. `analytics.service.ts` already groups them this way.
- Recurring rules must preserve the chosen bank/card, such as Netflix through KTC. `planning.service.ts` passes bank but sets cardName/cardLast4 to null when creating entries. The spec needs a contract change.
- Transfers select one source and stay outside income/expense totals. This round needs no destination-account or balance system.
- “ไม่ระบุ” (unspecified) means no chosen bank/card. The old filter places all manual-source entries under “อื่น ๆ” (other), even when they identify a bank. Fix this filter.
- `scan-session.ts` sends images and asset IDs without album names or photo times. Candidates lack bank, card, and actual transaction time. The spec must inspect trusted sources for these fields.
- Existing `SlipSourceCard` combines transaction date with createdAt. That is server recording time, not slip evidence of actual transaction time. Native and server CSV currently lack a time column.

### Remaining CSV-time question at that point

The handoff specifies CSV “เวลา” (time), but does not define it for date-only manual or recurring entries. The agent proposed an empty cell without actual transaction time. Recording time would separately support “จดล่าสุด” (last recorded). This proposal awaited the user while preserving date-only UI.

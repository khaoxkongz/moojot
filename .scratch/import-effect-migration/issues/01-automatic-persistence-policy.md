# Define automatic persistence policy

Type: grilling
Label: wayfinder:grilling
Status: resolved

## Question

How should automatic import handle missing amount/date, uncertain data, no transactions, and possible duplicates? Should it save some candidates, reject the request, or retain candidates for correction? Which rules make a candidate ready for `FinanceTransaction`?

## Answer

At this decision point, policy covers both slips and statements within the map's scope. `ImportCandidate` is ready to save as `FinanceTransaction` when:

- Kind is `expense`/`income`/`transfer`.
- `amountSatang` is a positive safe integer.
- `occurredOn` is a valid ISO date.
- `title` is nonempty.

A generated generic title, such as “รายการจากสลิป” (transaction from a slip), is acceptable. Return a warning about the missing title.

- Skip only candidates with missing or invalid required fields. Report reasons per candidate. Other complete candidates may proceed. This qualification rule leaves database failure atomicity undecided.
- AI `issues` are warnings. They cannot block persistence when required fields are complete. The new contract neither uses, computes, stores, nor returns `confidence`.
- Prevent duplicates only with reliable evidence of the same document or transaction, such as a stable source identity. Matching kind, amount, date, and title suggests possible duplication. It is insufficient evidence for automatic skipping.
- Decide `dedupeKey`, duplicate evidence, and partial database failure behavior in [persistence ownership](02-persistence-ownership-and-atomicity.md#answer).
- If no candidate is ready, return success with 0 saved transactions and reasons. Use the same result when the API skips every candidate. This outcome does not mean document reading failed.

Product context: native `autoScan` reads earlier photos from bank albums and sends an asset-ID-based `dedupeKey`. The app intentionally has no user-triggered import flow. Decide authentication and API shape in [authenticated API contract](03-authenticated-import-api-contract.md#answer). Native changes remain outside this migration.

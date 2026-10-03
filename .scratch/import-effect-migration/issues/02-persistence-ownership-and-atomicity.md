# Define persistence ownership and partial results

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: 01

## Question

Should `ImportService` save through `LedgerService.createTransaction` or directly through the database? Should several candidates succeed independently or roll back together? Define repeated requests, `dedupeKey`, duplicate checks, and partial failure according to the earlier policy.

## Answer

### Agreed scope

This round agrees on **the slip API for Home autoScan only**. One request accepts one image and at most one candidate. Statement/PDF and plan, review, and import screens do not call this API. There is no multi-candidate transaction within a request. Several images use independent requests.

### Ownership and identity

`ImportService` owns reading, qualification, source identity checks, creation requests, and outcome mapping. Qualification follows [automatic persistence policy](01-automatic-persistence-policy.md#answer). Only `LedgerService.createTransaction`, or a creation core that LedgerService owns, creates `FinanceTransaction`. This retains shared data checks, `userId` binding, and Ledger rules. `ImportService` does not write through Prisma directly.

The repeated-request identity is Home autoScan's existing media asset ID. The new API constructs `dedupeKey` as `slip:<assetId>`. The existing database binds uniqueness to the user. Temporary URIs, converted JPEGs, and matching kind/amount/date/title are insufficient duplicate evidence.

The same image in another asset may create another transaction. This decision accepts that limitation instead of skipping real transactions through guesses from similar data. [Expo defines asset ID as an item in the device's media library](https://docs.expo.dev/versions/latest/sdk/media-library/#id). It does not guarantee uniqueness across devices for one account. Before supporting several devices, define source namespaces. Specify compatibility with existing keys before enabling that support.

### Duplicate protection

A `dedupeKey` that previously created a transaction must prevent another creation on retry. Include transactions that Ledger marks as deleted. This prevents autoScan from recreating a transaction the user deleted.

An initial identity check can reduce work. The unique `(userId, dedupeIdentity)` constraint decides concurrent requests. A conflict specific to that key means **skipped as duplicate**, rather than a general error. Retry after a lost post-commit response can therefore avoid another transaction.

### Outcomes per image

Successful requests distinguish:

- **Created**, with the transaction ID.
- **Skipped as duplicate**.
- **Skipped because absent or incomplete**, with reasons and warnings from the earlier policy.

Skipped images do not count as created transactions. A reading or persistence system failure returns a distinct error. Home autoScan can retry that image in a later round. Such failure must not become success with 0 saved transactions.

Album scanning uses **best effort per image**. Successful images remain saved when another fails. There is no rollback across requests. Scan totals count created/skipped/failed from each image. One failed image does not mean the whole scan failed.

This is Home autoScan's target contract. A later native update stops its second `ledger.createTransaction` call and consumes the new result.

### Existing behavior at this decision point

Home autoScan analyzes each image through import, then calls Ledger separately with an asset-ID-based `dedupeKey`. The review screen has a separate flow outside scope. The old Import API does not persist transactions.

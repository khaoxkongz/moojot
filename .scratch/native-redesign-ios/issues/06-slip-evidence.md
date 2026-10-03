# 06: Read slips and show actual evidence

**What to build:** The editor shows slip image, date, transaction time, counterparties, and bank/card evidence. Unreadable information remains unknown.

**Blocked by:** 04 — [Manual entry and transaction editing](04-manual-entry.md)

**Status:** ready-for-agent

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md)

**User stories:** 43, 59

**Why blocked:** This needs the completed editor and a backward-compatible transaction-data extension.

- [ ] Send one image through authenticated import. Retain only factual data that qualifies under the contract. Unknown optional evidence remains unknown.
- [ ] Schema/prompt/provider/mapping/storage/output supply all UI evidence, including actual time when readable. Missing optional fields remain acceptable.
- [ ] Photo date, album name, and `createdAt` cannot substitute for transaction time, bank, or counterparties without evidence.
- [ ] The editor opens thumbnails/viewer with actual details. Missing images show limitations. Fallback titles cannot prove payer/merchant. (story 43)
- [ ] Preserve per-user asset identity, unique/conflict handling, and duplicate protection after soft deletion. (story 59)
- [ ] Test transport→route→fake provider→Ledger→detail with known/unknown evidence fixtures. Check the viewer on iOS. Existing callers remain compatible with extended data.

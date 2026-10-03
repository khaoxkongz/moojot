# 18: Export CSV with actual transaction dates and times

**What to build:** Export all months as a ten-column Thai file. Account/card labels and times reflect actual evidence.

**Blocked by:** 06 — [Read slips and show actual evidence](06-slip-evidence.md); 11 — [Add and select the first card](11-first-card.md)

**Status:** ready-for-agent

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md)

**User stories:** 107–108

**Why blocked:** Actual-time evidence and complete bank/card identity must exist before file checks.

- [ ] Export/share an actual UTF-8 BOM file usable in Excel/Sheets. Include every data page within scope. (story 107)
- [ ] Match the spec's column order: `วันที่`, `เวลา`, `ประเภท`, `ชื่อรายการ`, `หมวด`, `จำนวนเงิน (บาท)`, `บัญชี`, `แท็ก`, `โน้ต`, `ที่มา`. These mean date, time, type, title, category, amount in baht, account, tags, note, and source. (story 107)
- [ ] Export actual time only with evidence. Unknown/manual/recurring date-only entries leave time blank, without `createdAt`, photo time, or seeds. (story 108)
- [ ] Preserve bank/card name+last4, tags, note, source, satang precision, Thai text, escaping, and formula protection.
- [ ] Server/native formatters agree in meaning. Save/share failure supports retry rather than falsely claiming a completed file.
- [ ] Check >1,000 rows, dangerous CSV text, unknown time, and export/share/open on iOS.

# 12: Create recurring rules and generate due entries

**What to build:** Create recurring transactions from Plan/editor. Show first/next dates, due entries, and rule links without duplicating the original.

**Blocked by:** 11 — [Add and select the first card](11-first-card.md)

**Status:** ready-for-agent

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md)

**User stories:** 75–80, 83

**Why blocked:** This needs completed bank/card choices and editor integration from ticket 11.

- [ ] Use designed controls/input rules for type/title/amount/day 1–31/end month or forever/category/tags/bank/card/note. (story 75)
- [ ] Cap days 29–31 in short months. Show actual first/next dates. Accounting month start must not shift due dates. (stories 76, 77)
- [ ] New rules generate only due dates within start/end through today. Report actual created count. Retry after partial save creates no duplicate rules/entries. (story 78)
- [ ] Rules from existing entries start after the original date and retain its ID link. Rule-generated drafts exclude another manual save. (story 79)
- [ ] Generated entries preserve bank/card/category/tags/note and rule+due-date identity. (story 80)
- [ ] Extend schedule representation for future effective changes and pause intervals. Preserve existing callers/rules for later lifecycle work.
- [ ] Active rules generate due dates within start/end on eligible app return. App inactivity is not pause. (story 83)
- [ ] Check API generation/duplicate protection/leap-month fixtures and editor→rule→generated entry on iOS.

## Comments

**From ticket 04 review:** “จดซ้ำล่วงหน้า” (schedule recurring entry) already sends `cardName` and `cardLast4` to `/recurring-form`. Other parameters are kind/amount/title/note/occurredOn/categoryId/tagIds/bank. The form/rule schema still lacks cards.

Read those two parameters. Persist them in the rule. Bank uses identity such as "KBank". Show it through `bankDisplayName`.

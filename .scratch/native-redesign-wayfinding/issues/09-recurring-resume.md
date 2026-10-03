# Define recurring behavior after an intentional pause

Label: wayfinder:grilling
Type: grilling
Mode: HITL
Status: resolved
Assignee: Codex (/root)
Parent: [Plan the Moojot app redesign](../map.md)

## Question

After pausing a recurring rule for months, should resume start at the next due date or fill the paused period? Distinguish this from new rules, which backfill through today under the handoff. Also distinguish edits, which affect the next occurrence.

## Answer

- Resuming starts at the next due date. Skip due dates during the intentional pause. Do not backfill that period.
- Preserve all entries recorded before the pause. Pausing does not delete history.
- A rule that remains active does not become paused because the user stops opening the app.
- This answer covers user-triggered resume. It adds no control for automatically resuming after a chosen number of months.

### System consequences

Effective-period or pause data must let the generator skip actual paused dates. isActive plus backfilling from startsOn using current values is insufficient. Choose representation during spec engineering. Cover next-occurrence schedule edits and repeated pause/resume cycles.

Acceptance uses a two-month pause followed by resume:

- Create no entries for paused dates.
- Create entries only for dates that become effective again.
- Preserve entries before the pause.
- Repeated generator calls create no duplicates.

## Comments

The handoff has a pause/resume switch and “หยุดไว้ · หมูยังไม่จดให้” (paused · no recording). The prototype does not simulate time during a pause. Existing isActive and generateDueRecurringTransactions backfill from startsOn. Decide resume behavior before choosing effective-period data. The initial recommendation starts at the next occurrence and preserves recorded entries.

### Clarifying the scenario

The user asked about scheduling ahead, then not opening the app for months. The agent explained that inactivity differs from switching the rule off. The user confirmed that after a two-month pause, recording may resume without filling those two months.

# Define delivery order and redesign acceptance

Label: wayfinder:grilling
Type: grilling
Mode: HITL
Status: resolved
Assignee: Codex (/root)
Blocked by: 01, 02, 03, 04, 05, 07, 09, 10
Parent: [Plan the Moojot app redesign](../map.md)

## Question

How should backend and screen changes form phases with inspectable appearance and actual data? Which criteria establish full handoff acceptance? Include design behavior, API integration, data consistency, and agreed platform checks. The answer must support a spec and implementation tickets.

## Answer

Use [the updated delivery and acceptance plan](../assets/delivery-plan-proposal.md) for handoff. Sequence: foundations → entry/slip flows → summaries/search/planning/management → additional features and complete checks.

- Every phase needs actual read/write flows and failure/recovery checks. Integrate dependency contracts before accepting that phase.
- Check runtime/UI on physical iPhone 13 Pro/Expo Go and simulated iPhone 11/Device Hub. Android verification follows later and does not block this round.
- Reuse shared code and supported existing capabilities. Address coverage gaps through the plan's technical approach. Preserve handoff appearance and controls, including jointly agreed exceptions.
- Start fresh experimental data in the existing auth account when schema/API/client are ready. Follow the transition decision. Planning does not delete data.
- Hand off the spec in a new feature directory with build issues and outcome criteria. Map decision tickets are not build tickets.

No product question remained before spec creation. Version-specific APIs and data representation belong to spec/implementation work. Return to discussion if an actual limitation changes user-visible results before changing scope.

## Comments

### Proposal for review

The user agreed to prioritize frequently used entry/slip flows, then complete the remaining design. [The delivery proposal](../assets/delivery-plan-proposal.md) defined four phases: foundations, core use, summaries/planning, and additional features/full checks. It initially included data criteria and both platforms.

The separate transition ticket already defined a fresh dataset. This ticket awaited overall review before spec handoff. No implementation changed.

### Previously uncertain topics with initial plans

Coverage and environment inspection provided initial answers for shared components, data fetching/recovery, scanner-aligned onboarding/help, and platform preparation. Details appear in the proposal. Review them within this decision instead of creating duplicate open topics.

Additional library/API research before implementation is spec validation for the selected packages. No library-related product decision remained for the user in this map. Return to discussion if an actual limitation changes agreed behavior.

### iOS-first acceptance change

After reviewing four phases, the user requested iOS-only validation now and Android later. The proposal now requires iPhone 13 Pro/Expo Go and iPhone 11/Device Hub evidence. Defer SDK/AVD preparation and Android checks. iOS evidence cannot establish Android acceptance.

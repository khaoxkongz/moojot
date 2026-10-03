# Agent document workflow

Use this workflow for every task that creates, edits, translates, or reviews `.scratch/**/*.md`.
Include completed issues and historical notes when they belong to the requested scope.
For ordinary implementation tasks, review the documents you change rather than the entire archive.

Read these skills before writing:

- [asd-ste100](../../.agents/skills/asd-ste100/SKILL.md). Use Strict mode.
- [writing-for-agents](../../.agents/skills/writing-for-agents/SKILL.md). Apply its hierarchy and completion criteria.
- [domain-modeling](../../.agents/skills/domain-modeling/SKILL.md). Use it for the domain changes specified in step 2.

## Procedure

1. **Source.** Identify every document in scope. Read each existing file completely. Retain its content before editing for comparison.
   Use the user's current instructions, approved specifications, and recorded decisions to identify intentional changes.
   This step ends when every document has a source and an explicit change scope.

2. **Terminology.** Read [GLOSSARY-MAP.md](../../GLOSSARY-MAP.md). Read the glossaries for the affected contexts.
   Use their canonical English terms and meanings. Retain exact Thai names when they identify UI text or source terminology.

   Apply `domain-modeling` when defining or changing domain terms, meanings, relationships, glossary entries, or ADRs.
   Resolve terminology conflicts against the relevant glossary and code.
   Record each resolved term immediately in its owning glossary.
   For language-only edits, retain existing domain meanings.
   This step ends when each domain concept has one consistent name and meaning.
   Every resolved term must appear in its owning glossary.

3. **Meaning.** Write English prose. Keep exact UI strings, commands, identifiers, and literal records.
   Add English explanations for Thai literals. Compare every requirement, condition, exception, number, unit, and uncertainty with its source.
   Keep proposals distinct from approved decisions. Keep observed results distinct from unverified behavior.

   Language-only changes retain workflow state, story references, dependency identities, and commit records.
   Intentional state or behavior changes follow the user's task and the tracker rules.
   This step ends when every source meaning remains or has an explicitly authorized change.

4. **Structure.** Put current instructions or settled answers before reference material and historical comments.
   Keep each concept's definition, rules, and caveats together. Preserve chronological order within historical comments.
   During language-only edits, keep existing file boundaries and every historical decision, even when current behavior differs.

   Apply Strict sentence and paragraph limits to prose. Keep necessary precision when shortening would change meaning.
   This step ends when each action has a clear completion condition and its relevant conditions are together.

5. **Review.** Compare the result with the before-edit content and the task's source requirements.
   Check operators, prefix direction, date bounds, retry conditions, next-occurrence behavior, and account scope where applicable.
   Check exact literals and metadata separately. Check every changed heading and its incoming links.
   This step ends when the entire changed document has no unexplained change of meaning or unresolved writing finding.

6. **Validation.** Run `vp run check`. Follow the repository Review Checklist and any changed-workspace checks.
   Review every checker warning. Record necessary exceptions with the procedure below.
   Report the checks and any retained precision exception in the same task.
   This step ends when required checks pass and every exception has a specific reason.

Complete these steps before reporting the original task complete.
The agent performs this review during the task. A separate user request is unnecessary.

## Terminology and the ASD dictionary

The project glossaries own domain meanings. They complement the writing skills.
Use `check` for inspecting behavior. Use `approval` for the user's acceptance of a decision.
An unchanged historical record can retain its original wording.

The installed skill does not include the official ASD dictionary.
Strict mode here applies its structural rules and consistent project terminology.
It does not establish official approval of every word, meaning, or part of speech.
Use an authorized [official ASD reference](https://www.asd-ste100.org/STE_downloads.html) when the task requires dictionary verification.
The official dictionary and the project glossaries have separate purposes.

## Mechanical check

`vp run check:agent-docs` checks every `.scratch` Markdown file, including completed issues and notes.
The root `check` script includes this command. The commit hook checks the staged documents after `vp staged` succeeds.

The checker uses the installed skill's `ste-lint.py`. Restore that skill if it is missing.
It also checks Thai prose, repository links, heading anchors, and paragraph length.
It ignores fenced code, inline code literals, and known fields containing machine values or literal records.
Prose fields such as `What to build:` and `Why blocked:` remain subject to writing checks.

The script supports `--staged` for the commit hook and `--root` for isolated regression fixtures.
Staged validation reads the index, including link targets and exception records.
Unstaged text cannot hide a broken document that the commit would contain.

Mechanical checks cannot establish translation meaning, approval, or evidence quality.
The comparison in step 5 remains a required agent action.
Remote URLs and local references outside the repository remain manual checks.

## Precision exceptions

Preserve exact literals and records before changing their language to satisfy a heuristic.
Fix an actual prose violation. Retain a necessary precision exception or a justified false positive.

Record each retained finding in [document-exceptions.json](document-exceptions.json) with:

- The exact file path.
- The rule name.
- The exact source line.
- The matched text.
- The reason for retaining it.

Review the reason against the source before adding or changing an exception.
The checker accepts only the exact recorded finding. Changed text or a different rule needs another review.
It rejects stale exceptions. Numeric violation budgets and blanket rule disabling are not exception records.

For example, user approval and permission inspection are different actions even when a synonym heuristic groups their verbs.
Retain a compound tense when it carries uncertainty or current relevance that a simple tense would lose.
Keep that distinction explicit in the reason.

If the user explicitly requests Thai prose, record that language override for its exact findings.
The user's instruction remains the source of that exception.

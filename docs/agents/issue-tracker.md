# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`, never a single combined tickets file
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the role strings); the bold form `**Status:**` is equivalent
- Comments and conversation history append to the bottom of the file under a `## Comments` heading
- Finishing an issue: in the same session that commits the work, set `Status: done` and add a `Done in:` line naming the commit hash and subject. `done` is not a triage role; it means nothing is left to pick up. A spec is `done` once all its issues are; while only `ready-for-human` issues remain, the spec is `ready-for-human` too
- An issue whose acceptance needs a human (a run on a real device, a screenshot only they can take) stays `ready-for-human` after the code lands: add a comment listing exactly what to check, and set `done` once the user reports the result
- Notes an agent writes for later tickets (token names, run recipes, evidence screenshots) live in `.scratch/<feature-slug>/notes/`, named after the issue number, so the next session finds them
- A bug found along the way that the current issue won't fix gets its own issue file in the same feature directory, numbered after the last one, instead of living only in another issue's comments

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` (the Notes / Decisions-so-far / Fog body).
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
- **Hand off**: when the map reaches its destination, `/to-spec` writes the spec in a **new** feature directory, never inside the map's, because the map's decision tickets already use `issues/01`… and the build tickets must start at `01` too. The spec links back to the map, and the map gets a `## Handed off` section linking forward to the spec.

# Spec: Scripts on TypeScript and Effect 4

Status: ready-for-agent

## Problem Statement

The repository scripts are plain JavaScript. They call the Node file and process modules directly, and no check reads their types. A type error in a script appears only when the script runs. `packages/api` already uses Effect 4 for errors, services, and schemas, so the scripts use a different style.

Effect 4.0.0 is now the stable release on npm. The repository still pins `effect@^4.0.0-rc.117`.

## Solution

Every JavaScript script and test in the root scripts folder becomes TypeScript that uses Effect 4. The scripts form their own workspace, as [ADR 0001](../../docs/adr/0001-scripts-typescript-effect.md) records. Node runs each script directly, with no build step.

Each script keeps its behavior. The deliberate changes are these:

- Failure output and progress output change format.
- The two checkers accept a new `--root` option.
- The worktree setup installs packages before the script starts.

The Python document checker stays unchanged.

## Implementation Decisions

### Prerequisite: stable Effect

- A separate branch, `chore/effect-4-stable`, comes before this work, because the repository puts a dependency upgrade on its own branch.
- That branch adds `effect: ^4.0.0` to the workspace catalog. Every package that declares `effect` then uses `"catalog:"`.
- The branch passes `vp check` and `vp test` and merges into `dev` before the workspace ticket starts. Ticket 01 tracks this branch.

### Workspace boundary

- The scripts folder becomes the workspace `@moojot/scripts`.
- It declares `effect`, `@effect/platform-node`, and `@effect/vitest` from the catalog. The workspace ticket adds the two new packages to the catalog at the version that matches `effect`.
- Its own `check-types` script runs `tsc --noEmit`. `vp run check-types` already runs every workspace, so the pre-push hook checks the scripts with no other change.
- Node type stripping runs only erasable TypeScript syntax. The workspace TypeScript settings enforce that limit. Imports between scripts use the `.ts` extension.

### Script interfaces

Each script keeps its positional arguments, flags, output files, and exit codes, except for the changes below.

- **Ticket checker (`check-tickets`):** it keeps its story-coverage rules. A new `--root` option sets the `.scratch` directory. The default is the repository's own directory.
- **Domain helper checker (`check-domain-helpers`):** it keeps its five shapes and its skipped directories. A new `--root` option sets the native app directory. The default is the repository's own directory.
- **Worktree setup (`setup-worktree`):** the root `setup:worktree` script runs `vp install` first, then the Effect script.
  - Effect cannot load in a worktree that has no packages, so the install must come first.
  - The script copies each missing `.env` file from the main checkout. It fails when the hooks directory has no pre-commit hook.
  - A check on 2026-10-04 showed that this order is safe. `varlock codegen` succeeded for the server, native, and web apps with only `.env.schema` present. Prisma client generation already sets a placeholder `DATABASE_URL`.
- **iOS preview (`ios-preview`):** it keeps every flag, its two positional arguments, and its screenshot names. The API server and Metro continue after the script stops, and the next run uses them again.
- **Simulator container check (`sim-container`):** `containerNeedsReinstall` becomes an `Effect.fn` that requires `FileSystem` and `Path`. The iOS preview yields it.
  - The workspace ticket converts this check before the iOS preview changes.
  - Until then, the old preview script runs the check through `Effect.runPromise` with the Node services layer.

### Effect style

- Use the `FileSystem`, `Path`, and `ChildProcess` services. `NodeServices.layer` from `@effect/platform-node` provides them.
- Start each script with `NodeRuntime.runMain`.
- Parse flags with `effect/unstable/cli`.
- Decode untrusted input with `Schema`. This input includes `.env` lines, JSON files, and Maestro's `commands.json`.
- Declare each failure as a `Schema.TaggedError`.
- The iOS preview sends its fixture requests through `HttpClient`.

### Output contract

- The default `runMain` reporter prints every failure. A non-zero exit has no custom formatting.
- A checker finding is a failure. Each checker collects all findings into one `Schema.TaggedError` that carries the list. Its message keeps the current finding lines and the fix hint.
- Progress lines use `Effect.log`. The default logger prints them in logfmt.
- The iOS preview skill quotes progress lines. Update it to match.

### Background servers

The iOS preview starts the API server and Metro through `ChildProcess`, in a scope that the program never closes. This approach depends on the spawner implementation. Two failures are possible:

- The spawner stops the servers when the script stops.
- An open child handle keeps the Node event loop active, so the script never stops.

If either failure occurs, start each server through `ChildProcess` as `sh -c 'nohup vp … &'`. The shell gives the server to the system and stops immediately. The iOS preview ticket records which failure occurred.

### Path references

Each ticket updates every reference to its old script path. These references include:

- The root `package.json` scripts.
- The pre-commit and pre-push hooks.
- The `staged` configuration.
- `CODING_STANDARDS.md` and the tracker documentation.
- The iOS preview skill.
- Comments in the native app and its Maestro flows.

### Delivery

- Branch `feat/scripts-effect` holds every ticket except ticket 01, and one PR merges it into `dev`.
- Each ticket has one commit, except the two checker tickets, which have two commits each. Their `Done in:` lines name both commits.
  1. The first commit adds `--root` to the old checker with `node:util` `parseArgs` and adds the new tests. The tests pass on the old script.
  2. The second commit replaces the checker with the TypeScript version. The same tests pass, and only the script path in the tests changes.
- The diff between the two commits shows that the checker behavior stayed the same.

## Testing Decisions

### What a good test checks

A good test checks only external behavior: the exit code, the lines in stdout and stderr, and the files that a script writes. It does not check the order of internal calls or private helpers. Reporter text surrounds the finding lines, so tests match those lines as substrings.

### The seam

The process boundary of a script is the one seam. A test starts the script as a real process with arguments, an environment, and a fixture directory. It then asserts the exit code and the output. The agent document test already uses this seam, because it starts the Python checker with `--root` against fixture directories.

These tests use this seam:

- The ticket checker and the domain helper checker, through `--root`.
- The worktree setup, in a temporary Git repository with a linked worktree.
- The agent document test, which still starts `python3`.

There are two exceptions:

- **Simulator container check:** a library, not a script. Its test calls the exported effect, as the current test calls the function.
- **iOS preview:** has no automated seam. Simulator runs check it, as the next section describes.

### iOS preview runs

Run these flows on the iPhone 11 simulator:

1. Stop the API server and Metro. Run `05-home-filter-queue.yaml` with `--theme light`, then with `--theme dark`.
2. Run `02-auth-flow.yaml` with `--fixture --first-start`.
3. Run `03-onboarding-photos.yaml` with `--photos reset`.
4. Run the `05-home-error.yaml` and `05-home-recovered.yaml` pair with `--offline --keep-app`, as the iOS preview skill describes.

After each run, `lsof` must show the API server and Metro listening. The script process must no longer run.

### Test tools

- Each test is an `it.effect` from `@effect/vitest` with `NodeServices.layer`.
- Fixture directories come from `FileSystem.makeTempDirectoryScoped`. The test scope removes them, so no test keeps a cleanup list.
- Every Git call in a test runs without `GIT_DIR`, `GIT_WORK_TREE`, and `GIT_INDEX_FILE`. Ticket 29 of `native-redesign-ios` found that a pre-push hook sets these variables.
- The workspace ticket shows that `@effect/vitest` runs under `vp test` before other tickets depend on it. The installed `vitest` is 5.0.1, which `@effect/vitest` 4.0.0 accepts, but no test ran the combination before this spec.

### Prior art

- The agent document test covers the process seam, the `--root` fixtures, and the Git variable isolation.
- The simulator container test covers the library exception.

### Required checks

After each ticket, `vp test`, `vp check`, `vp run check`, and `vp run check-types` pass.

## Out of Scope

- Changes to the Python document checker or to the vendored `ste-lint.py`.
- Scripts outside the root scripts folder. These include the database workspace scripts, the native asset generator, and the capture scripts in `.scratch` notes.
- Running the scripts with Bun.

## Further Notes

- The user approved these decisions in a grilling session on 2026-10-04. [ADR 0001](../../docs/adr/0001-scripts-typescript-effect.md) records the workspace rule and the Python exception.
- This spec has no user stories. The work is a refactor of repository tools, so the implementation and testing decisions carry the requirements. Tickets for this spec omit the `User stories:` line.
- No glossary entry comes from this spec. The scripts are repository tools, not part of a domain context.

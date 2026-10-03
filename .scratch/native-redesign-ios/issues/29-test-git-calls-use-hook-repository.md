# 29: The agent document test changes the real repository during a push

**What to build:** `vp test` in the pre-push hook leaves the real repository unchanged. The agent document test creates its Git repositories only in its temporary directories.

**Blocked by:** None (can start immediately)

**Status:** needs-triage

**Source:** Found on 2026-10-03, when the user pushed `feat/native-redesign-ios`.

## Observed behavior

1. The pre-push hook `.vite-hooks/pre-push` runs `vp test`. Git starts the hook with `GIT_DIR` set to the real repository.
2. `vp test` runs `scripts/check-agent-documents.test.mjs`. Its `stage()` helper runs `git init --quiet <tmp>` and `git -C <tmp> add .` with `execFileSync`.
3. These calls keep the environment of the hook. `GIT_DIR` overrides the `<tmp>` directory, so `git init` initializes the real repository again.
4. After the push, the real repository has `core.bare = true`.
   Git commands in the main checkout then fail with “this operation must be run in a work tree”.

The `check()` helper of the same test starts `scripts/check-agent-documents.py`, and `--staged` runs `git -C <root>` from that script.
That call keeps the same environment, so it can read the real index. Nobody checked this.

## Probable fix

Remove `GIT_DIR`, `GIT_WORK_TREE`, and `GIT_INDEX_FILE` from the environment of the Git calls in the test. Include the checker that `check()` starts.

- [ ] The `stage()` Git calls and the checker that `check()` starts run without `GIT_DIR`, `GIT_WORK_TREE`, and `GIT_INDEX_FILE`.
- [ ] A test runs the test helpers with `GIT_DIR` set to another repository. That repository keeps `core.bare = false` and its index.
- [ ] A push through `.vite-hooks/pre-push` passes, and `git config core.bare` in the main checkout then gives `false`.

## Comments

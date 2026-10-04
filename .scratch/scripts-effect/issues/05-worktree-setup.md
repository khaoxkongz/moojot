# 05: Move the worktree setup to Effect, with install first

**What to build:** In a new worktree, `vp run setup:worktree` installs packages first. The TypeScript script then copies the `.env` files from the main checkout and checks the pre-commit hook. The script never starts before its packages exist. See the [spec](../spec.md).

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] The root `setup:worktree` script runs `vp install`, then the TypeScript script. A comment in the script gives the reason for this order.
- [ ] The script copies each missing `.env` file and logs each copy. It keeps an existing target unchanged. It fails with the current message when the hooks directory has no pre-commit hook.
- [ ] The script uses `FileSystem`, `Path`, and `ChildProcess` for its Git calls.
- [ ] A process-level test runs the script in a temporary Git repository with a linked worktree. It covers a copy, an existing target, a missing source, and a missing pre-commit hook. Every Git call in the test runs without `GIT_DIR`, `GIT_WORK_TREE`, and `GIT_INDEX_FILE`.
- [ ] In a new worktree under `.claude/worktrees/`, `vp run setup:worktree` passes. A comment on this ticket records its output.
- [ ] Every reference to the old setup script names the new file.
- [ ] `vp test`, `vp check`, `vp run check`, and `vp run check-types` pass.

# 07: Move the agent document test to Effect

**What to build:** The test of the Python document checker runs as `it.effect` with scoped fixtures. It keeps every case, including the Git variable isolation, and passes through the pre-push hook. The Python checker stays unchanged. See the [spec](../spec.md).

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] The TypeScript test keeps every case of the old test, with the same assertions on exit code, stdout, and stderr.
- [ ] Each case is an `it.effect`. Fixtures come from `FileSystem.makeTempDirectoryScoped`. The cleanup list and its `afterEach` are gone.
- [ ] `git` and `python3` start through `ChildProcess`. Every call runs without `GIT_DIR`, `GIT_WORK_TREE`, and `GIT_INDEX_FILE`. The case with `GIT_DIR` set to another repository still passes.
- [ ] The Python checker has no change.
- [ ] Every reference to the old test file names the new file.
- [ ] `vp test`, `vp check`, `vp run check`, and `vp run check-types` pass. A push through the pre-push hook passes.

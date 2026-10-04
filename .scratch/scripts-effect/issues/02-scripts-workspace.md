# 02: Make the scripts an Effect workspace, starting with the container check

**What to build:** The scripts become the `@moojot/scripts` workspace, and `vp run check-types` checks them. The simulator container check is the first module on Effect. Its test shows that `@effect/vitest` runs under `vp test`, so later tickets can depend on the toolchain. See the [spec](../spec.md).

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The workspace `@moojot/scripts` exists. It declares `effect`, `@effect/platform-node`, and `@effect/vitest` as `"catalog:"`. The catalog contains the two new packages at the version that matches `effect`.
- [ ] The workspace TypeScript settings allow only erasable syntax and `.ts` import extensions. `vp run check-types` runs the `check-types` script of the workspace.
- [ ] `containerNeedsReinstall` is an `Effect.fn` that requires `FileSystem` and `Path`. It returns the same result as the old function for each container state.
- [ ] The old iOS preview runs the check through `Effect.runPromise` with `NodeServices.layer`. A preview run on the simulator still passes. Ticket 06 removes this bridge.
- [ ] The container test keeps every case of the old test. Each case is an `it.effect` that creates its container with `FileSystem.makeTempDirectoryScoped`.
- [ ] `vp test` runs the container test one time, and the test passes. A comment on this ticket records whether `@effect/vitest` and `vite-plus/test` share one runner.
- [ ] Every reference to the old container check file names the new file.
- [ ] `vp test`, `vp check`, `vp run check`, and `vp run check-types` pass.

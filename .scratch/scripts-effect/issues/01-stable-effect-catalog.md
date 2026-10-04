# 01: Bump Effect to the stable 4.0.0 through the catalog

**What to build:** Every workspace uses the stable `effect` 4.0.0 from one catalog entry. `packages/api` keeps working on it. This ticket is the prerequisite in the [spec](../spec.md).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

This ticket lands on branch `chore/effect-4-stable`, not on `feat/scripts-effect`. The repository puts a dependency upgrade on its own branch.

- [ ] The workspace catalog contains `effect: ^4.0.0`. Each package that declares `effect` uses `"catalog:"`.
- [ ] The lockfile resolves `effect` to 4.0.0 or a later 4.x release.
- [ ] `vp check`, `vp test`, `vp run check`, and `vp run check-types` pass.
- [ ] The branch merges into `dev` through a PR.

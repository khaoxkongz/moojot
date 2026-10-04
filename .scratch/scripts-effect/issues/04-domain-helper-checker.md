# 04: Move the domain helper checker to Effect

**What to build:** `vp run check` and the Git hooks run the TypeScript domain helper checker. It reports the same hand-written domain values as the old checker. A new `--root` option lets tests run it against a fixture native app directory. See the [spec](../spec.md).

**Blocked by:** 02

**Status:** ready-for-agent

This ticket has two commits. `Done in:` names both. The spec's "Delivery" section gives the reason.

- [ ] Commit 1: the old checker accepts `--root` through `node:util` `parseArgs`. The default stays the repository's native app directory.
- [ ] Commit 1: a process-level test starts the old checker with `--root` against scoped fixture directories. It covers each of the five shapes, a clean file, and a file in a skipped directory. The test passes.
- [ ] Commit 2: the TypeScript checker replaces the old one. It uses `FileSystem`, `Path`, and `effect/unstable/cli`. One `Schema.TaggedError` carries all findings to the default reporter.
- [ ] Commit 2: the test from commit 1 passes. Only the script path in the test changes.
- [ ] Every reference to the old checker names the new file. These references include the root `check` script, the pre-push hook, the `staged` configuration, and `CODING_STANDARDS.md`.
- [ ] `vp test`, `vp check`, `vp run check`, and `vp run check-types` pass.

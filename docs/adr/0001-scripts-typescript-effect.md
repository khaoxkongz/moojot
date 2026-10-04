---
status: accepted
---

# Repository scripts are TypeScript + Effect in their own workspace; the Python document checker is exempt

Every script in the root `scripts/` folder is TypeScript that uses Effect 4. Node runs each one directly with no build step. They form the `@moojot/scripts` workspace, which declares its own Effect packages from the shared catalog and is type-checked by `vp run check-types`. This gives the scripts the same style as `packages/api` for errors, files, processes and schemas, and type errors are caught before the scripts run. New scripts follow the same rule.

`scripts/check-agent-documents.py` stays in Python. It imports the vendored, hash-locked `asd-ste100` skill's `ste-lint.py` as a Python module, so even a port would still depend on Python.

## Considered Options

- **Port the checker and run `ste-lint.py --json` as a child process for each document.** This removes the Python we own, but adds a `python3` process for every `.scratch` document on every check.
- **Port `ste-lint.py` as well.** This forks a third-party skill pinned by `skills-lock.json`, and the copy drifts every time the skill updates.

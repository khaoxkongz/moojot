# Coding Standards

Judgement calls for the reviewer. Mechanical rules live in the `lint` block of `vite.config.ts` and run in `vp check`; this file holds only what no linter can decide.

## Shared names keep their meaning

A shared token, prop, or exported function keeps the meaning its callers rely on. When the meaning changes (a fill colour becoming a text colour, a prop switching units), the change gets a **new name** and callers move to it on purpose. Flag a diff that repurposes an existing name while callers still use it the old way.

## Tests prove behaviour

A test fails only when something a user or caller can observe goes wrong: a value saved, an error shown, an order of results. Flag tests that restate style constants or mirror the implementation line by line.

## One helper per domain value

Native code reads a `PeriodKey` and turns satang into baht through the helpers in `apps/native/utils/dates.ts` and `apps/native/utils/format.ts`, adding a helper there when one is missing. Flag a diff that parses a period key by hand (`slice`, `split`) or formats money inline beside an existing helper.

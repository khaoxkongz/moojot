# 01: Restore GitHub Actions CI

**Status:** ready-for-human

**Blocked by:** GitHub locked the account after a payment failed. Actions reports "account is locked due to a billing issue" for both private and public repositories.

**What to build:** Restore `.github/workflows/ci.yml` after GitHub unlocks the account. Commit 57ea9a9 contains the original file. Its removal prevented misleading PR failures during the account lock.

- [ ] Restore the file with `git checkout 57ea9a9 -- .github/workflows/ci.yml`. Update `voidzero-dev/setup-vp` to the latest release.
- [ ] The first PR after restoration passes `vp check`, `vp test`, and `vp run check-types` on GitHub.

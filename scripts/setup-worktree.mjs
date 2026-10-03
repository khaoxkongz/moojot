// Prepares a fresh git worktree: copies the gitignored env files from the main checkout, then installs.
// `vp install` also generates the Prisma client (root postinstall), so nothing else is needed to type-check.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const here = git("rev-parse", "--show-toplevel");
const main = path.dirname(path.resolve(here, git("rev-parse", "--git-common-dir")));
const envFiles = ["apps/server/.env", "apps/native/.env", "apps/web/.env", ".env.preview.local"];

for (const file of envFiles) {
  const from = path.join(main, file);
  const to = path.join(here, file);
  if (main === here || existsSync(to) || !existsSync(from)) continue;
  copyFileSync(from, to);
  console.log(`copied ${file}`);
}
execFileSync("vp", ["install"], { cwd: here, stdio: "inherit" });

// Without a pre-commit hook where git looks for one, commits here skip every check. `core.hooksPath` is shared by all
// worktrees: an absolute path reaches the main checkout's `.vite-hooks/_`, a relative one this worktree's own copy.
// `hooks:setup` is `vp config --no-agent`: plain `vp config` also rewrites AGENTS.md.
const hooksDir = path.resolve(here, git("rev-parse", "--git-path", "hooks"));
if (!existsSync(path.join(hooksDir, "pre-commit"))) {
  console.error(
    `setup:worktree: ${hooksDir} has no pre-commit hook, so commits here would run no checks; run \`vp run hooks:setup\` and check again`
  );
  process.exit(1);
}

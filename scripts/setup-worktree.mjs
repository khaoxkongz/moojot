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

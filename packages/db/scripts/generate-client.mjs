// Generates the Prisma client without a database, so a fresh clone or worktree can type-check.
// `prisma generate` never connects; it only needs DATABASE_URL to be set.
import { execFileSync } from "node:child_process";

const env = { ...process.env, DATABASE_URL: process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/placeholder" };
const cwd = new URL("..", import.meta.url);

execFileSync("prisma", ["generate"], { cwd, env, stdio: "inherit" });
execFileSync("node", ["scripts/patch-prisma-generated.mjs"], { cwd, env, stdio: "inherit" });

// Native code formats years and money through the helpers in apps/native/utils (CODING_STANDARDS.md,
// "One helper per domain value"). Reviews kept finding hand-written copies (ticket 09 added a fourth
// amountLabel and left two `+ 543` behind), so the shapes a copy takes are checked here.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..", "apps", "native");
const skipDirs = new Set(["node_modules", "ios", "android", ".expo", "dist", "web-build", "utils"]);

const shapes = [
  { pattern: /\+\s*543\b/, helper: "buddhistYear / shortBuddhistYear in utils/dates.ts" },
  { pattern: /%\s*100\s*===\s*0\s*\?\s*0\s*:\s*2/, helper: "amountLabel in utils/format.ts" },
];

const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return skipDirs.has(entry.name) ? [] : files(path.join(dir, entry.name));
    return /\.(ts|tsx)$/.test(entry.name) ? [path.join(dir, entry.name)] : [];
  });

const problems = [];

for (const file of files(root)) {
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, index) => {
      for (const { pattern, helper } of shapes) {
        if (pattern.test(line)) {
          problems.push(`${path.relative(process.cwd(), file)}:${index + 1}: use ${helper}\n  ${line.trim()}`);
        }
      }
    });
}

if (problems.length > 0) {
  console.error(
    `Hand-written domain values (CODING_STANDARDS.md, "One helper per domain value"):\n\n${problems.join("\n")}`
  );
  process.exit(1);
}

// Every user story a ticket lists must be covered by one of its checkboxes, so an implementer
// working box by box can't skip a story (ticket 05 missed story 30 that way).
// A box claims stories with a trailing tag: `(story 30)`, `(stories 28, 31)` or `(stories 28–35)`.
// Done tickets are history and are skipped.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..", ".scratch");

const expand = (list) =>
  list
    .split(",")
    .map((part) => part.trim().match(/^(\d+)(?:\s*[–-]\s*(\d+))?$/))
    .filter(Boolean)
    .flatMap(([, from, to = from]) =>
      Array.from({ length: Number(to) - Number(from) + 1 }, (_, i) => Number(from) + i)
    );

const problems = [];

for (const feature of readdirSync(root, { withFileTypes: true })) {
  if (!feature.isDirectory()) continue;
  const dir = path.join(root, feature.name, "issues");
  let files;
  try {
    files = readdirSync(dir).filter((file) => file.endsWith(".md"));
  } catch {
    continue;
  }
  for (const file of files) {
    const text = readFileSync(path.join(dir, file), "utf8");
    if (/^\**Status:\**\s*done\b/m.test(text)) continue;
    const listed = text.match(/^\**User stories:\**\s*([\d\s,–-]+)/m);
    if (!listed) continue;
    const covered = new Set(
      [...text.matchAll(/^- \[[ x]\] .*\(stor(?:y|ies) ([\d\s,–-]+)\)\s*$/gm)].flatMap(([, list]) => expand(list))
    );
    const missing = expand(listed[1]).filter((story) => !covered.has(story));
    if (missing.length > 0) {
      problems.push(
        `${path.relative(process.cwd(), path.join(dir, file))}: no checkbox covers story ${missing.join(", ")}`
      );
    }
  }
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  console.error(
    "\nEnd a checkbox with `(story N)`, `(stories N, M)` or `(stories N–M)` for each listed story, adding a box if none fits."
  );
  process.exit(1);
}

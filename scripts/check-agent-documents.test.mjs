import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const project = path.resolve(import.meta.dirname, "..");
const checker = path.join(project, "scripts/check-agent-documents.py");
const roots = [];
const hookGitVariables = new Set(["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE"]);

// A Git hook can export these variables, and they would point every git command below at the hook's repository.
function isolatedEnv() {
  return Object.fromEntries(Object.entries(process.env).filter(([key]) => !hookGitVariables.has(key)));
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", env: isolatedEnv() });
}

function write(root, name, text) {
  const target = path.join(root, name);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, text);
}

function fixture(documents, exceptions = []) {
  const root = mkdtempSync(path.join(tmpdir(), "moojot-agent-documents-"));
  roots.push(root);
  write(root, "docs/agents/document-exceptions.json", JSON.stringify(exceptions));
  for (const [name, text] of Object.entries(documents)) write(root, name, text);
  return root;
}

function check(root, ...args) {
  return spawnSync("python3", [checker, "--root", root, ...args], { encoding: "utf8", env: isolatedEnv() });
}

function stage(root) {
  git("init", "--quiet", root);
  git("-C", root, "add", ".");
}

afterEach(() => {
  vi.unstubAllEnvs();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("Agent document gate", () => {
  it("checks completed tickets and historical notes", () => {
    const root = fixture({
      ".scratch/example/issues/01-done.md": "# Completed\n\nStatus: done\n\nThe app stopped; data remains.\n",
      ".scratch/example/notes/history.md": "# History\n\nThe app stopped; data remains.\n",
    });
    const result = check(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("01-done.md:5 semicolon");
    expect(result.stderr).toContain("history.md:3 semicolon");
  });

  it("preserves exact records and code while checking prose fields", () => {
    const root = fixture({
      ".scratch/example/spec.md": [
        "# Specification",
        "",
        "**Done in:** abc123 First subject; def456 Second subject",
        "**Blocked by:** 01; 02",
        "",
        "Use `left; right`.",
        "",
        "```ts",
        "const message = 'ส่วนนี้เป็นตัวอย่าง';",
        "```",
        "",
        "**What to build:** The app stopped; data remains.",
        "",
      ].join("\n"),
    });
    const result = check(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("spec.md:12 semicolon");
    expect(result.stderr).not.toContain("spec.md:3");
    expect(result.stderr).not.toContain("thai-prose");
  });

  it("preserves commit records in a list but checks the list's prose", () => {
    const root = fixture({
      ".scratch/example/issues/01-done.md": [
        "# Completed",
        "",
        "- 2aab590 feat(native): setup completes only when every answer is saved; then Home opens",
        "- 44cb2b2 fix: address review findings",
        "- The app stopped; data remains.",
        "",
      ].join("\n"),
    });
    const result = check(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("01-done.md:5 semicolon");
    expect(result.stderr).not.toContain("01-done.md:3");
  });

  it("allows Thai literals and the baht sign but rejects untranslated prose", () => {
    const root = fixture({
      ".scratch/example/spec.md": "# Specification\n\nShow “บันทึก” (save) beside 42 ฿.\n\nระบบอ่านข้อมูลใหม่\n",
    });
    const result = check(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("spec.md:5 thai-prose");
    expect(result.stderr).not.toContain("spec.md:3");
  });

  it("checks sentence length across wrapped Markdown lines", () => {
    const root = fixture({
      ".scratch/example/spec.md":
        "# Specification\n\nThe stored outcome identifies the account and image that produced the result and retains\nevery required field for later recovery after an unexpected failed local write on the device.\n",
    });
    const result = check(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("long-sentence");
    expect(result.stderr).toContain("limit 25");
  });

  it("applies the shorter limit to an instruction", () => {
    const root = fixture({
      ".scratch/example/spec.md":
        "# Specification\n\nRead each stored outcome from the selected account before starting the next round of image discovery after the application becomes active.\n",
    });
    const result = check(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("limit 20");
  });

  it("accepts a literal list without counting masked commas as words", () => {
    const root = fixture({
      ".scratch/example/spec.md":
        "# Specification\n\nMatch the columns: `date`, `time`, `type`, `title`, `category`, `amount`, `account`, `tags`, `note`, `source`.\n",
    });
    expect(check(root).status).toBe(0);
  });

  it("rejects paragraphs above six sentences", () => {
    const root = fixture({
      ".scratch/example/spec.md":
        "# Specification\n\nThe app starts. It reads. It waits. It saves. It stops. It resumes. It finishes.\n",
    });
    expect(check(root).stderr).toContain("long-paragraph");
  });

  it("accepts inline code operands but rejects an unfinished conjunction", () => {
    const root = fixture({
      ".scratch/example/spec.md": "# Specification\n\n- Combine `left` and `right`.\n- Read the result and\n",
    });
    const result = check(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("spec.md:4 dangling-conjunction");
    expect(result.stderr).not.toContain("spec.md:3");
  });

  it("rejects an unclosed code fence", () => {
    const root = fixture({ ".scratch/example/spec.md": "# Specification\n\n````text\n```\n" });
    expect(check(root).stderr).toContain("unclosed-fence");
  });

  it("finds broken targets and incoming links after a heading changes", () => {
    const root = fixture({
      ".scratch/example/spec.md": "# Specification\n\n[Decision](decision.md#old-name).\n[Missing](missing.md).\n",
      ".scratch/example/decision.md": "# New name\n\nThe user approved this decision.\n",
    });
    const result = check(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing-anchor");
    expect(result.stderr).toContain("missing-link");
  });

  it("rejects an unfinished inline link even when its target exists", () => {
    const root = fixture({
      ".scratch/example/spec.md": "# Specification\n\n[Decision](decision.md\n",
      ".scratch/example/decision.md": "# Decision\n",
    });
    expect(check(root).status).toBe(1);
    expect(check(root).stderr).toContain("invalid-link");
  });

  it("supports spaces, parentheses, Unicode headings, duplicates, and reference links", () => {
    const root = fixture(
      {
        ".scratch/example/spec.md": [
          "# Specification",
          "",
          "[Details](<details (old).md#คำตอบ>).",
          "[Second](details\\ \\(old\\).md#same-1).",
          "[Reference][answer].",
          "",
          "[answer]: <details (old).md#คำตอบ>",
        ].join("\n"),
        ".scratch/example/details (old).md": "# คำตอบ\n\n# Same\n\n# Same\n",
      },
      [
        {
          file: ".scratch/example/details (old).md",
          rule: "thai-prose",
          text: "# คำตอบ",
          match: "ค",
          reason: "The user requires this exact Thai heading in the reference fixture.",
        },
      ]
    );
    const result = check(root);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  it("accepts one exact reviewed exception and rejects extra violations on that line", () => {
    const name = ".scratch/example/spec.md";
    const text = 'The UI says "Ready; waiting".';
    const root = fixture({ [name]: "# Specification\n\n" + text + "\n" }, [
      {
        file: name,
        rule: "semicolon",
        text,
        match: ";",
        reason: "The source UI string includes this semicolon and must remain exact.",
      },
    ]);
    expect(check(root).status).toBe(0);
    write(root, name, "# Specification\n\n" + text + " Start work; read results.\n");
    expect(check(root).status).toBe(1);
    expect(check(root).stderr).toContain("Stale or ambiguous exception");
  });

  it("rejects stale exceptions and numeric violation budgets", () => {
    const name = ".scratch/example/spec.md";
    const text = 'The UI says "Ready; waiting".';
    const root = fixture({ [name]: "# Specification\n\n" + text + "\n" }, [
      {
        file: name,
        rule: "semicolon",
        text,
        match: ";",
        reason: "The source UI string must remain exact.",
        baseline: 100,
      },
    ]);
    const result = check(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Each exception needs");
  });

  it("requires another review when an exception no longer matches its text", () => {
    const name = ".scratch/example/spec.md";
    const root = fixture({ [name]: "# Specification\n\nThe UI says Ready.\n" }, [
      {
        file: name,
        rule: "semicolon",
        text: 'The UI says "Ready; waiting".',
        match: ";",
        reason: "The original UI string must remain exact.",
      },
    ]);
    const result = check(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Stale or ambiguous exception");
  });

  it("checks staged prose even when the working copy repairs it", () => {
    const name = ".scratch/example/spec.md";
    const root = fixture({ [name]: "# Specification\n\nThe app stopped; data remains.\n" });
    stage(root);
    write(root, name, "# Specification\n\nThe app stopped. Data remains.\n");
    expect(check(root).status).toBe(0);
    const result = check(root, "--staged");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("semicolon");
  });

  it("checks staged link targets even when an unstaged heading repairs them", () => {
    const root = fixture({
      ".scratch/example/spec.md": "# Specification\n\n[Decision](decision.md#expected).\n",
      ".scratch/example/decision.md": "# Other heading\n",
    });
    stage(root);
    write(root, ".scratch/example/decision.md", "# Expected\n");
    expect(check(root).status).toBe(0);
    expect(check(root, "--staged").stderr).toContain("missing-anchor");
  });

  it("uses staged exceptions rather than unstaged approvals", () => {
    const name = ".scratch/example/spec.md";
    const text = 'The UI says "Ready; waiting".';
    const root = fixture({ [name]: "# Specification\n\n" + text + "\n" });
    stage(root);
    write(
      root,
      "docs/agents/document-exceptions.json",
      JSON.stringify([
        {
          file: name,
          rule: "semicolon",
          text,
          match: ";",
          reason: "The source UI string must remain exact.",
        },
      ])
    );
    expect(check(root).status).toBe(0);
    expect(check(root, "--staged").status).toBe(1);
  });

  it("rejects a link to a working-copy file absent from the commit", () => {
    const root = fixture({
      ".scratch/example/spec.md": "# Specification\n\n[Decision](decision.md).\n",
    });
    stage(root);
    write(root, ".scratch/example/decision.md", "# Decision\n");
    expect(check(root).status).toBe(0);
    expect(check(root, "--staged").stderr).toContain("missing-link");
  });

  // Git sets GIT_DIR for a pre-push hook only when the push comes from a linked worktree.
  it("leaves the hook's repository unchanged when GIT_DIR points at a linked worktree", () => {
    const other = fixture({ "kept.txt": "kept\n" });
    git("init", "--quiet", other);
    git("-C", other, "add", "kept.txt");
    const identity = ["-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false"];
    git("-C", other, ...identity, "commit", "--quiet", "--no-verify", "-m", "Keep");
    const linked = path.join(fixture({}), "linked");
    git("-C", other, "worktree", "add", "--quiet", linked);
    const gitDir = path.join(other, ".git/worktrees/linked");
    const index = readFileSync(path.join(gitDir, "index"));
    const root = fixture({ ".scratch/example/spec.md": "# Specification\n\nThe app stopped; data remains.\n" });
    vi.stubEnv("GIT_DIR", gitDir);
    stage(root);
    const result = check(root, "--staged");
    vi.unstubAllEnvs();
    expect(git("-C", other, "config", "core.bare").trim()).toBe("false");
    expect(readFileSync(path.join(gitDir, "index"))).toEqual(index);
    expect(result.stderr).toContain("spec.md:3 semicolon");
  });

  it("fails explicitly when the required skill is unavailable", () => {
    const root = fixture({ ".scratch/example/spec.md": "# Specification\n\nRead the document.\n" });
    const localChecker = path.join(root, "scripts/check-agent-documents.py");
    write(root, "scripts/check-agent-documents.py", readFileSync(checker, "utf8"));
    const result = spawnSync("python3", [localChecker], { encoding: "utf8", env: isolatedEnv() });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Restore the repository's asd-ste100 skill");
    expect(result.stdout).not.toContain("Agent documents:");
  });
});

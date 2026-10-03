// Runs a Maestro flow against the dev build on the booted iOS simulator and copies its screenshots out.
// Usage: node scripts/ios-preview.mjs <flow.yaml> <out-dir> [--theme light|dark] [--metro-port 8081] [--offline] [--keep-app]
// Needs: API server on :3000 (`vp run dev:server`) and Metro for the dev build (`vp exec expo start --dev-client` in apps/native).
// --offline: the API server is meant to be stopped (error-state flows), so skip its check.
// --keep-app: run on the screen the last flow left open instead of relaunching the app (recovery flows).
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    theme: { type: "string" },
    "metro-port": { type: "string", default: "8081" },
    offline: { type: "boolean", default: false },
    "keep-app": { type: "boolean", default: false },
  },
});
const [flow, outDir] = positionals;
if (!flow || !outDir) throw new Error("usage: node scripts/ios-preview.mjs <flow.yaml> <out-dir> [--theme light|dark]");

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const envFile = path.join(root, ".env.preview.local");
if (!existsSync(envFile))
  throw new Error(".env.preview.local is missing: run `vp run setup:worktree` or ask the user for the preview login");
const env = { ...process.env, MAESTRO_CLI_NO_ANALYTICS: "1" };
for (const line of readFileSync(envFile, "utf8").split("\n")) {
  const match = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  // Maestro exposes MAESTRO_* variables to flows, which keeps the login out of the command line.
  if (match) env[`MAESTRO_${match[1]}`] = match[2];
}
// Maestro needs Java; Homebrew's openjdk is not registered with macOS, so point at it directly.
env.JAVA_HOME ??= "/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home";

const port = values["metro-port"];
for (const [name, url] of [
  ...(values.offline ? [] : [["API server", "http://localhost:3000/"]]),
  ["Metro", `http://localhost:${port}/status`],
]) {
  try {
    execFileSync("curl", ["-sf", "-o", "/dev/null", url]);
  } catch {
    throw new Error(`${name} is not answering at ${url}`);
  }
}

if (values.theme) execFileSync("xcrun", ["simctl", "ui", "booted", "appearance", values.theme]);
if (!values["keep-app"]) {
  const metroUrl = encodeURIComponent(`http://127.0.0.1:${port}`);
  try {
    execFileSync("xcrun", ["simctl", "terminate", "booted", "com.anonymous.moojot"], { stdio: "ignore" });
  } catch {
    // not running yet
  }
  execFileSync("xcrun", ["simctl", "openurl", "booted", `exp+moojot://expo-development-client/?url=${metroUrl}`]);
  execFileSync("sleep", ["15"]);
}

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
  );
const runDir = mkdtempSync(path.join(tmpdir(), "ios-preview-"));
try {
  execFileSync("maestro", ["test", "--test-output-dir", runDir, flow], { env, stdio: "inherit" });
} catch {
  console.error(`maestro failed; its screenshots and UI hierarchy are in ${runDir}`);
  reportFailedStep(runDir);
  process.exit(1);
}

// Names the step Maestro stopped on and the files that show it, so nobody has to dig through the run directory.
function reportFailedStep(dir) {
  const files = walk(dir);
  for (const log of files.filter((f) => path.basename(f) === "commands.json")) {
    const steps = JSON.parse(readFileSync(log, "utf8"));
    const index = steps.findIndex((step) => step.metadata?.status === "FAILED");
    if (index === -1) continue;
    console.error(`failed step ${index + 1}: ${JSON.stringify(steps[index].command)}`);
    console.error(`  ${steps[index].metadata.error?.message ?? "no error message"}`);
  }
  for (const file of files.filter((f) => /\/(screenshots|screen-hierarchy)\/step-/.test(f))) {
    console.error(`  ${file}`);
  }
}

mkdirSync(outDir, { recursive: true });
const suffix = values.theme === "dark" ? "-dark" : "";
for (const file of walk(runDir).filter((f) => f.endsWith(".png") && !path.basename(f).startsWith("screenshot-"))) {
  const target = path.join(outDir, path.basename(file, ".png") + suffix + ".png");
  copyFileSync(file, target);
  console.log(`saved ${path.relative(root, target)}`);
}

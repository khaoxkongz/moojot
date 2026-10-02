// Runs a Maestro flow against the dev build on the booted iOS simulator and copies its screenshots out.
// Usage: node scripts/ios-preview.mjs <flow.yaml> <out-dir> [--theme light|dark] [--metro-port 8081]
// Needs: API server on :3000 (`vp run dev:server`) and Metro for the dev build (`vp exec expo start --dev-client` in apps/native).
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { theme: { type: "string" }, "metro-port": { type: "string", default: "8081" } },
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
  ["API server", "http://localhost:3000/"],
  ["Metro", `http://localhost:${port}/status`],
]) {
  try {
    execFileSync("curl", ["-sf", "-o", "/dev/null", url]);
  } catch {
    throw new Error(`${name} is not answering at ${url}`);
  }
}

if (values.theme) execFileSync("xcrun", ["simctl", "ui", "booted", "appearance", values.theme]);
const metroUrl = encodeURIComponent(`http://127.0.0.1:${port}`);
try {
  execFileSync("xcrun", ["simctl", "terminate", "booted", "com.anonymous.moojot"], { stdio: "ignore" });
} catch {
  // not running yet
}
execFileSync("xcrun", ["simctl", "openurl", "booted", `exp+moojot://expo-development-client/?url=${metroUrl}`]);
execFileSync("sleep", ["15"]);

const runDir = mkdtempSync(path.join(tmpdir(), "ios-preview-"));
try {
  execFileSync("maestro", ["test", "--test-output-dir", runDir, flow], { env, stdio: "inherit" });
} catch {
  console.error(`maestro failed; its screenshots and UI hierarchy are in ${runDir}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const suffix = values.theme === "dark" ? "-dark" : "";
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
  );
for (const file of walk(runDir).filter((f) => f.endsWith(".png") && !path.basename(f).startsWith("screenshot-"))) {
  const target = path.join(outDir, path.basename(file, ".png") + suffix + ".png");
  copyFileSync(file, target);
  console.log(`saved ${path.relative(root, target)}`);
}

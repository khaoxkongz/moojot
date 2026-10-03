// Runs a Maestro flow against the dev build on the booted iOS simulator and copies its screenshots out.
// Usage: node scripts/ios-preview.mjs <flow.yaml> <out-dir> [--theme light|dark] [--metro-port 8081]
//   [--offline] [--keep-app] [--fixture] [--first-start] [--photos grant|revoke|reset]
// Starts the API server on :3000 and Metro for the dev build when they are not answering, and leaves them
// running for the next run; their logs are .preview-logs/server.log and .preview-logs/metro.log.
// --offline: the API server is meant to be stopped (error-state flows), so neither check nor start it.
// --keep-app: run on the screen the last flow left open instead of relaunching the app (error and recovery flows).
//   Error flows pass both flags: a launch without the server stops at the startup error, before any screen.
// --fixture: sign up a new account with setup complete in the development database and pass it to the flow as
//   MAESTRO_FIXTURE_NAME / MAESTRO_FIXTURE_EMAIL / MAESTRO_FIXTURE_PASSWORD, plus MAESTRO_NEW_EMAIL, an address
//   with no account. Every run gets new addresses, so nothing needs cleaning up between runs.
// --first-start: sign the app out and forget the remembered email, so it opens signup as on a first start.
// --photos: before the launch, give the app full photo access (grant), refuse it (revoke), or forget the answer so the
//   system prompt can appear again (reset). The simulator cannot set limited access; only its own prompt can.
import { execFileSync, spawn } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

import { containerNeedsReinstall } from "./sim-container.mjs";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    theme: { type: "string" },
    "metro-port": { type: "string", default: "8081" },
    offline: { type: "boolean", default: false },
    "keep-app": { type: "boolean", default: false },
    fixture: { type: "boolean", default: false },
    "first-start": { type: "boolean", default: false },
    photos: { type: "string" },
  },
});
const [flow, outDir] = positionals;
const appId = "com.anonymous.moojot";
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
const logDir = path.join(root, ".preview-logs");
mkdirSync(logDir, { recursive: true });
const answers = (url) => {
  try {
    execFileSync("curl", ["-sf", "-o", "/dev/null", url]);
    return true;
  } catch {
    return false;
  }
};
// A service another checkout started serves that checkout's code: the API server on :3000 and Metro both.
const services = [
  ...(values.offline
    ? []
    : [
        {
          name: "API server",
          url: "http://localhost:3000/",
          cwd: root,
          args: ["run", "dev:server"],
          log: "server.log",
        },
      ]),
  {
    name: "Metro",
    url: `http://localhost:${port}/status`,
    cwd: path.join(root, "apps/native"),
    args: ["exec", "expo", "start", "--dev-client", "--port", port],
    log: "metro.log",
  },
];
for (const service of services) {
  if (answers(service.url)) continue;
  const out = openSync(path.join(logDir, service.log), "a");
  spawn("vp", service.args, { cwd: service.cwd, detached: true, stdio: ["ignore", out, out] }).unref();
  console.log(`started ${service.name}; log .preview-logs/${service.log}`);
}
for (const service of services) {
  const deadline = Date.now() + 120_000;
  while (!answers(service.url)) {
    if (Date.now() > deadline)
      throw new Error(`${service.name} is not answering at ${service.url}; see .preview-logs/${service.log}`);
    execFileSync("sleep", ["1"]);
  }
}

if (!values["keep-app"]) repairContainer();
if (values.fixture) Object.assign(env, await makeFixture());
if (values["first-start"]) firstStart();
if (values.photos) setPhotoAccess(values.photos);

if (values.theme) execFileSync("xcrun", ["simctl", "ui", "booted", "appearance", values.theme]);
if (!values["keep-app"]) {
  const metroUrl = encodeURIComponent(`http://127.0.0.1:${port}`);
  terminateApp();
  // Read by apps/native/app/_layout.tsx: hides the dev-only LogBox banner, which covers the tab bar.
  execFileSync("xcrun", ["simctl", "spawn", "booted", "defaults", "write", appId, "moojotPreview", "-bool", "YES"]);
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

// Accounts go through the API, so passwords are hashed and settings stored as the app stores them.
async function makeFixture() {
  // The API accepts these requests only from an origin in CORS_ORIGIN (apps/server/.env).
  const cors = /^CORS_ORIGIN=(.*)$/m.exec(readFileSync(path.join(root, "apps/server/.env"), "utf8"));
  if (!cors) throw new Error("CORS_ORIGIN is missing from apps/server/.env");
  const origin = cors[1].split(",")[0].trim();
  // Short addresses: a flow taps a field's centre, then erases backwards, which clears only text left of the cursor.
  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
  const fixture = { name: "หมูกลับมา", email: `d-${stamp}@m.test`, password: "preview-pass-1234" };
  const signUp = await fetch("http://localhost:3000/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(fixture),
  });
  if (!signUp.ok) throw new Error(`fixture sign-up failed: ${signUp.status} ${await signUp.text()}`);
  const cookie = signUp.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  const setting = await fetch("http://localhost:3000/rpc/financePreferences/setSetting", {
    method: "POST",
    headers: { "content-type": "application/json", origin, "x-csrf-token": "orpc", cookie },
    body: JSON.stringify({ json: { key: "onboarding_complete_v1", value: "true" } }),
  });
  if (!setting.ok) throw new Error(`fixture setup flag failed: ${setting.status} ${await setting.text()}`);
  console.log(`fixture account ${fixture.email}`);
  return {
    MAESTRO_FIXTURE_NAME: fixture.name,
    MAESTRO_FIXTURE_EMAIL: fixture.email,
    MAESTRO_FIXTURE_PASSWORD: fixture.password,
    MAESTRO_NEW_EMAIL: `n-${stamp}@m.test`,
  };
}

// The session lives in the simulator keychain (expo-secure-store) and the remembered email in Documents.
function firstStart() {
  terminateApp();
  execFileSync("xcrun", ["simctl", "keychain", "booted", "reset"]);
  rmSync(path.join(appContainer("data"), "Documents", "moojot-last-email-v1.txt"), { force: true });
}

// A privacy change stops a running app, so it happens before the launch.
function setPhotoAccess(action) {
  if (!["grant", "revoke", "reset"].includes(action)) throw new Error("--photos takes grant, revoke or reset");
  terminateApp();
  execFileSync("xcrun", ["simctl", "privacy", "booted", action, "photos", appId]);
}

// Reinstalls the installed build when its data container is incomplete (see scripts/sim-container.mjs, issue 30).
function repairContainer() {
  let installed;
  try {
    installed = appContainer("app");
  } catch {
    throw new Error(
      `${appId} is not installed on the booted simulator: build the dev client first (see the ios-preview skill)`
    );
  }
  if (!containerNeedsReinstall(appContainer("data"))) return;
  console.log(
    "the app's data container is incomplete (issue 30): reinstalling, which can erase its data (such as the remembered email)"
  );
  const tempDir = mkdtempSync(path.join(tmpdir(), "ios-preview-app-"));
  try {
    const copy = path.join(tempDir, "moojot.app");
    cpSync(installed, copy, { recursive: true });
    terminateApp();
    execFileSync("xcrun", ["simctl", "install", "booted", copy]);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
  if (containerNeedsReinstall(appContainer("data")))
    throw new Error("the app's data container is still incomplete after a reinstall; reinstall the dev build");
}

// kind is "app" (the installed .app bundle) or "data" (the data container).
function appContainer(kind) {
  return execFileSync("xcrun", ["simctl", "get_app_container", "booted", appId, kind], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function terminateApp() {
  try {
    execFileSync("xcrun", ["simctl", "terminate", "booted", appId], { stdio: "ignore" });
  } catch {
    // simctl fails when the app is not running, which is the state we want.
  }
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

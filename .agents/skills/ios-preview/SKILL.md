---
name: ios-preview
description: Drive the signed-in Moojot app on the booted iOS simulator and screenshot it. Use when a native UI change must be seen running (before calling a UI ticket done, comparing with design shots, reproducing a UI bug) or when asked to run or screenshot the iOS app.
---

# iOS preview

The dev build (`com.anonymous.moojot`) is already installed on the booted iPhone 11 simulator and talks to the user's development database (MongoDB Atlas), so entries you save are real rows in that account. It is a test account the user made for agents: create, edit, categorize and delete anything in it, including rows another run left behind. Maestro taps the app; `scripts/ios-preview.mjs` wraps one run.

## Steps

1. **Services up.** Each runs until stopped, so start them as background commands with the longest timeout (`7200000`; the 30-minute default stops them mid-run), logging to `.preview-logs/` (gitignored), then confirm both answer:
   - API server: `mkdir -p .preview-logs && vp run dev:server > .preview-logs/server.log 2>&1` (port 3000, reads `apps/server/.env`).
   - Metro for the dev build, inside `apps/native`: `vp exec expo start --dev-client --port 8081 > ../../.preview-logs/metro.log 2>&1`. From a worktree, start Metro there so the app runs your code; the server on :3000 serves whichever checkout started it.
   - When a screen errors or a tap does nothing, read `server.log` (requests that arrived) and `metro.log` (the app's `console` output and red-box errors) before guessing.
   - If the change adds a native module, rebuild first: `vp exec expo run:ios` inside `apps/native` (the user runs this on the iPhone 11 in Device Hub).
2. **Flow.** Flows live in `apps/native/.maestro/`. Start each with `- runFlow: sign-in.yaml`, then tap by accessible name (`tapOn: "หมวด อาหาร"`) and `takeScreenshot: <NN>-app-<state>`. Selectors are regexes, so tap symbols by their Thai label (`บวก`, `คำนวณ`), and see what is on screen with `maestro hierarchy` (needs `JAVA_HOME`, below). Copy `04-manual-entry.yaml` as the pattern.
3. **Run**, once per theme:
   ```sh
   node scripts/ios-preview.mjs apps/native/.maestro/<flow>.yaml <out-dir> --theme light
   node scripts/ios-preview.mjs apps/native/.maestro/<flow>.yaml <out-dir> --theme dark
   ```
   The script restarts the app against Metro, signs in from `.env.preview.local` when needed, runs the flow and copies each screenshot to `<out-dir>` (`-dark` suffix in dark). For a ticket, `<out-dir>` is the feature's `notes/` directory. A failure prints where Maestro left its screenshots and UI hierarchy.
4. **Error and recovery states** (a screen's "ลองอีกครั้ง" card), once per theme, with the app already signed in from a normal run:
   1. Stop the API server: stop its background command, or `lsof -ti tcp:3000 -sTCP:LISTEN | xargs kill`.
   2. Run a flow that opens the screen and waits for the error card with a long `extendedWaitUntil` (the app retries before it shows the card), then screenshots `<NN>-app-<screen>-error`: `node scripts/ios-preview.mjs <error-flow> <out-dir> --theme light --offline`.
   3. Start the server again as in step 1 and wait until `curl -sf localhost:3000/` answers.
   4. Run a flow that taps "ลองอีกครั้ง" once and screenshots `<NN>-app-<screen>-recovered`, on the same screen: `node scripts/ios-preview.mjs <recovery-flow> <out-dir> --theme light --keep-app`.
5. **Done** when every state the change touches has a light and a dark screenshot, and you have looked at each one.

## Gotchas

- `--theme` sets the simulator's appearance; a theme the user saved inside the app wins over it.
- The floating gear on the right is Expo's dev-tools button. Ignore it in comparisons. It also takes taps meant for whatever sits under or beside it, so a button near it (often "ลองอีกครั้ง") seems dead on the first tap: tap the half of the button away from the gear with `tapOn: { point: "x,y" }`, read from the hierarchy.
- Maestro needs Java. The script points `JAVA_HOME` at Homebrew's openjdk; set it the same way for raw `maestro` commands: `export JAVA_HOME=/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home`.
- A `Pressable`'s accessible name is all its text joined ("อาหาร 120 ฿ 3 รายการ"), so match a row by regex (`"อาหาร.*"`), and give icon-only buttons an `accessibilityLabel` (icon glyphs otherwise land in the name). Before guessing a selector after a failed `tapOn`/`assertVisible`/`scrollUntilVisible`, read the real names in the UI hierarchy the failure points to, or run `maestro hierarchy`.
- `.env.preview.local` (gitignored) holds `PREVIEW_EMAIL` / `PREVIEW_PASSWORD`; `vp run setup:worktree` copies it into a worktree. Keep the login out of commits, notes and command lines.

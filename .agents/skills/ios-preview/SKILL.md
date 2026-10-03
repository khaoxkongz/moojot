---
name: ios-preview
description: Drive the signed-in Moojot app on the booted iOS simulator and screenshot it. Use when a native UI change must be seen running (before calling a UI ticket done, comparing with design shots, reproducing a UI bug) or when asked to run or screenshot the iOS app.
---

# iOS preview

The dev build (`com.anonymous.moojot`) is already installed on the iPhone 11 simulator and talks to the user's development database (MongoDB Atlas). That database is the user's own, for agents: sign up accounts, create fixtures, and create, edit or delete any rows, including rows another run left behind. Never start a throwaway database. Maestro taps the app; `scripts/ios-preview.mjs` wraps one run.

## Steps

1. **Simulator booted.** `xcrun simctl list devices booted` lists the iPhone 11; if not, `xcrun simctl boot "iPhone 11"`. The script starts the API server (:3000) and Metro (:8081) itself when they are not answering and leaves them running, logging to `.preview-logs/server.log` and `.preview-logs/metro.log`.
   - A server or Metro that another checkout started serves that checkout's code. From a worktree, stop both first (`lsof -ti tcp:3000,8081 -sTCP:LISTEN | xargs kill`) so the next run starts yours.
   - When a screen errors or a tap does nothing, read `server.log` (requests that arrived) and `metro.log` (the app's `console` output and errors) before guessing.
   - If the change adds a native module, rebuild first: `vp exec expo run:ios` inside `apps/native` (the user runs this on the iPhone 11 in Device Hub).
2. **Flow.** Flows live in `apps/native/.maestro/`. Start each with `- runFlow: sign-in.yaml`, then tap by accessible name (`tapOn: "หมวด อาหาร"`) and `takeScreenshot: <NN>-app-<state>`. Selectors are regexes, so tap symbols by their Thai label (`บวก`, `คำนวณ`), and see what is on screen with `maestro hierarchy` (needs `JAVA_HOME`, below). Copy `04-manual-entry.yaml` as the pattern.
3. **Run**, once per theme:
   ```sh
   node scripts/ios-preview.mjs apps/native/.maestro/<flow>.yaml <out-dir> --theme light
   node scripts/ios-preview.mjs apps/native/.maestro/<flow>.yaml <out-dir> --theme dark
   ```
   The script restarts the app against Metro, signs in from `.env.preview.local` when needed, runs the flow and copies each screenshot to `<out-dir>` (`-dark` suffix in dark). For a ticket, `<out-dir>` is the feature's `notes/` directory. A failure names the failed step and the UI hierarchy file beside its screenshot; read the hierarchy's texts before opening any image.
   - `--fixture`: a flow that needs its own account. The script signs one up with setup complete and passes `MAESTRO_FIXTURE_NAME`, `MAESTRO_FIXTURE_EMAIL`, `MAESTRO_FIXTURE_PASSWORD`, and `MAESTRO_NEW_EMAIL` (an address with no account). Each run gets new short addresses, so there is nothing to clean up.
   - `--first-start`: a flow that starts signed out. The script resets the simulator keychain (the session) and deletes the remembered email, so the app opens signup. `02-auth-flow.yaml` uses both flags.
   - `--photos grant|revoke|reset`: sets the app's photo permission before the launch. `reset` lets the system prompt appear again. The simulator cannot give limited access. Changing photo access in Settings during a flow stops the app, as on a phone. `03-onboarding-photos.yaml` shows the Settings round trip.
4. **Error and recovery states** (a screen's "ลองอีกครั้ง" load-failed card). Home, Summary, Search and Plan each have a flow pair in `apps/native/.maestro/`: `<flow>-error.yaml` and `<flow>-recovered.yaml`, where `<flow>` is `05-home`, `08-summary`, `09-search` or `10-plan`. They cover only those four screens; another screen with the card, such as the pending-categories sheet or entry detail, has no flow pair yet. Run these five sub-steps once per screen and theme, with the same `--theme` in each run:
   1. With the server up, open the app on Home: `node scripts/ios-preview.mjs apps/native/.maestro/sign-in.yaml <out-dir> --theme light`. The relaunch empties the app's cache, so the error flow opens a screen the app has not loaded.
   2. Stop the API server: stop its background command, or `lsof -ti tcp:3000 -sTCP:LISTEN | xargs kill`.
   3. `node scripts/ios-preview.mjs apps/native/.maestro/<flow>-error.yaml <out-dir> --theme light --offline --keep-app` waits for the card and saves `<NN>-app-<screen>-error`. `--offline` skips the server check; `--keep-app` keeps the app open, because a launch without the server stops at a startup error.
   4. Nothing to do: the next run without `--offline` starts the API server again.
   5. `node scripts/ios-preview.mjs apps/native/.maestro/<flow>-recovered.yaml <out-dir> --theme light --keep-app` taps "ลองอีกครั้ง" once and saves `<NN>-app-<screen>-recovered`.

   A recovered flow that stops on the card means the tap sent no request to the server ([issue 24](../../../.scratch/native-redesign-ios/issues/24-ios-first-retry-after-outage.md)): run the five sub-steps again. A new screen with the card gets its own flow pair, copied from these.
5. **Done** when every state the change touches has a light and a dark screenshot, and you have looked at each one.

## Gotchas

- **Human checks.** The simulator cannot check these; put them on the ticket's human checklist instead of trying: password dots (screenshots hide secure text), the left-edge back swipe, the on-screen keyboard's Return key, Keychain autofill and strong-password suggestions, and busy labels (the local server answers too fast).
- **Keyboard.** The on-screen keyboard can cover notices and buttons in the lower half, and `hideKeyboard` fails on the auth screen. Tap a heading (`tapOn: "หมูจด"`) to close it. `eraseText` deletes only left of the cursor, and `tapOn` puts the cursor at the tap point, so keep typed values short enough to end before a field's centre.
- **Missing icons.** When icons vanish, check that the app's data container (`xcrun simctl get_app_container booted com.anonymous.moojot data`) has a `tmp/` directory ([issue 30](../../../.scratch/native-redesign-ios/issues/30-ios-icon-font-download.md)). The script repairs it with a reinstall before each launch, which can erase the app's data.
- **LogBox.** The script sets the simulator preference `moojotPreview`, which hides the dev-only LogBox banner (it covers the tab bar). App errors still reach `metro.log`.
- `--theme` sets the simulator's appearance; a theme the user saved inside the app wins over it.
- The floating gear on the right is Expo's dev-tools button. Ignore it in comparisons; it can sit in a different place from one run to the next. It takes taps meant for whatever sits under or beside it. Tap by name, as the step 4 flows do; when the gear sits on a button and its first tap seems dead, tap the half of the button away from the gear with `tapOn: { point: "x,y" }`, read from the hierarchy.
- Maestro needs Java. The script points `JAVA_HOME` at Homebrew's openjdk; set it the same way for raw `maestro` commands: `export JAVA_HOME=/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home`.
- A `Pressable`'s accessible name is all its text joined ("อาหาร 120 ฿ 3 รายการ"), so match a row by regex (`"อาหาร.*"`), and give icon-only buttons an `accessibilityLabel` (icon glyphs otherwise land in the name). Before guessing a selector after a failed `tapOn`/`assertVisible`/`scrollUntilVisible`, read the real names in the UI hierarchy the failure points to, or run `maestro hierarchy`.
- `.env.preview.local` (gitignored) holds `PREVIEW_EMAIL` / `PREVIEW_PASSWORD`; `vp run setup:worktree` copies it into a worktree. Keep the login out of commits, notes and command lines.

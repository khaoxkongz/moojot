# 30: iOS development build cannot download the icon font

**What to build:** The development build loads the `MaterialCommunityIcons` font from Metro on every launch, so the tab bar and the other icons show again.

**Blocked by:** none

**Status:** done

**Done in:** e65985a fix(native): reinstall the dev build when its simulator data container has no tmp/; 6534324 refactor(native): tidy the ios-preview container repair after review

**Source:** [Spec: Redesign Moojot with iOS acceptance first](../spec.md). Found on 2026-10-03, after ticket 02, during the `ios-preview` changes in commit 18d63ee.

## Observed behavior (iPhone 11 simulator, development build, 2026-10-03)

1. Launch the app against Metro on port 8081.
2. The app logs this error 3 to 5 times for each launch: `UnableToDownloadAssetException: Unable to download asset from url: 'http://127.0.0.1:8081/assets/?unstable_path=.%2Fnode_modules%2F%40expo%2Fvector-icons%2Fbuild%2Fvendor%2Freact-native-vector-icons%2FFonts/MaterialCommunityIcons.ttf?platform=ios&hash=6e435534bd35da5fef04168860a9b8fa' (at ExpoAsset/AssetModule.swift:80)`.
3. The tab bar shows the labels “หน้าแรก” (Home) and “พี่มนุษย์” (profile) without their icons.
4. The LogBox banner covers the tab bar. A tap on a tab opens the full-screen LogBox view.

The error occurred in every launch. It occurred with a cold Metro and with a warm Metro. It also occurred after a simulator reboot.

## Facts found

- Metro serves the font. A `curl` request to the same URL on the Mac returned HTTP 200, `font/ttf`, and 1,307,660 bytes.
- The font is correct. The MD5 of the response and of `apps/native/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf` is `6e435534bd35da5fef04168860a9b8fa`. This value agrees with the `hash` in the URL.
- In `expo-asset/ios/AssetModule.swift`, `downloadAsset` rejects with `UnableToDownloadAssetException` when `URLSession` gives no downloaded file. Thus the download fails inside the app, before the hash check.
- The app imports `MaterialCommunityIcons` in `app/(app)/(tabs)/_layout.tsx`, `plan.tsx`, `budget-form.tsx`, `search.tsx`, and `summary.tsx`.

## First occurrence

- `notes/02-app-home-welcome.png` (2026-10-03 18:26, commit 3f47764) shows the tab icons.
- `notes/05-app-home.png` (2026-10-02, commit 84dc6ba) shows the tab icons.
- The first capture without the icons is from 2026-10-03 23:27, on `dev` at 93a9c71.
- Between 3f47764 and 93a9c71, `apps/native` has no code change. Only documents and merges changed.
- Between the two captures, the user and an agent installed the root dependencies again several times (`vp add`, `vp remove`, `vp install`). The simulator also rebooted. `bun.lock` is the same as on `dev`. The cause is unknown.

## Current workaround

Commit 18d63ee hides the LogBox banner during `scripts/ios-preview.mjs` runs only. The script sets the simulator preference `moojotPreview`. App errors still go to `.preview-logs/metro.log`. The missing icons remain.

- [x] Find the cause. Compare the installed `expo-asset`, `@expo/vector-icons`, and `expo` versions with `bun.lock`. Clear the Metro cache (`expo start --clear`). Check the request from the simulator with the network log of the app.
- [x] The tab bar and the other icons show after a launch, and the app logs no `UnableToDownloadAssetException`.
- [x] Check the development build on the physical iPhone 13 Pro.

## Comments

**Cause, found on the iPhone 11 simulator, 2026-10-03:** An unknown tool deleted the app's data container. The app then made a new folder at the same path. That folder had only `Library/Caches`. It had no `tmp/` and no container-manager metadata file.

`URLSession` writes each download to `tmp/` first. Thus each Metro asset download failed (`__NSCFLocalDownloadFile: error 2 creating temp file`, `NSPOSIXErrorDomain Code=2`). Metro sent HTTP 200 each time. The fonts did not load, and `expo-asset` rejected with `UnableToDownloadAssetException`.

The installed package versions agree with `bun.lock`. The double `?` in the URL and ATS are not the cause.

Evidence:

- The simulator log (`log show`, subsystem `com.apple.CFNetwork`) showed 2 failed downloads in each launch. After `mkdir tmp` in the container, the next launch had 0 failed downloads.
- A reinstall of the same `.app` (`simctl install`) made a new, complete container. Then the launches had 0 failed downloads.
- When we moved the container away, the failure occurred again. Then `scripts/ios-preview.mjs` made a complete container again without help.

**Fix:** Before each launch, `scripts/ios-preview.mjs` checks the data container. If `tmp/` or the metadata file is missing, the script installs the installed build again. `scripts/sim-container.test.mjs` tests this check. A new container shows the dev menu's intro sheet one time, so `sign-in.yaml` now closes it. The `ios-preview` skill has a new "Missing icons" item.

**Scope of the fix:** Only `scripts/ios-preview.mjs` makes the container complete again. A launch from `expo run:ios`, from the Home screen, or from `vp dev` does not. The app cannot do it, because a process outside the app deleted the container. In these cases, delete the app and install it again.

**Check on the simulator:** We ran `30-tab-icons.yaml` four times, two in light and two in dark. Each run showed the tab bar icons ([light](../notes/30-app-tab-icons.png), [dark](../notes/30-app-tab-icons-dark.png)). The simulator log had no failed download. `.preview-logs/metro.log` had no `UnableToDownloadAssetException`.

`30-tab-icons.yaml` only makes the screenshots. It has no assertion that the icons show. In the UI hierarchy, each tab has only its label text, for example `หน้าแรก, tab, 1 of 2`. The hierarchy has no element and no text for the icon. Thus Maestro cannot check the icons with an `assertVisible` command. A person must look at the screenshots.

**LogBox:** The `moojotPreview` change from commit 18d63ee stays. Other development warnings can also show the banner over the tab bar. App errors still go to `metro.log`.

**Human check on the physical iPhone 13 Pro:**

1. Run Metro from this checkout. Open the development build on the iPhone.
2. Look at the tab bar. Make sure that the icons for “หน้าแรก” (Home) and “พี่มนุษย์” (profile) show.
3. Make sure that no `UnableToDownloadAssetException` LogBox banner shows.
4. Close the app fully and open it again. Do steps 2 and 3 again.
5. If the icons are missing, delete the app and install it again with `vp exec expo run:ios --device`. Then do steps 2 to 4 again.

**Result on the physical iPhone 13 Pro (2026-10-04):** The user did the check above. All steps passed.

# 30: iOS development build cannot download the icon font

**What to build:** The development build loads the `MaterialCommunityIcons` font from Metro on every launch, so the tab bar and the other icons show again.

**Blocked by:** none

**Status:** needs-triage

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

- [ ] Find the cause. Compare the installed `expo-asset`, `@expo/vector-icons`, and `expo` versions with `bun.lock`. Clear the Metro cache (`expo start --clear`). Check the request from the simulator with the network log of the app.
- [ ] The tab bar and the other icons show after a launch, and the app logs no `UnableToDownloadAssetException`.
- [ ] Check the development build on the physical iPhone 13 Pro.

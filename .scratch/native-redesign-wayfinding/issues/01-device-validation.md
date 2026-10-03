# Define platforms and redesign validation

Label: wayfinder:grilling
Type: grilling
Mode: HITL
Status: resolved
Assignee: Codex (/root)
Parent: [Plan the Moojot app redesign](../map.md)

## Question

Will the user try the redesign on iPhone, Android, or both? Which platforms need runtime evidence before accepting each phase? Distinguish supported platforms from available test devices. Inspect repository run methods before proposing options.

## Answer

### Current agreement

- The app still targets iPhone and Android. This redesign round checks and accepts iOS first.
- Use the user's physical iPhone 13 Pro through Expo Go during development. Check each phase's appearance and behavior.
- Use an iPhone 11 simulator through Device Hub for additional iOS checks. Report physical-device and simulator results separately.
- Defer Android SDK/AVD preparation, Android runs, and Android runtime checks. They are not acceptance conditions for this iOS round.
- Retain shared app code. Record platform-specific limitations for later Android work. Passing iOS checks does not establish Android results.

### Effect on the plan

- The spec requires iOS runtime/UI evidence. Android verification is later work. This decision defines validation, rather than reporting completed redesign checks.
- Later Android work requires its environment and real permission, photo-library, keyboard, back-navigation, and layout checks. iOS results do not cover them.
- Future discussions explain terms through real scenarios and ask about one topic at a time. The user can revisit this approach.

## Comments

### Available devices

- The user reported an iPhone 13 Pro for testing.
- The user initially chose support for iPhone and Android.
- These comments record the discussion sequence. The current agreement appears in Answer below.

### Questions about two platforms

- The user asked how platforms differ and which work an iPhone-only start would reduce.
- The explanation described shared core app code and backend code. Android adds platform-specific behavior and screen, permission, keyboard, and back-navigation checks. It also adds Android builds and runtime checks.
- Starting with iPhone defers these Android tasks. The redesign's backend requirements remain.
- Reference: [React Native: Platform-Specific Code](https://reactnative.dev/docs/0.86/platform-specific-code).

### Run methods found in the repository

- [Earlier slip device checks](../../native-slip-auto-import/issues/05-device-check.md) report physical-iPhone testing through Expo Go and LAN on 29 September 2569 (2026). They omit the model and do not establish checks of every screen or behavior.
- `apps/native/package.json` provides Expo startup, `expo run:ios`, `expo run:android`, and `expo-dev-client`. These commands alone do not prove successful runtime checks.
- Earlier notes report no installed Android tooling or Android evidence. Define Android validation if Android is a supported platform.

### Additional user details

- The user specified development through Expo Go on iPhone 13 Pro. Some iPhone 11 checks used Device Hub.app.
- Machine metadata showed macOS 27.0.1 and Xcode 27.0. Device Hub path: `/Applications/Xcode.app/Contents/Applications/DeviceHub.app`. Bundle identifier: `com.apple.dt.Devices`.
- CoreSimulator contained an iPhone 11 configuration with iOS 27.0. This did not establish whether the reported checks used a simulator or physical device. It also did not establish runtime checks of the redesign.
- [Apple: Device Hub](https://developer.apple.com/documentation/xcode/device-hub) covers physical devices and simulators. Use the installed Xcode tool's name in run instructions.

### Latest scope change

The user requested iOS-only checks now and Android checks later. This replaces the initial plan to check Android in this round. The current scope appears below.

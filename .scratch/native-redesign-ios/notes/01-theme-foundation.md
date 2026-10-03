# Notes from ticket 01 (theme foundation)

## Design reference

The versioned reference is `docs/design/native-redesign-2026-09-30/`: README, HTML, assets, fonts, screenshots, and SHA-256s in `VERSION.md`. Lint/format ignore `docs/design/**`. The spec's Further Notes links there.

## Palette and geometry

`constants/theme.ts` follows the spec. Text colors are `success`/`danger`: #006F30/#AD3414 in light and #20D269/#FF9984 in dark. Callers now use those instead of deleted `successText`/`dangerText`.

Fills behind `onAccent`, including badges/bars, use `successFill`/`dangerFill` (#00C853/#FF5F38). `accentSoft` remains only for the Plan gradient. Other tokens are `inverse`, `onInverse`, `inverseAccent`, and `shade`. Theme type is `AppThemeMode`.

Geometry uses `radius`, `space`, `touch`, and shadows:

- `radius`: hero 20, card 16, tile 14, chip 20, sheet 24, tabBar 17, input 14.
- `touch`: minimum 44, button 52, row 60.
- `shadow.float/toast/dialog/segment`.
- `raisedRing(theme)` / `accentRing(theme)` create inset `boxShadow` rings. Cards have no shadow. `shadow.card` is deprecated.

## Fonts and amounts

The app bundles only LINE Seed Sans TH Regular. The change deleted Bold/ExtraBold/Heavy/Thin. The `Text` wrapper discards Thai fontWeight, so old `fontWeight: "800"` renders Regular. `fontVariant: ["tabular-nums"]` selects system font with maximum weight 500. Default is 500. Nested children may request "400", such as ฿.

`Text`/`TextInput` default `maxFontSizeMultiplier` to 1.3 (`MAX_FONT_SCALE`). Each element may override it. Use `fontFaces.regular` instead of deleted `fontFamilyForWeight`.

Use `Amount` or `bahtFontSize(size)` from controls. ฿ follows the number at 55% size and regular weight. Home rows/subtotals use `Amount showBaht={false}`. Other screens still use prefix-฿ `formatMoney`. Adapt them during redesign.

## Shared controls and settings

`components/ui/controls.tsx` provides `Amount`, `IconButton`, `PillButton`, `ScreenHeader`, `SegmentedControl`, `Chip`, `RadioCard`, `GroupedList`/`GroupedRow`, and `InfoBox`. `PillButton` remains enabled, but `busy`/`busyLabel` ignore taps. Danger `InfoBox` has alert role. Existing `components/ui/moo-ui.tsx` remains unchanged for Plan/budget/recurring forms.

`SettingsPage` uses `ScreenHeader` on `background` instead of the accent header. Its `right` slot remains unchanged.

## Theme persistence

- `lib/theme-preference.ts` owns the tested store.
- `lib/device-theme-storage.ts` is the adapter.
- `lib/use-color-scheme.ts` owns singleton/hooks. Storage is `Documents/moojot-theme-v1.txt` on device and localStorage on web.

`useColorScheme()` / `useAppTheme()` follow the chosen theme, otherwise device appearance. Synchronize `Appearance.setColorScheme` so keyboard/alerts match. Root retains splash until fonts and theme load.

`app/(app)/(settings)/settings/theme.tsx` uses radio cards and retryable load/save info boxes. Ticket 20 should move it into a profile sheet. Reuse `themePreference.choose` and `useThemePreference()`.

Tab labels are 12, with 26 icons filled on focus. The navigator handles safe area without fixed bar height.

## iOS simulator startup from a fresh worktree

- Run `vp run setup:worktree`. It copies `.env`, installs dependencies, and generates Prisma client during install.
- Installed `expo-dev-client` makes `expo start --ios` seek a development build. Use Expo Go explicitly.
- In `apps/native`, run `EXPO_PUBLIC_SERVER_URL=http://localhost:3000 CI=1 npx expo start --go --port 8099`.
- Then run `xcrun simctl openurl booted exp://127.0.0.1:8099`. First openurl may timeout while Expo Go starts, but still opens.
- Skip Expo Go development-menu onboarding with `xcrun simctl spawn booted defaults write host.exp.Exponent EXDevMenuIsOnboardingFinished -bool YES`.
- At this point, idb/axe tap automation was unavailable. The agent captured only signed-out screens.
- Switch appearance with `xcrun simctl ui booted appearance dark|light`.
- [Light](01-sim-iphone11-signin-light.png) and [dark](01-sim-iphone11-signin-dark.png) screenshots are beside this file. The captures used no stored user choice. Device appearance changed, and root/status/auth followed it.

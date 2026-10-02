# Notes from ticket 01 (theme foundation)

## For later tickets

- Design reference lives in the repo at `docs/design/native-redesign-2026-09-30/` (README, HTML prototype, assets, fonts, screenshots, `VERSION.md` with SHA-256s). Lint/format ignore `docs/design/**`. The spec's Further Notes link there now.
- Palette: `constants/theme.ts` follows the spec table. `success`/`danger` are TEXT colors (#006F30/#AD3414 light, #20D269/#FF9984 dark); `successText`/`dangerText` were removed (all callers renamed). For fills behind `onAccent` (badges, chart bars) use `successFill`/`dangerFill` (#00C853/#FF5F38). `accentSoft` kept only for the plan gradient. Also `inverse`, `onInverse`, `inverseAccent`, `shade`. One theme type: `AppThemeMode`.
- Geometry tokens: `radius` (hero 20, card 16, tile 14, chip 20, sheet 24, tabBar 17, input 14), `space`, `touch` (min 44, button 52, row 60), `shadow.float/toast/dialog/segment`, `raisedRing(theme)` / `accentRing(theme)` (inset boxShadow rings; cards have no drop shadow). `shadow.card` deprecated.
- Fonts: only LINE Seed Sans TH Regular is bundled now (Bold/ExtraBold/Heavy/Thin removed). The `Text` wrapper drops every fontWeight for Thai text, so old `fontWeight: "800"` styles render Regular. Any Text with `fontVariant: ["tabular-nums"]` switches to the system font and is clamped to weight 500 (defaults to 500; a nested child can ask for "400", e.g. the ฿ sign).
- `Text`/`TextInput` default `maxFontSizeMultiplier` = 1.3 (`MAX_FONT_SCALE`), overridable per element.
- New shared controls in `components/ui/controls.tsx`: `Amount`, `IconButton`, `PillButton` (never disabled; `busy` + `busyLabel` ignores taps), `ScreenHeader`, `SegmentedControl`, `Chip`, `RadioCard`, `GroupedList`/`GroupedRow`, `InfoBox` (tone danger = alert role). Old `components/ui/moo-ui.tsx` untouched (used by plan/budget/recurring forms).
- `SettingsPage` (all settings sub-screens) now uses `ScreenHeader` on `background` instead of the accent header; its `right` slot is unchanged.
- Amounts: use `Amount` (or `bahtFontSize(size)` from controls) so ฿ sits after the number at 55% in the regular weight. Home rows/subtotals use `Amount showBaht={false}`; `formatMoney` (฿ prefix) is still used by other screens — fix as they are restyled.
- `fontFamilyForWeight` was removed; use `fontFaces.regular`.
- Theme preference: `lib/theme-preference.ts` (store, tested), `lib/device-theme-storage.ts` (adapter), `lib/use-color-scheme.ts` (singleton + hooks; device file `Documents/moojot-theme-v1.txt`, localStorage on web). `useColorScheme()` / `useAppTheme()` follow the chosen theme, else the device. `Appearance.setColorScheme` is synced so native views (keyboard, alerts) match. Root layout keeps the splash up until fonts AND the theme are loaded. Theme screen: `app/(app)/(settings)/settings/theme.tsx` (radio cards; load/save failure info boxes with retry). Ticket 20 should move it into a profile sheet and can reuse `themePreference.choose` + `useThemePreference()`.
- Tab bar: label 12, icons 26 (filled when focused), no fixed height (safe area handled by the navigator).

## Running on the iOS simulator (worked from a fresh worktree)

- Fresh worktree: `vp run setup:worktree` (copies the `.env` files, installs, and the install generates the Prisma client).
- `expo-dev-client` is installed, so `expo start --ios` looks for a dev build. Use Expo Go explicitly: `EXPO_PUBLIC_SERVER_URL=http://localhost:3000 CI=1 npx expo start --go --port 8099` in `apps/native`, then `xcrun simctl openurl booted exp://127.0.0.1:8099` (first openurl may time out while Expo Go launches; it still opens).
- Skip Expo Go's dev-menu onboarding sheet: `xcrun simctl spawn booted defaults write host.exp.Exponent EXDevMenuIsOnboardingFinished -bool YES`.
- No tap automation (no idb/axe), so only signed-out screens were captured. Device theme: `xcrun simctl ui booted appearance dark|light`.
- Screenshots (next to this file): [light](01-sim-iphone11-signin-light.png), [dark](01-sim-iphone11-signin-dark.png) (no saved choice, device appearance switched; root, status bar and auth screen all follow).

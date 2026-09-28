# Native route opportunities after the onboarding split

Implementation status (2026-09-28): Settings detail now has ten route-owned screens,
`/category-form` is a compatibility redirect to Categories or Tags, and the remaining
app screens now live in their route files. Account's data-management sheet remains
local because it has not grown beyond the conditional case described below. The
analysis and file references that follow describe the pre-refactor state.

Date: 2026-09-28. Scope: `apps/native/src/app` and the screen components those routes render. This is a read-only source audit; no navigation or runtime behavior was changed or tested. The recommendation follows the current onboarding pattern: each route file declares its own screen component and JSX, while genuinely shared UI and data helpers can remain outside `src/app` (`apps/native/src/app/onboarding/(profile)/birthday.tsx:14-21`, `:53-56`).

## Recommendation at a glance

| Priority    | Area                    | Recommendation                                                                                                                                                  |
| ----------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High        | Settings detail         | Replace the `settings-detail?section=...` multiplexed screen with one route per section. Move each section's screen body into its route file.                   |
| Medium      | Category form           | Check whether `/category-form` is an obsolete route; internal navigation now uses separate Categories and Tags screens.                                         |
| Medium      | Existing app screens    | Migrate three-line re-export routes to route-owned screen components when touching each feature. This is ownership cleanup, not a reason to invent more routes. |
| Conditional | Account data management | Consider one separate data-management route if this flow grows; retain short edit and information sheets for now.                                               |

## 1. High: Settings detail has ten destinations inside one screen

The Settings tab sends ten menu choices to the same `/settings-detail` route with a `section` parameter (`apps/native/src/features/settings/settings-screen.tsx:321-323`, `:438-469`, `:475-476`). The destination enumerates those ten section values, derives the heading from a lookup, and defaults unknown values to `account` (`apps/native/src/features/settings/settings-detail-screen.tsx:19-49`, `:136-139`). One `content()` switch renders the explanatory pages and separate branches render Account, Cards, and Calendar screens (`apps/native/src/features/settings/settings-detail-screen.tsx:230-232`, `:365-454`, `:485-545`). Thus a change to FAQ, calendar, cards, or account behavior involves the same screen module. This is the closest match to the former onboarding problem.

Suggested target, with `/settings` continuing to be the existing tab:

```text
src/app/(app)/
  (tabs)/settings.tsx                 # existing Settings tab; move its screen body here
  (settings)/settings/
    account.tsx                       # Account route owns its screen and local sheets
    cards.tsx                         # Cards route owns its query, loading UI, and content
    calendar.tsx                      # Calendar route owns its editor and reset control
    theme.tsx
    language.tsx
    guide.tsx
    faq.tsx
    slips.tsx
    supported-cards.tsx
    slip-help.tsx
```

The proposed directory is a target design, not a verified Expo Router manifest. Verify that the existing `(tabs)/settings.tsx` and proposed `/settings/*` paths resolve as intended with typed routes before migration. If this pairing produces a route collision, use distinct paths under `(settings)` and update callers together. In either case, avoid route files that only re-export `features/settings/*-screen`.

Migration details:

- Replace each `detail(section)` call in the Settings menu with its specific pathname; the current dynamic navigation is concentrated in `settings-screen.tsx:321-323`. The `slips` page currently changes `section` in place to show help (`settings-detail-screen.tsx:417-419`); decide whether the new action should `push` Help so Back returns to Slips. That is a user-visible navigation change.
- Move presentation decisions into explicit route options. Today one `Stack.Screen` computes `card` versus `modal` from `route.params.section`, with Account, Calendar, Theme, and Language treated as full pages (`apps/native/src/app/(app)/_layout.tsx:6`, `:45-55`). Preserve that distinction as each route is registered.
- Account, Cards, and Calendar already have substantial independent UI behind the switch (`settings-detail-screen.tsx:485-523`); the Account screen owns profile queries and its edit sheets (`apps/native/src/features/settings/components/account-screen.tsx:245-291`), and Calendar owns four settings queries and one save operation (`apps/native/src/features/settings/components/calendar-screen.tsx:235-258`, `:315-341`). Move their screen logic into route files rather than adding another wrapper. Small shared header/row/panel primitives can stay in `features/settings/components`.
- Do not carry over now-unreachable generic content for Account, Cards, and Calendar when moving sections. `content()` defines branches for all three (`settings-detail-screen.tsx:232-319`), but the outer render handles those sections before calling `content()` (`settings-detail-screen.tsx:485-532`). This appears to be legacy UI; confirm visually before deleting it.
- Treat each new settings route as independently enterable. The app defines a `moojot` URL scheme (`apps/native/app.json:8`), while the root stack protects the whole `(app)` group based on completion and session (`apps/native/src/app/_layout.tsx:57-76`). Account, Cards, and Calendar load their own data on focus, so they do not need a draft provider like onboarding (`account-screen.tsx:245-275`; `calendar-screen.tsx:235-263`; `settings-detail-screen.tsx:140-145`). Preserve a valid fallback for Back when a route is opened without prior Settings history; the current destination already falls back to `/settings` (`settings-detail-screen.tsx:76-79`).

## 2. Medium: `/category-form` may be an orphaned older editor

`/category-form` is still a registered modal and a three-line re-export of `CategoryFormScreen` (`apps/native/src/app/(app)/_layout.tsx:41-44`, `apps/native/src/app/(app)/(categories)/category-form.tsx:1-3`). That screen combines expense categories, income categories, and tags behind a local section selector and handles all three sets of mutations (`apps/native/src/features/categories/category-form-screen.tsx:40-57`, `:181-233`). However, the Settings menu now navigates to `/categories` and `/tags` separately, and the Entry and Budget flows also navigate to those routes (`apps/native/src/features/settings/settings-screen.tsx:441-444`, `apps/native/src/features/entries/entry-screen.tsx:708-718`, `apps/native/src/features/planning/budget-form-screen.tsx:305`). The Categories and Tags screens each implement their own creation and editing modal (`apps/native/src/features/categories/category-manage-screen.tsx:44-71`, `:221-270`; `apps/native/src/features/categories/tags-screen.tsx:46-72`, `:218-276`). A source search of `apps/native/src`, `apps/native/app.json`, and `apps/native/README.md` found no internal navigation to `/category-form`; this is an audit observation, not proof that no outside caller exists.

Recommendation: confirm whether shipped app versions, notifications, or external links target `/category-form` before removing or redirecting it; the app does define a `moojot` URL scheme (`apps/native/app.json:8`). If compatibility is needed, keep a redirect to `/categories` or `/tags` based on the existing `section` parameter (`category-form-screen.tsx:40-46`). If it has no external users, delete the unused route and old combined screen in a separate cleanup. Do not invest in splitting this particular editor into three new routes while the separate Categories and Tags destinations already exist.

## 3. Medium: Most existing app routes do not own their screens

Seventeen route files are three-line import-and-re-export wrappers. Examples include the Home tab, Settings tab, Entry editor, and Settings detail (`apps/native/src/app/(app)/(tabs)/index.tsx:1-3`, `apps/native/src/app/(app)/(tabs)/settings.tsx:1-3`, `apps/native/src/app/(app)/(entries)/entry.tsx:1-3`, `apps/native/src/app/(app)/(settings)/settings-detail.tsx:1-3`). `categories.tsx` is a slightly thicker wrapper only because it adds `Stack.Screen` options before rendering `CategoryManageScreen` (`apps/native/src/app/(app)/(categories)/categories.tsx:1-11`). The app Stack already lists the distinct destinations—Entry, Search, Import, Review, Plan, forms, Categories, Tags, and Streak pages (`apps/native/src/app/(app)/_layout.tsx:19-56`).

For the stated route-ownership preference, migrate each screen implementation into its corresponding route file when that feature is next edited. Keep non-screen queries, mutations, parsing, and reusable components in `features`. This improves navigation discoverability without changing screen count or behavior. Start with Settings as part of recommendation 1, then use feature work as the occasion for the other moves. A mass move across every screen would create a large diff with little immediate user benefit; the actual multi-destination problem is concentrated in Settings detail.

## 4. Conditional: Account's data-management sheet

Account currently uses one local `sheet` state for email, birthday, two consent choices, Terms, Privacy, and data management (`apps/native/src/features/settings/components/account-screen.tsx:79-82`, `:285-291`, `:438-487`). The data sheet combines backup guidance, demo data creation, and a destructive reset (`account-screen.tsx:680-705`), backed by async mutations and confirmation (`account-screen.tsx:361-405`). If that area gains more controls or explanatory content, a dedicated `/settings/data` route would provide a clearer destination and isolated state. At present, it is an optional follow-up rather than a prerequisite to the Settings split.

Keep birthday selection and consent choices as local sheets: they edit one value, save, and close (`account-screen.tsx:306-337`, `:519-655`). Terms and Privacy are currently short informational sheets (`account-screen.tsx:658-678`); separate routes would add navigation without reducing meaningful complexity. Preserve the platform-specific date picker handling if Account moves (`account-screen.tsx:527-614`).

## Where route splitting would be counterproductive now

- **Streak tutorial:** It has four content records but one presentation template, one `page` index, and Back/Next buttons (`apps/native/src/features/streak/streak-tutorial-screen.tsx:15-61`, `:97-113`, `:185-213`). Four routes would duplicate the same layout and turn a simple local pager into navigation state. Move its one screen body into its route for ownership, but keep its slides local.
- **Entry editor:** Create and edit share a form; `id` controls hydration and update versus create (`apps/native/src/features/entries/entry-screen.tsx:243-279`, `:297-333`, `:396-408`). Calculator, category/tag picker, calendar, and exit confirmation are transient overlays tied to the unsaved draft (`entry-screen.tsx:255-265`, `:696-728`). Separate routes for those overlays would require draft transfer and change close behavior. A route-owned Entry screen is useful; extra routes are not justified by this source.
- **Import picker:** Slip and PDF modes are tabs in a single short selection screen with one shared analysis/review transition (`apps/native/src/features/imports/import-screen.tsx:16-41`, `:114-139`). Review consumes a module-level in-memory session and explicitly handles no session (`apps/native/src/features/imports/session.ts:3-15`, `apps/native/src/features/imports/review-screen.tsx:37-50`, `:151-159`). If import routes change later, preserve that missing-session behavior and evaluate persistence separately; splitting the two picker modes alone offers little clarity.
- **Category form and summary filters:** Category form switches among expense, income, and tag editing within one form (`apps/native/src/features/categories/category-form-screen.tsx:40-57`, `:181-233`). Summary's kind, breakdown, period, and wallet filter all modify one analysis view and its queries (`apps/native/src/features/home/summary-screen.tsx:140-153`, `:161-204`). These are local view modes, not independent journeys comparable to onboarding.

## Suggested validation if implemented

Check the generated typed route paths and Stack presentation, then navigate from every Settings menu item, from Slips to Help and Back, and into each Settings destination from a fresh app launch or deep link. Verify Account, Calendar, and Cards data/loading states independently; verify Android hardware Back and iOS swipe/back for card and modal presentations. These are implementation checks, not claims that the current audit has run them.

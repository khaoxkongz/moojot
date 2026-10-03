# Notes from ticket 02 (signup and sign-in)

## Auth contract

Better Auth 1.7.5 answers every failed email sign-in with `INVALID_EMAIL_OR_PASSWORD`. That code cannot tell an unknown email from a wrong password.

The `signInFacts` plugin in `packages/auth/src/sign-in-facts.ts` runs after a failed `/sign-in/email`. It looks the email up and replaces the code:

- No user with that email: `EMAIL_NOT_REGISTERED`.
- A user with a credential password: `WRONG_PASSWORD`.
- A user without a password: the original `INVALID_EMAIL_OR_PASSWORD`.

Duplicate signup already returns `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` with status 422. The app shows that code as a registered email.

The plugin tells anyone whether an email has an account. The signup route already told them, and the design requires the distinction. A rate limit or an email check can follow if this becomes a concern.

## Native form

`features/auth/auth-form.ts` owns the form for both modes. It has no React code, so `apps/server/test/auth-flow.test.ts` imports it by path.

- `startAuthForm({ rememberedEmail })` opens signup without an email. With an email, it opens sign-in with that email and an empty password.
- `switchAuthMode` keeps name, email, and password. It clears errors and the account notice.
- `editAuthField` clears only that field's error, and the notice.
- `checkAuthForm` gives one error per incomplete field. The name counts only in signup.
- `submitAuthForm(client, form)` checks first and sends nothing when a field is incomplete. Its result is `signed-up`, `signed-in`, `invalid`, or `refused`.
- A form that passes the check goes to the server without its old errors and notice, as the handoff's `submitAuth` does. A refused result therefore holds only the server's answer about this submit.
- `pendingAuthForm` gives the form for the pending time. It clears the old errors and notice when the check passes.
- `authSubmitter(client)` returns the pending result for a second call, so a double tap sends one request.
- `applyAuthOutcome(current, sent, answered)` keeps typing that occurred during the request. An error stays only on an unchanged field. The notice stays only when no value changed.

`AUTH_MODES` holds each text and setting that differs between signup and sign-in. `PASSWORD_RULE` holds the password rule text. The rule text, the placeholder, and the error get the number 8 from one length constant.

The type of a field name is `AuthFieldName`.

Each server code maps to one message:

| Code                                    | Shown as                                                                                                                    |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `EMAIL_NOT_REGISTERED`                  | Notice “ยังไม่มีบัญชีของอีเมลนี้” (no account uses this email), action “สมัครสมาชิกด้วยอีเมลนี้” (sign up with this email)  |
| `WRONG_PASSWORD`                        | Password error “รหัสผ่านไม่ถูกต้อง ลองอีกครั้ง” (wrong password, try again)                                                 |
| `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` | Notice “อีเมลนี้มีบัญชีอยู่แล้ว” (this email has an account), action “เข้าสู่ระบบด้วยอีเมลนี้” (sign in with this email)    |
| `INVALID_EMAIL_OR_PASSWORD`             | Notice “อีเมลหรือรหัสผ่านไม่ถูกต้อง” (email or password is wrong), no action                                                |
| `PASSWORD_TOO_LONG`                     | Password error “รหัสผ่านต้องไม่เกิน 128 ตัวอักษร” (at most 128 characters)                                                  |
| Status 429                              | Notice “ลองหลายครั้งเกินไป รอสักครู่แล้วลองอีกครั้ง” (too many tries, wait and try again)                                   |
| No response                             | Notice “เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง” (cannot connect, check the network and try again)                  |
| Other                                   | Notice “สมัครสมาชิกไม่สำเร็จ ลองอีกครั้ง” (signup failed) or “เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้ง” (sign-in failed), try again |

## Remembered email

The remembered email is the email of the latest account that signed in on the device. `lib/remembered-email.ts` is the tested store. `lib/device-remembered-email.ts` is the adapter. The root loads the store before it hides the splash, like the theme choice.

On the device, the adapter keeps the email in the file `Documents/moojot-last-email-v1.txt`. The web adapter uses the same key. The key keeps its first name, because a changed key loses the email that devices hold now.

The root writes each signed-in session email to the store. After sign-out the auth screen opens in sign-in mode with that email. A device without the file makes a first start and opens signup.

A cold start after a sign-out also opens sign-in, because the file stays. The prototype opens signup on every reload, because it keeps nothing.

## Routes and guards

- `app/(auth)/index.tsx` is the splash. It opens `/auth` after two seconds or on a tap. Ticket 03 restyles it to the handoff.
- `app/(auth)/auth.tsx` is one screen for both modes. The old `sign-in.tsx` and `sign-up.tsx` are gone.
- `features/auth/app-entry.ts` exports `appEntry`. `AppEntryProvider` in `context/app-entry.tsx` uses it, and `RootNavigation` reads `entry` from `useAppEntry()`. The provider had the names `OnboardingProvider` and `useOnboarding`. The new names show that it also sends signed-out devices to auth.

`appEntry` returns `retry` when the setup check fails for a signed-in account. Before this change, a failed check sent a completed account to setup. The retry screen keeps the old text and “ลองอีกครั้ง” (retry).

Signup enters setup at `/onboarding/greeting`. The old landing screen is gone. The greeting has no back button, because no screen is behind it.

Setup keeps the old step order with the greeting moved first: greeting, birthday, terms, privacy, personalization. Only the greeting and birthday links changed. Ticket 03 owns the final step order.

A successful sign-in shows the toast “ยินดีต้อนรับกลับ <name>” (welcome back). The toast host lives in `(app)`, so an account that enters setup does not see it.

Sign-out still starts from the account sheet in `settings/account`. The sheet has the handoff title “ออกจากระบบไหม?” (sign out?). Its text is the handoff line “รายการที่จดไว้ยังอยู่ครบ เข้าสู่ระบบด้วยอีเมลเดิมเพื่อดูอีกครั้ง” (your entries stay, sign in with the same email to see them again). It also has a “ยกเลิก” (cancel) button. Ticket 20 moves sign-out to the profile and owns the rest of the sheet.

## Shared control changes

- `SegmentedControl` takes `labelSize`, `accessibilityLabel`, and `testID`. Each tab gets `<testID>-<value>`.
- `PillButton` takes `testID`.
- `utils/email-identity.ts` exports `isValidEmail`. `normalizeEmail` uses it.
- `features/auth/components/auth-input.tsx` has `AuthInput`, `ShowPasswordButton`, and `PasswordRule`.

## Tests

- `apps/server/test/auth-flow.test.ts` drives the native form through the real Better Auth routes into a test MongoDB. Each test makes its own fixture accounts.
- It covers unknown email, wrong password, duplicate signup with recovery through the notice action, and incomplete fields with nothing sent.
- It also covers signup into setup, Home after setup, one request for a double submit, connection failure with recovery, and the 128-character limit.
- It also covers a wrong password, then a changed email without an account. The second answer shows only the notice, without the old password error.
- `features/auth/{auth-form,app-entry}.test.ts` and `lib/remembered-email.test.ts` cover form state, the retry guard, and the latest email.

## Design comparison

Checked block `00 เข้าสู่ระบบ / สมัครสมาชิก` (sign-in / signup), about lines 387–430 of `Moojot Home.dc.html`. Script references are `authVals`, `submitAuth`, `finishAuth`, and `authSwitchFromError`.

Design captures are `design-shots/02-{signup,signup-errors,password-shown,signup-duplicate,signin-wrong-password,signin-unknown,greeting}[-dark].png`, through `capture/02-auth-flow.mjs`.

Matched values:

- Mascot 96, title 28, subtitle 14 `muted`, and the mode tabs: height 42, label 15, track `raised`.
- Field label 13 `muted`, input 52 with radius 14 and text 16.
- Input rings: 1px `border`, 2px `accent` when focused, 1.5px `danger` with an error under it.
- Show button 44 by 72 with an eye icon 18 and text 14 `accentText`. Rule row 13 with a 16 icon.
- Notice on `raised`, radius 14, text 14, action 44 tall in `accentText` with a chevron.
- Footer button 52 with busy labels “กำลังสมัคร…” (signing up) and “กำลังเข้าสู่ระบบ…” (signing in).

### Deliberate differences

- The signup password field does not ask iOS for a new password. With that content type, the simulator covered the field with Automatic Strong Password. After “แสดง” (show) and “ซ่อน” (hide), iOS replaced the typed text. Sign-in keeps Keychain autofill.
- The greeting, splash, and setup steps keep their old look until ticket 03.
- The app adds the shared-code, rate-limit, connection, and password-length messages from the table above.
- The ticket's `## Comments` records each kept difference with its reason.

## iOS evidence: iPhone 11 simulator, iOS 18.6, development build, 2026-10-03

The flow `apps/native/.maestro/02-auth-flow.yaml` ran in light and dark. Captures are `02-app-<state>[-dark].png` beside this file. The review fix ran the flow again in light and dark and replaced the captures. The sign-out sheet captures show the new title, line, and cancel button.

The flow signs up new accounts. Ticket 02 ran it against a throwaway database. On 2026-10-03 the user approved all operations on the development database for agents, so this command replaces that setup:

```sh
node scripts/ios-preview.mjs apps/native/.maestro/02-auth-flow.yaml <out-dir> --fixture --first-start
```

`--fixture` signs up an account with setup complete and gives the flow an address that has no account. `--first-start` signs the app out and deletes the remembered email. The `ios-preview` skill describes both flags.

Checked states: first start in signup, incomplete-field errors, the live rule, show and hide, and duplicate signup. Also checked: the notice action into sign-in, wrong password, and Home with the welcome toast. The flow also checked the sign-out sheet, sign-in with the remembered email after sign-out, unknown email, the notice action into signup, and the greeting.

The shared `apps/native/.maestro/sign-in.yaml` now picks the sign-in tab, replaces the email, and submits with Return. It signed in to the development server after this change. Maestro `hideKeyboard` fails on the auth screen, so flows submit with `pressKey: Enter`.

iOS leaves secure-entry text out of simulator screenshots. Hidden passwords therefore look empty in the captures, although the fields hold text.

### Return key

Maestro `pressKey: Enter` sends a Return key event, as a hardware keyboard does. On the simulator, that event moved focus from the name to the email, and from the email to the password. From the password, it sent the form. The text typed after each event went into the next field.

The simulator did not check the Return key of the on-screen keyboard. After the first Maestro key event, the simulator hid the on-screen keyboard, so a tap on its keys is not possible. Only a real iPhone keyboard can check that its Return key moves focus and sends the form.

### Back navigation

A Maestro edge swipe did not close a pushed settings screen in the signed-in app. Maestro swipes therefore cannot check the iOS back gesture on this simulator.

A temporary log printed `router.canGoBack()` and the root navigation state on three screens. The commit does not contain the log. Results:

- Auth at first start: `false`. The `(auth)` stack holds only `auth`, because the splash replaces itself.
- Auth after sign-out: `false`. The `(auth)` stack holds only `auth`.
- Greeting after signup: `false`. The root holds only `onboarding`, and its stack holds only the greeting.
- Home after sign-in: `false` on the first render. The root holds only `(app)`.

No screen is behind auth, the splash, or the greeting. The back gesture therefore has no screen to show. The greeting has no back button. The back button of the birthday step opened the greeting.

Unverified on the simulator: the pending label (the local server answers too fast), Dynamic Type, VoiceOver, and the retry screen of the setup check.

## Left for a human on the iPhone

The ticket's `## Comments` lists the checks for the iPhone 13 Pro.

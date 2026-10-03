# Notes from ticket 03 (four-step setup)

## Setup flow

Setup is one route, `app/onboarding/index.tsx`. It shows the greeting, the four steps, and the recap from one state, so the step header stays in place.

The step order is terms, photo access (`slips`), goals, and optional information (`extras`). The recap (`ready`) follows. The old ten routes are gone. The motivation screen is gone too, because the handoff does not have it.

`features/onboarding/onboarding-flow.ts` owns the state. It has no React code, so `apps/server/test/onboarding.test.ts` imports it by path.

- `goNext` moves to the next screen. On the terms step without acceptance, it stays and sets the error “กรุณายอมรับข้อตกลงการใช้งานก่อนเริ่มใช้งาน” (accept the terms first). On the goals step without a goal, it stays and sets “เลือกอย่างน้อย 1 ข้อนะ” (pick at least one).
- `goBack` moves from the recap to the last step, from each step to the step before it, and from the terms step to the greeting.
- A screen change clears both errors, as the handoff's `obGo` does.
- `onboardingProgress` gives “N/4” and the spoken label “ขั้นที่ N จาก 4: <name>” (step N of 4).
- `missingAnswer` gives the step with a missing required answer, with its error.

The “ต่อไป” (next) buttons on the terms and goals steps stay tappable while dim. A tap shows the error, as the spec requires.

Android's back button walks the steps like the header's back button. On the greeting, it leaves the app.

## Saving setup

`features/onboarding/save-onboarding.ts` saves setup through the existing `financePreferences.setSetting` route. The API did not change.

1. `saveOnboarding` checks the required answers. A missing answer sends nothing and returns the step that needs it.
2. It writes these keys and waits until every write ends:
   - `profile_email`, from the session.
   - `profile_birth_date` (YYYY-MM-DD or "") and `profile_birth_month` ("1" to "12" or "").
   - `onboarding_personalization` and `onboarding_updates` (`yes` or `no`).
   - `onboarding_reasons` (a JSON list of goal keys) and `onboarding_terms_accepted_v1` (the time of the save).
3. Only after every write succeeds, it writes `onboarding_complete_v1`.

A failed write stops before step 3, so setup stays incomplete and Home stays closed. The recap shows “บันทึกไม่สำเร็จ ลองอีกครั้ง” (save failed, try again). The next tap sends every key again, and each write replaces the value from the failed try. The dead key `onboarding_in_progress_v1` is gone.

`features/settings/profile-values.ts` holds the keys that setup and the profile share. `settings/account.tsx` now reads and writes the same keys through it. The profile keeps its old look until ticket 20.

### The setup draft on the device

iOS stops the app when the person changes its photo access in Settings. The simulator showed this: after a change in Settings, the app started again at the greeting and lost the answers.

`features/onboarding/onboarding-draft.ts` therefore keeps the answers and the current screen in `Documents/moojot-onboarding-draft-v1.json`. Each change writes the file. A draft belongs to one account, so another account starts at the greeting. The recap deletes the file after a successful save. An unreadable file starts setup at the greeting.

## Photo step

`features/onboarding/photo-step.ts` reads the photo permission, shows the system prompt, and counts the albums through three injected functions. It never reads a photo. Setup imports only the metadata count from `library-scan`, never the Home scan, so no AI reading starts before Home.

The step's states:

| State         | Cause                                      | What the step shows                                                                                 |
| ------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `ask`         | The permission has no answer yet.          | The explanation, the hint, “อนุญาตและค้นหาสลิป” (allow and find slips), “ข้ามไปก่อน” (skip for now) |
| `skipped`     | The person tapped “ข้ามไปก่อน”.            | The same as `ask` when the person goes back to the step                                             |
| `counting`    | Full access, with the count still running. | “กำลังนับรูปในอัลบั้ม…” (counting photos), “…” on each album, a dim button                          |
| `counted`     | Full access, count done.                   | “เจอ N รูปในอัลบั้มสลิป” (found N photos), the count badge, counts per album                        |
| `limited`     | Limited access.                            | The note with “เปิดการตั้งค่ารูปภาพ” (open photo settings)                                          |
| `denied`      | Access refused.                            | The note with “เปิดการตั้งค่ารูปภาพ”                                                                |
| `failed`      | The count failed with full access.         | The note with the error and “ลองอีกครั้ง” (try again)                                               |
| `unsupported` | The platform has no photo library (web).   | A note without an action                                                                            |

The provider reads the permission at the start of setup and each time the app returns to the foreground. Only the latest read changes the state, so a slow earlier read cannot replace a newer answer.

The recap's “สลิป” (slips) row comes from `photoRecap`. It describes found slip photos, never saved entries.

## Birthday

`features/settings/birthday.ts` gives the day, month, and Buddhist-year columns, checks a picked day, and names it (“29 กุมภาพันธ์ 2543”). A day that does not exist or that is after today is invalid. Years run from this year back to 1900.

`features/settings/components/birthday-sheet.tsx` is the three-column sheet. It shows “วันเกิดไม่ถูกต้อง” (invalid birthday) at once, and “เลือก” (pick) keeps the sheet open until the day is valid. Ticket 20 can use the same sheet in the profile.

## Tests

- `features/onboarding/onboarding-flow.test.ts`: the terms and goals requirements, back order, and progress.
- `features/onboarding/photo-step.test.ts`:
  - No prompt when access came earlier. The explanation before the prompt, and skip.
  - The prompt and the count. Limited and denied answers, and a change in Settings.
  - A failed count, and an earlier read that ends last.
  - The album rows and the recap text.
- `features/onboarding/onboarding-draft.test.ts`: resume after a restart, no errors on resume, one draft per account, removal after the save, and an unreadable draft.
- `features/settings/birthday.test.ts`: valid and invalid days, the columns, the Thai name, and the start value.
- `apps/server/test/onboarding.test.ts` runs against the real preference routes and a test MongoDB:
  - A full save opens Home, and the profile keys hold the setup values.
  - A lost connection for one key leaves setup incomplete. The same answers then complete it.
  - Missing terms or goals save nothing.

## Design comparison

Checked blocks `00 เริ่มใช้งาน` (getting started), about lines 380–636 of `Moojot Home.dc.html`, and its script (`OB_*`, `obVals`, `obGo`, `obBack`, `obSlipPrimary`, `obPickBirth`).

Design captures are `design-shots/03-<state>[-dark].png` from `capture/03-onboarding.mjs`. The prototype's “ลอง: เปิดแอปครั้งแรก” (try: first app start) button replays the splash for its capture.

Matched values:

- Splash: mascot 170, scale 0.6 to 1 over 0.8 s on the handoff's overshoot curve, “หมูจด” at 40 fading in after 0.4 s.
- Greeting: picture 260 tall, title 30, two muted lines at 16, caption 13, button 52.
- Step header: 52 tall, back button 44 with a 30 chevron, four 5-tall segments with a gap of 6, “N/4” at 13.
- Terms: picture 140, title 22, and three cards (padding 12 by 14, radius 14, `raised` ring, 32 icon circle). Then the full-terms link, and a 24 checkbox with radius 7 and a `danger` border on error.
- Photo step: picture 140 with the count badge (34 tall), and the three lines. Then the grouped album list with rows 50 tall, the note on `raised`, the hint, and the skip button.
- Goals: picture 190, chips 44 tall with radius 22, an `accent` fill with a check when on, a 1.5 `border` ring when off.
- Information: the birthday row 68 tall with a 36 icon circle and “ล้าง” (clear), two switch rows 72 tall with a 51 by 31 switch.
- Recap: picture 230, title 26, the card with goal chips and the slips row, busy label “กำลังบันทึก…” (saving).
- Sheets: radius 24, title 17, the full-terms and slip sections, “เข้าใจแล้ว” (understood) at 50. The birthday sheet has columns of 0.8, 1.5, and 1 with options 44 tall.

The app uses the handoff's onboarding pictures. They replace the app's older copies, which had a glow around the pig. `onboarding-motivation.png` is gone.

### Deliberate differences

- The recap's slips row has more cases than the handoff's two texts. With 0 photos it says “อนุญาตแล้ว แต่ยังไม่พบรูปในอัลบั้มสลิป 30 วันที่ผ่านมา” (allowed, but no photos found in the last 30 days). With limited access it says “เข้าถึงรูปได้บางส่วน หมูจึงยังอ่านสลิปไม่ได้ อนุญาตทั้งหมดภายหลังจากหน้าแรกได้” (partial access, so slips cannot be read yet). The handoff text for no access would be wrong in these cases.
- The photo step adds the `failed` and `unsupported` notes. It also adds the busy label “กำลังตรวจสิทธิ์รูปภาพ…” (checking photo access) for the short first read.
- The handoff's mock system alert is not built. The real iOS prompt appears instead. Counting lasts as long as the real count, not the handoff's 1.5 s.
- The recap shows the save error above the button. The handoff has no save failure.
- Setup resumes at the same step after an app restart. The handoff keeps nothing.
- The switch knob does not slide over 0.2 s. It moves at once.
- The birthday sheet's first year is this year, not the handoff's fixed 2026.
- A failure to open Settings shows “เปิดการตั้งค่าไม่สำเร็จ เปิดแอปการตั้งค่าของเครื่องแล้วเลือกหมูจด” (cannot open Settings, open the Settings app and pick Moojot).

## iOS evidence: iPhone 11 simulator, iOS 18.6, development build, 2026-10-04

Captures are `03-app-<state>[-dark].png` beside this file, in light and dark. Each run signs up a new account in the development database.

| Flow                             | Command flags                                       | What it checked                                                                                                                         |
| -------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `03-onboarding.yaml`             | `--fixture --first-start --photos reset`            | Signup to the greeting, each step and its error, both info sheets, skip, an invalid and a valid birthday, back from the recap, and Home |
| `03-onboarding-photos.yaml`      | `--fixture --first-start --photos reset`            | The real prompt, a refusal, full access in Settings, the restart, the resumed photo step with the count, and the recap                  |
| `03-splash.yaml`                 | `--first-start --keep-app`                          | The splash, and a tap that leaves it at once                                                                                            |
| `03-onboarding-to-ready.yaml`    | `--fixture --first-start --photos reset`            | Answers up to the recap                                                                                                                 |
| `03-onboarding-save-failed.yaml` | `--offline --keep-app`, with the API server stopped | The failed save and its message                                                                                                         |
| `03-onboarding-save-retry.yaml`  | none (the script starts the server)                 | After a restart, setup resumes at the recap with the answers, and the save opens Home                                                   |

Run each with `node scripts/ios-preview.mjs apps/native/.maestro/<flow> <out-dir> --theme light|dark <flags>`. Stop the API server between the second and third save flows: `lsof -ti tcp:3000 -sTCP:LISTEN | xargs kill`.

`scripts/ios-preview.mjs` has a new option, `--photos grant|revoke|reset`. It sets the photo permission before the app starts. `reset` makes the system prompt appear again.

On the iOS 18.6 simulator, “เปิดการตั้งค่ารูปภาพ” opens the Settings Apps list, not the app's page. The flow taps through to the app's page. A real iPhone can open the app's page directly.

Unverified on the simulator:

- Counts above 0. The simulator has no Krungthai NEXT, K PLUS, Paotang, or TrueMoney album, so every album shows “ไม่พบรูป” (no photos).
- Limited access. Only the system prompt's “Limit Access…” picker can give it, and Maestro does not drive that picker here.
- The busy labels “กำลังนับรูป…” and “กำลังบันทึก…”. The count and the local server end too fast.
- A partial save on the device. The server test covers one failed key. On the simulator, every write failed together with the server stopped.
- Dynamic Type and VoiceOver.

## Left for a human on the iPhone 13 Pro

1. Allow with “Allow Full Access” on a phone with bank albums. Check the per-album counts, the badge, and the recap count.
2. Pick “Limit Access…” and select some photos. Check the limited note on the photo step and the limited text in the recap.
3. Refuse, tap “เปิดการตั้งค่ารูปภาพ”, give full access, and return. Check that setup resumes at the photo step with the count. Also return from Settings without a change, and check that the step stays the same.
4. Tap “ข้ามไปก่อน”, finish setup, and check that Home offers photo access.
5. Check the busy labels on a slow network, and turn on airplane mode at the recap. Check the save error, then turn it off and save again.
6. Check the left-edge back swipe on each step. The single setup route has no screen behind it, so the swipe does nothing. The header's back button walks the steps.
7. Check the splash animation, VoiceOver labels on the progress bar, switches, and birthday columns, and the largest Dynamic Type size.

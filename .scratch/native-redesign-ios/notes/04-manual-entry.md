# Notes from ticket 04 (manual entry)

## Editor and drafts

`features/entries/components/entry-editor.tsx` contains one `EntryEditor` with `mode: "create" | "edit"`. Routes `app/(app)/(entries)/entry/index.tsx` and `[id].tsx` are thin adapters. Edit retains the opening entry, so save/delete query refresh cannot reset the draft.

Prefill for ticket 06's “จดเอง” (manual entry) and ticket 11/19 cards uses `router.push({ pathname: "/entry", params: { occurredOn, bank, cardName, cardLast4 } })`. Future `occurredOn` falls back to today. Prefill defines the starting draft, so unchanged closure asks nothing.

Tested pure rules live in `features/entries/entry-draft.ts`:

- `changeEntryKind` clears category on kind change and tags for transfer.
- `entryTitlePlaceholder` and fallback resolve title → note → category → type.
- `checkEntryDraft(draft, { today, categoryName })` checks amount >0, valid day, and no future day once.
- It returns `{ ok: true, input }` or `{ ok: false, field: "amount" | "occurredOn", message }`.

Save always says “บันทึก” (save), or “กำลังบันทึก…” (saving…) while pending. Missing amount opens keypad and shows “กรุณาใส่จำนวนเงินที่มากกว่า 0 บาท” (enter an amount above 0 baht). The amount card receives a `danger` ring. Future-date errors appear above Save. Design pass 98db784 deleted `entrySaveLabel` from 6f3ac22.

## Bank and card identity

`entrySourceChoices({ banks, cards }, draft)` returns `commonBanks` from `features/wallets/banks.ts`, actual `analytics.listBanks`/`analytics.listCards` values, the draft source, and “ไม่ระบุ” (unspecified).

`bankId()` uses slip/seed identities "KBank", "SCB", "KTB", "BBL", "Krungsri", "ttb", and "TrueMoney". Preserve unknown typed names. `bankDisplayName()` supplies Thai labels. `commonBanks` holds identities.

Older rows may contain Thai spelling. `bankFilterGroups(options.banks)` returns one `{ id, label, banks }` per bank. Filter selection toggles the group's raw `banks` together because server filters match exactly. `checkEntryDraft` normalizes old spelling on save. `FilterSourceIcon`/`TransactionRow` share helpers.

Search still matched raw text at this point. See ticket 09.

Cards store name/last4 separately. `"บัตร KTC •• 4821"` means KTC card ending 4821, extending prototype “บัตร KTC” (KTC card). `walletCardKey` in `features/wallets/cards.ts` supplies one identity for editor/filter. `selectEntrySource` / `selectedEntrySource` handle selection.

Cards still derive from transactions at this point. Ticket 11 adds an actual card list. The “เพิ่มบัตร” (add card) chip appears only without cards. It opens `/settings/cards?from=entry`. With `from=entry`, that screen calls `router.back()` to the existing editor/draft rather than a second `/entry`. Ticket 11 replaces this with actual creation and newly selected card.

## Keypad

`features/entries/calculator.ts` is pure and exports `openCalculator`, `pressCalculator`, `finishCalculator`, `pasteIntoCalculator`, `calculatorKeyForHardware`, and `groupAmountDigits`. `pasteIntoCalculator(state, copiedText)` reads raw clipboard text and finds the first positive amount. Otherwise, it sets `error` to `CLIPBOARD_HAS_NO_AMOUNT`. `CalculatorState.error` is `null` without errors.

`components/amount-keypad.tsx` supplies the panel. Hardware keys work only on web. iOS Expo Go lacks key events without focused text input. This would require a native module/development build. Ticket 23 owns that deferred work. Budget/recurring keypad fields can reuse the calculator.

## Save, delete, restore, and queries

`features/entries/entry-actions.ts` exports `createEntryActions(ledgerClient)`. It wraps Ledger routes and throws Thai `EntryActionError`. `save({ id?, input })` consumes `input` from `checkEntryDraft` without a second check.

`use-entry-actions.ts` binds actions to the app client. After every success, it awaits `refreshEntryReaders()` before resolving. Save, `remove`, and restore all invalidate `ledger`, `analytics`, `planning`, and the pending-category queue. The change deleted old `entriesMutationOptions.create/update/delete/restore`.

The API required no change. Delete sets soft-deletion state. Restore clears `deletedAt` on the same row. Integration proves original ID/fields, no clone, and refusal of repeated/foreign requests.

## Toast and shared UI

`lib/toast.ts` is the app-wide store. Ordinary toast lasts 2.6 s, action toast 5 s. Newest replaces previous toast/action. Action runs once with `busyLabel`. Failure shows its error and retains retry.

`components/ui/toast.tsx` mounts `ToastHost` once in `app/(app)/_layout.tsx`. `bottomOffset` 132 above inset clears tabs and Add entry. Use `toast.show({ message, action: { label: "เอากลับคืน", run } })` for tickets 10/13/15/16. “เอากลับคืน” means undo. The change deleted the old Home undo toast and `deletedId` parameter.

Home “จดเพิ่ม” (add entry) opens `/entry` directly and is 52 high. The change deleted its menu. Remaining Home work belongs to ticket 05.

`category-tag-sheet.tsx` matches tag chips, dashed “เพิ่มแท็ก” (add tag), and three-column 78-high emoji tiles. It retains “จัดการหมวดหมู่” (manage categories) and existing props. Tickets 05/14 can reuse it.

Editor rows use `GroupedList`/`GroupedRow` and shared `RowIcon` from `components/ui/controls.tsx`. Only labeled category/date/title/note rows retain local `DetailRow` with label above value/input.

- `radius.dialog` 20: calendar/exit dialog.
- `radius.keypad` 20: keypad top.
- `radius.toast` 12 and `radius.key` 12.
- `touch.formRow` 64: labeled rows and recurring row via `GroupedRow minHeight`.
- `touch.dialogButton` 46: dialog pairs.
- `shadow.dialog`: `0 20px 50px rgba(0,0,0,.25)`.
- `shadow.keypad` and `menuShadow(theme)`: ⋮ shadow with 1px `raised` outline.
- Tag chips are 36 high and use `radius.chip`, matching the prototype's 18-radius pill.

`EntryDraft` uses editor `useState` rather than TanStack Form. Each change applies a whole-draft function from `entry-draft.ts`. Save guard/busy uses ref and state. Explain this if review requests Form.

`utils/format.ts` imports types relatively and defaults date destructuring. Server tests with stricter tsconfig can then import native users of that module.

## Tests

- `apps/native/features/entries/{calculator,entry-draft}.test.ts`.
- `apps/native/lib/toast.test.ts`.
- `apps/server/test/manual-entry.test.ts`: native draft/actions → authenticated RPC → Ledger → MongoDB, using `createORPCClient` over `app.fetch`.

The integration includes manual/slip "KBank" in one filter group. Import native modules relatively: server `@/` points to its own `src`, and native is not a package. Reuse this harness for native/server flows.

## Design pass against HTML

Checked `Moojot Home.dc.html`: `02 จดรายการ` (entry), `เลือกหมวด` (choose category) near line 1704, and `เลือกวันที่จด` (choose date). Also checked exit `alertdialog`, keypad, ⋮, and toast. Compare `design-shots/04-*.png` with app `04-app-<state>[-dark].png` beside this file.

Matched details:

- Calendar centers “เลือกวันที่จด” (choose transaction date). Arrows use `accentText`. Next fades to 35% instead of disappearing.
- Days are 40-high stadiums spanning columns. Today has 1.5 `accent` ring and `accentText` digits. Future dates use `muted` at 40%, disabled.
- “ยกเลิก” (cancel) uses an outline in `accent`. “วันนี้” (today) uses an `accent` fill. Calendar buttons are 46 high.
- Exit header is 92 high, with 150×134 mascot, title 18, and 46-high buttons. “ไม่บันทึก” (discard) uses an outline in `accentText`.
- Tag creation places Back, 44-high `#` pill, and round `+` in one row. “แตะเพื่อเพิ่มได้เลย” (tap to add) suggestions add immediately and exclude existing names. There is no extra Save button.
- Category tiles occupy exact thirds. Editor segment is 14, form rows 64, and inputs 15.
- Amount ฿ stays at size 20 on the baseline. Caret is 82% of amount size. Source chips have no icons. ⋮ uses menu shadow.
- Keypad “=” uses Done's 17-sized text. Toast matches padding and 40-high action.

### Deliberate differences

- Prototype chips hardcode “กสิกรไทย” (Kasikornbank), “ไทยพาณิชย์” (SCB), “กรุงไทย” (Krungthai), “บัตร KTC” (KTC card), and “ไม่ระบุ” (unspecified). The app uses common/actual banks and individual `บัตร <name> •• <last4>` cards, then unspecified. The card template means card name and last four digits. Two cards from one issuer remain separate. “เพิ่มบัตร” (add card) is a ticket-04 addition. Its dashed `accent` appearance follows “เพิ่มแท็ก” (add tag), at chip height 40.
- Missing category saves silently to pending work, as in HTML.
- Calendar Next remains unavailable to VoiceOver as well as faded. HTML fades and sets `disabled` only.
- Toast actions retain minimum width 44 for tappability. HTML has no minimum.
- Web captures omit status bar/Dynamic Island and sit about 60pt higher. Compare layout below the header.

## Signed-in web recipe (superseded)

Use `ios-preview` with Maestro and a simulator signed in to the development database. Retain this older recipe only for machines without a simulator.

At this ticket's capture point, simulator tap automation was unavailable. Headless Expo web captures used 402×874 Chrome and an uncommitted driver. The agent reversed temporary changes before commit:

- `app.json` `web.output` became "single". "static" SSR throws "Class extends value undefined".
- Metro used a web-only `resolveRequest` stub for `expo-media-library` and `expo-file-system`, which throw at web import.

Backend setup used an in-memory `MongoMemoryReplSet`, as in `apps/server/test/mongo.ts`, then `prisma db push`. Start `bun run src/index.ts` with any 20+ character `GEMINI_API_KEY`. Signup uses `/api/auth/sign-up/email`. To skip onboarding, call `rpc/financePreferences/setSetting` with `{ key: "onboarding_complete_v1", value: "true" }`, then `rpc/ledger/initializeDatabase`. Use header `x-csrf-token: orpc`.

Click element centers with real `page.mouse.click` events. Synthetic DOM events do not reach RN-web Pressables.

## iOS evidence at this ticket's capture point

The agent captured no simulator editor images. The editor needed an authenticated session, and tap automation was unavailable. See notes 01. The design pass used Expo web. Safe areas, keyboard, Dynamic Type, and native fonts still needed the human checklist in ticket Comments.

# Handoff: หมูจด (Moojot) app redesign, lighter type and simpler flows

## Overview
This is a redesign of the Moojot personal finance app (`khaoxkongz/moojot`, `apps/native`, Expo / React Native). It started from one complaint: on iPhone the text looked too big and too bold. The work then grew into a pass over every main screen to make the app easier to understand for someone who finds apps hard to follow.

What the redesign does:
- **Typography:** LINE Seed Sans TH Regular (400) is the only UI font. There is **no bold anywhere**. Text sizes drop 1–2 steps from the current app. Money amounts use the system font at weight 500 with tabular figures.
- **Plain Thai words instead of symbols:** ↑ ↓ become รายจ่าย / รายรับ / ย้ายเงิน. Status is always given as words plus an icon, never color alone.
- **Tap instead of type:** wheel pickers and free-text fields (dates, days, %, bank names) become chips and grids you tap.
- **Fewer confirm dialogs:** destructive actions run at once and show an undo toast (“เอากลับคืน”).
- **Buttons stay tappable:** primary buttons are never greyed out. Tapping with missing input explains, next to the field, what to fix.

Screens covered: sign in / sign up, onboarding, Home timeline, entry editor, summary, slip auto-import, carrot streak (+ tutorial), planning (budgets + recurring), search, the profile tab (พี่มนุษย์), categories & tags, calendar settings, and credit cards. The prototype runs in iPhone and Android frames, in light and dark themes.

## About the design files
The files in this bundle are **design references built in HTML**. They are a working prototype that shows the intended look and behavior. They are **not production code to copy**. Your job is to **rebuild these designs in the existing Expo / React Native codebase** (`apps/native`), using its patterns: `useAppTheme()`, `@/components/ui/typography`, TanStack Query and Form, expo-router, and so on.

The prototype has all state in one file with seed data and a fixed date (`TODAY = 2026-09-30`). Timers stand in for network calls (auth 700 ms, save 450 ms, slip reading about 3.4 s). Anything that says “จะทำในรอบถัดไป” in the prototype is out of scope.

## Fidelity
**High fidelity.** Colors, type sizes, spacing, radii, copy and interactions are final. Match them, but use the codebase's components. 1 CSS px in the prototype = 1 pt/dp in React Native.

---

## Global rules

### Device frames (for reference only)
- iPhone: 402×874, top safe area `--top: 60px`, tab bar 83px (padding 8px top, 30px bottom), home indicator area `--safeB: 34px`.
- Android: 412×892, `--top: 0` (a separate 40px status bar row), tab bar 66px (padding 8px top and bottom), `--safeB: 0`, then a 24px nav bar.
- In RN, use `useSafeAreaInsets()` instead of these constants.

### Typography (the core fix)
- **UI font:** `LINE Seed Sans TH`, **Regular 400 only**. Drop the Bold, ExtraBold and Heavy weights. Hierarchy comes from size, color (text or muted) and spacing, never weight.
- **Numbers and amounts:** system font. iOS `-apple-system / SF Pro Text`, Android `Roboto`. Weight **500**, `font-variant-numeric: tabular-nums` (RN: `fontVariant: ['tabular-nums']`), `letter-spacing: -0.3px` on large amounts. The ฿ sign sits after the number, about 55% of the amount size, in the regular weight.
- **Scale:**

| Use | Size / line-height |
|---|---|
| Large onboarding heading | 26–30 / 1.35–1.4 |
| Step heading (onboarding) | 22 / 1.45 |
| Brand word “หมูจด” (auth) | 28 / 1.35 |
| Screen title in header | 17 / 1.4 |
| Speech line, sheet title, card headings | 15–17 / 1.4 |
| Body, row title, input | 15 (inputs 16, which stops iOS zoom) / 1.4 |
| Secondary line, captions, section labels | 12–13 / 1.4–1.5, color `muted` |
| Tab bar label | 12 |
| Badge “ใหม่” | 11 / 18px, `accent` fill |
| Hero amount (Home) | 36 / 1.15, weight 500 |
| Card amount (plan, credit card) | 32 / 1.15 |
| Entry amount | 40 (drops to 32 above 10 characters, 26 above 14) |
| Row amount | 15, weight 500 |

- **Dynamic Type (recommendation):** keep font scaling on, but cap it (for example `maxFontSizeMultiplier` around 1.3 on body text). That way larger system text sizes don't break row layouts.

### Touch targets
Every tappable element is at least **44×44**. Icon buttons are 44×44 with a 22px radius. Rows are at least 52–64 tall. Primary buttons are 52 tall.

### Motion
| What | Timing |
|---|---|
| Full-screen push (summary, plan, search, settings) | `transform` translateX 100%→0, 0.34 s `cubic-bezier(.2,.8,.2,1)`. Search uses translateX(24px) plus opacity, 0.3 s |
| Full-screen modal (entry editor, budget form, recurring form) | translateY 100%→0, 0.34 s, same easing |
| Bottom sheet | translateY 105%→0, 0.32 s, same easing |
| Dim layer behind a sheet | opacity 0→1, 0.25 s. Color `shade` |
| Centered dialog (calendar, exit confirm) | opacity plus scale .96→1, 0.2 s |
| Onboarding exit | opacity 1→0, scale 1→1.04, 0.35 s |
| Toast | 2.6 s. With an action (“เอากลับคืน”) 5 s. Sits above the tab bar or the bottom button |
| Keypad caret | 1.05 s blink |
| Switch | track color and knob translateX(20px), 0.2 s |

---

## Design tokens

### Colors
| Token | Light | Dark | Use |
|---|---|---|---|
| bg | `#F9F9F7` | `#2D2D2B` | screen background |
| surface | `#FFFFFF` | `#383835` | cards, rows, sheets, tab bar |
| raised | `#F0EFEC` | `#454541` | chips, icon circles, dividers, pressed state |
| text | `#2D2D2B` | `#F9F9F7` | main text |
| muted | `#5E5D59` | `#C9C8C3` | secondary text (never lighter than this) |
| border | `#D7D5CE` | `#565650` | unselected chip outline, sheet handle, input ring |
| accent | `#CC7D5E` | `#CC7D5E` | primary buttons, hero cards, selection |
| accentText | `#8D472D` | `#E1A68E` | links and accent-colored text on bg/surface |
| onAccent | `#1E1B19` | `#1E1B19` | text and icons on accent |
| success | `#006F30` | `#20D269` | income amounts, “ตามแผน”, rule met |
| danger | `#AD3414` | `#FF9984` | errors, “เกินงบ”, delete |
| inverse / onInverse | `#2D2D2B` / `#F9F9F7` | `#F9F9F7` / `#2D2D2B` | toast |
| inverseAccent | `#E1A68E` | `#8D472D` | toast action text |
| shade | `rgba(30,27,25,.42)` | `rgba(0,0,0,.55)` | dim layer |
| sysBlue / sysBg | `#007AFF` / `#F2F2F7` | `#0A84FF` / `#2C2C2E` | mock iOS permission alert only |

### Radii
Hero cards: 20. Cards and grouped lists: 16. Chips and tiles: 12–14. Segmented control: 12 outer, 9 inner. Pills and buttons: half the height (52 → 26). Sheets: 24 top corners. Tab bar: 17 top corners.

### Shadows
- Floating “จดเพิ่ม” button: `0 6px 16px rgba(45,45,43,.22)`.
- Toast: `0 8px 24px rgba(0,0,0,.18)`.
- Menus and dialogs: `0 10px 30px rgba(0,0,0,.18–.25)`.
- Selected segment: `0 1px 3px rgba(0,0,0,.14)`.
- Cards have no drop shadow. They use an inset 1px `raised` ring (`box-shadow: inset 0 0 0 1px raised`).
- Selected tiles and radio cards: inset 2px `accent` ring.

### Spacing
Screen side padding: 16. Card inner padding: 14–18. Gaps between sections: 18–26. List row padding: 10×14. Chip gap: 8.

---

## Shared components
- **Header (pushed screens):** 52 tall. 44px back button with `mdi-chevron-left` at 30. Title 17, centered. A 44px spacer on the right keeps the title centered.
- **Segmented control:** track `raised`, padding 3, gap 3. Segments are at least 40 tall. The selected segment is `surface` with a shadow and `text` color. Others are transparent and `muted`. Used for รายจ่าย / รายรับ / ย้ายเงิน, หมวดหมู่ / แท็ก, and เข้าสู่ระบบ / สมัครสมาชิก.
- **Grouped list:** `surface` card, radius 16, inset `raised` ring. Rows are at least 60–64 tall. Each row has a 36px icon circle (`raised`, emoji at 18 or MDI icon at 19), a title at 15 and a sub line at 12 `muted`. Trailing value at 14 `muted`, then `mdi-chevron-right` at 22. Dividers are 1px `raised`, indented to 62.
- **Chip:** at least 40 tall, radius 20, padding 0 14, font 14. Off: 1.2px `border` outline. On: `accent` fill with `onAccent` text. For multi-select, “on” also shows `mdi-check`.
- **Radio card:** at least 58–62 tall, radius 14. A 22px circle with a 10px dot. Label 15, sub line 12 `muted`. Selected: 2px `accent` ring.
- **Day grid:** 7 columns of 40px circular day cells, inside a `surface` card with padding 10 and gap 4. Selected: `accent` fill. Used for the recurring day, the month start day and the date picker.
- **Bottom sheet:** 36×5 handle in `border`, title 17 with a 44px close (×) button, padding 10 16 plus the bottom safe area, max height 86–90%.
- **Info box:** `raised` fill, radius 14, padding 12×14, a 20px MDI icon, then a line at 14 and a muted line at 13.
- **Toast:** `inverse` fill, radius 12, at least 48 tall, text 14. Optional action button in `inverseAccent`.
- **Switch:** 51×31 track (`accent` on, `border` off) with a 27px white knob.
- **Status words for budgets:**
  - “ตามแผน”: `mdi-check-circle-outline`, success.
  - “ใกล้ครบงบ”: `mdi-alert-outline`, accentText.
  - “เกินงบ”: `mdi-alert-circle-outline`, danger.
  - The bar fill uses the same color. The bar is at least 2% wide once any amount is spent.

---

## Screens
Each screen carries a `data-screen-label` in the HTML. Search the file for it to find its exact markup and copy.

### 00 เข้าสู่ระบบ / สมัครสมาชิก (sign in / sign up)
**Where:** after the splash when signed out. Sign-out opens it on “เข้าสู่ระบบ” with the last email filled in. First launch opens it on “สมัครสมาชิก”.

**Layout:**
- Mascot 96px, then “หมูจด” at 28, then a sub line at 14 muted:
  - Sign up: “สมัครด้วยอีเมล แล้วตั้งค่าอีก 4 ขั้นสั้น ๆ”
  - Sign in: “เข้าสู่ระบบด้วยอีเมลที่เคยสมัครไว้”
- Segmented control เข้าสู่ระบบ | สมัครสมาชิก, 42 tall. Switching keeps what was typed.
- Fields have a **visible label above** (13 muted) and a 52-tall input (radius 14, `surface`, inset 1px `border` ring, 2px `accent` ring on focus, 1.5px `danger` ring when there's an error):
  - ชื่อ (sign up only), placeholder “ชื่อของคุณ”
  - อีเมล, placeholder “name@example.com”, email keyboard, no auto-capitalize
  - รหัสผ่าน, placeholder “อย่างน้อย 8 ตัวอักษร”, with a “แสดง / ซ่อน” toggle (eye icon, accentText, 44 tall) at the right inside the field
- Sign up only: a live rule line “อย่างน้อย 8 ตัวอักษร”. Muted `mdi-circle-outline` before it's met, success `mdi-check-circle` after.
- A fixed footer button: “เข้าสู่ระบบ” or “สมัครสมาชิก”. While busy it reads “กำลังเข้าสู่ระบบ…” or “กำลังสมัคร…”.

**Validation (on submit, errors shown under each field; copy from the current app):**
- “กรุณาใส่ชื่ออย่างน้อย 2 ตัวอักษร”
- “กรุณาใส่อีเมล” / “กรุณาใส่อีเมลให้ถูกต้อง”
- “รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร”
- Typing in a field clears that field's error.

**Account errors (shown in an info box with a link):**
- Unknown email on sign in: “ยังไม่มีบัญชีของอีเมลนี้” with the link “สมัครสมาชิกด้วยอีเมลนี้ ›”, which switches to sign up.
- Wrong password: an error under the password field, “รหัสผ่านไม่ถูกต้อง ลองอีกครั้ง”.
- Email already registered on sign up: “อีเมลนี้มีบัญชีอยู่แล้ว” with the link “เข้าสู่ระบบด้วยอีเมลนี้ ›”.

**Keyboard:** Enter moves name → email → password. Enter on the password field submits.

**After success:**
- Sign up → onboarding greeting.
- Sign in → Home, with the toast “ยินดีต้อนรับกลับ {ชื่อ}”.

**Changes from the current app:**
- Labels sit above the fields (before, placeholder only).
- Show-password toggle added.
- Errors appear per field (before, one message at the top).
- The button is never disabled.
- The confusing sign-up notice (“หากแอปยังไม่เปิดต่อ…”) is replaced by moving straight on to onboarding.

**Demo account in the prototype:** moo.user@example.com / moojot123.

### 00 เริ่มใช้งาน (onboarding)
**Flow:** splash → auth → greeting → 4 steps → ready → Home.

- **Splash:** mascot 170px springs from scale .6 to 1 over 0.8 s, then “หมูจด” at 40. Advances after 2 s, or on tap.
- **Greeting:** onboarding-welcome art (260 tall), “สวัสดีพี่มนุษย์!” at 30, the lines “ยินดีที่ได้รู้จักกันนะ / เริ่มจดรายจ่ายกันเลย!”, the caption “ตั้งค่า 4 ขั้นสั้น ๆ ก่อนเริ่มใช้”, and the button “สวัสดี หมูจด!”.
- **Step header:** back button, 4 progress segments (5px tall, `accent` done, `border` to do), and the counter “1/4”.
- **Step 1, ข้อตกลง:**
  - Replaces the current terms and privacy screens.
  - Shows 3 summary cards, each with an icon.
  - “อ่านข้อตกลงฉบับเต็ม” opens a sheet with the full text.
  - The footer has the checkbox “ฉันได้อ่านและยอมรับข้อตกลงข้างต้น” and the button “ต่อไป”. Tapping “ต่อไป” before ticking shows “กรุณายอมรับข้อตกลงการใช้งานก่อนเริ่มใช้งาน” and turns the box border red.
- **Step 2, อ่านสลิป:**
  - Three short “how it works” lines.
  - A list of the albums the app can read: Krungthai NEXT, K PLUS, Paotang, TrueMoney.
  - Before the OS alert, a note: “เครื่องจะถามต่อ ให้เลือก “อนุญาตให้เข้าถึงทั้งหมด””.
  - Buttons: “อนุญาตและค้นหาสลิป” and “ข้ามไปก่อน”.
  - All access granted: counts for 1.5 s, then shows the number of photos per album and a count badge on the art.
  - Limited access or denied: an info box with the link “เปิดการตั้งค่ารูปภาพ”.
  - “หมูจดอ่านสลิปอะไรได้บ้าง?” opens an info sheet.
- **Step 3, เป้าหมาย:**
  - Multi-select chips: ลดรายจ่าย, เก็บเงินซื้อของ ตามฝัน, ออมเงินเพิ่ม, ใช้จ่ายอย่างมีสติ, คุมงบใช้จ่าย, ปลดหนี้.
  - Selected chips use the `accent` fill with a check. In the current app, selected chips turned text-colored on the same color, so the label disappeared.
  - Tapping “ต่อไป” with nothing chosen shows “เลือกอย่างน้อย 1 ข้อนะ”.
- **Step 4, ข้อมูลเพิ่มเติม (optional):**
  - Birthday row. Opens a sheet with 3 scrollable columns: วัน, เดือน, and ปี พ.ศ. (from 2569 down to 2443). Invalid dates show “วันเกิดไม่ถูกต้อง”.
  - Two consent switches (personalization and news).
  - No extra confirm dialog.
- **Ready:** onboarding-final art, “หมูจดพร้อมจดแล้ว!”, a recap of the chosen goals and the slip status, and the button “เริ่มใช้งานหมูจดเลย!”.
  - If photo access was granted, Home starts reading slips right away.
  - If not, Home's speech line offers “อนุญาตเข้าถึงรูปภาพ ›”.

### 01 หน้าแรก (Home timeline)
**Top row (16 side padding):**
- Carrot streak chip: 44 tall, radius 12, `raised`, carrot image 26px, “7 วัน” at 14.
- Search button and wallet filter button, both 44px circles in `raised`. The filter button gets a 2px accent ring while a filter is on.
- **Filter notice** (when filtered): “กำลังแสดง N รายการจากตัวกรอง” with a “ล้าง” button.

**Mascot speech (72px mascot):**
- Line 1 at 16: “วันนี้หมูจดให้ N รายการ”, “หมูกำลังอ่านสลิปใหม่”, or “วันนี้หมูพร้อมช่วยจด”.
- Sub line at 14 muted, then a 44-tall link: “มี N รายการรอเลือกหมวด ›” (opens the category queue) or “อนุญาตเข้าถึงรูปภาพ ›”.
- While slips are being read, an animation of three slip cards moves across (`mjFlow`, 1.8 s linear, loops).

**Hero card:** `accent`, radius 20, padding 6 16 18.
- Period switcher: ‹ label › with 44px buttons. The next button is at .35 opacity and disabled on the current period.
- “ดูสรุป” pill: `rgba(30,27,25,.1)` fill, 34 tall.
- “ยอดใช้จ่าย” caption. When the month doesn't start on the 1st it reads “ยอดใช้จ่าย · 25 ก.ย. – 24 ต.ค.”.
- Amount at 36 plus ฿ at 20.
- The period label follows calendar settings: “ก.ย. 69”, or a range like “27 ก.ย. – 3 ต.ค. 69” for weekly and 2-weekly periods.

**Below the card:**
- “จดล่าสุดวันนี้ 12:41” (clock icon, 12 muted).
- **Day groups:** header shows “วันนี้ + พ. 30 ก.ย.” in accentText, or the date, with “รายจ่าย 524” on the right. Then a grouped list.
- **Row:** 62 tall.
  - Normal: category emoji in a 34px `raised` circle.
  - Pending: 34px circle with a 1.5px **dashed accent** border and a pencil icon; the meta line “รอเลือกหมวด · สลิป” in accentText.
  - Title at 15 (one line, ellipsis), meta at 12, amount 15/500. Income amounts are green with “+”.
  - “ใหม่” badge on items just added.
- **Empty state:** a card saying “ยังไม่มีรายการในเดือนนี้” or “ไม่พบรายการจากตัวกรองนี้”.

**Floating button “+ จดเพิ่ม”:** 52 tall, `accent`, 16px above the tab bar. It opens the entry editor directly; the current app's one-item menu is gone. It fades out on the profile tab.

**Tab bar:** หน้าแรก / พี่มนุษย์. MDI home and account icons at 26, filled when active, `accentText` when active and `muted` when not.

**Sheets from Home:**
- **เลือกบัญชีและบัตร (filter):**
  - Groups: บัญชีธนาคาร (กสิกรไทย, ไทยพาณิชย์, กรุงไทย), บัตร (บัตร KTC •• 4821), อื่น ๆ.
  - Checkbox rows plus “เลือกทั้งหมด”.
  - The button “แสดงรายการ” is disabled only when nothing is selected, which shows “เลือกอย่างน้อย 1 รายการ”.
- **เลือกหมวด (queue):**
  - Shows the item (title, amount at 20, wallet · source · date time), then a 3-column category grid of 78-tall tiles.
  - “1 จาก 3” progress. Picking a category moves on to the next item.
  - Buttons “ข้ามไปก่อน” and “แก้ไขรายการนี้”.
  - Final toast: “เลือกหมวดครบแล้ว”.

### 02 จดรายการ / แก้ไขรายการ (entry editor)
**Where:** full-screen modal from “จดเพิ่ม”, a Home row, search, a card, or the queue.

**Header:** × (close), title, and ⋮ (edit mode only) with a menu containing “ลบรายการ”. Below it, the segmented control รายจ่าย / รายรับ / ย้ายเงิน. Switching type clears the category.

**Amount card (at least 112 tall, radius 16):**
- Caption: “จำนวนเงินที่จ่าย”, “จำนวนเงินที่ได้รับ” or “จำนวนเงินที่ย้าย”.
- Large amount with a blinking accent caret while the keypad is open. Income amounts are green.
- A small line with the calculation, like “120+45=”.
- Error: “กรุณาใส่จำนวนเงินที่มากกว่า 0 บาท”.

**Keypad (slides up):**
- Toolbar with “วาง” (paste from the clipboard) and an error area.
- 4-column grid of 50px keys: AC (2 columns), %, ÷, 7–9, ×, 4–6, −, 1–3, +, ., 0, ⌫.
- The done key reads “เสร็จ”, or “=” while a calculation is pending.
- Works like a calculator: max 2 decimals, 12 digits, and “ไม่สามารถคำนวณจำนวนนี้ได้” on errors. Hardware keyboard works too.

**Details card:**
- หมวด row: category and tags. Opens a sheet with tag chips, “เพิ่มแท็ก” (max 20 characters, suggestions), a 3-column category grid and “จัดการหมวดหมู่”.
- วันที่ row: “วันนี้ · พุธ 30 ก.ย. 69”. Opens a centered calendar where **future dates are disabled** and there's a “วันนี้” shortcut.
- ชื่อรายการ input. Its placeholder tells what Home will show if left empty, for example “ถ้าไม่ใส่ จะใช้ “อาหาร””.
- โน้ต input.

**Account chips (new):**
- Label “จ่ายจากบัญชี”, “รับเข้าบัญชี” or “ย้ายจากบัญชี”.
- Chips: กสิกรไทย, ไทยพาณิชย์, กรุงไทย, บัตร KTC, ไม่ระบุ.
- Hidden for slip-sourced entries, which show the slip card instead: payer → merchant, slip thumbnail, date, and the link “แตะเพื่อดูสลิป”.

**Other sections:**
- Transfer hint: “รายการย้ายเงิน ไม่นับเป็นรายจ่าย/รายรับ…”.
- “เพิ่มเติม” section with the row “จดซ้ำล่วงหน้า”. If a recurring rule is linked, it reads “จดซ้ำทุกวันที่ 28” and opens that rule.
- Footer button “บันทึก” (“กำลังบันทึก…” while saving).

**Guided create:** after “เสร็จ” on a new amount, the category sheet opens automatically.

**Closing with changes:** a dialog with pig art, “บันทึกรายการมั้ย?”, and the buttons “ไม่บันทึก” / “บันทึก”.

**Delete:** runs at once, then the toast “ลบรายการแล้ว” with “เอากลับคืน”.

### 03 สรุป (summary)
**Where:** pushed from “ดูสรุป”.

**Layout:**
- Month switcher. When the month doesn't start on the 1st, the title reads “กันยายน 2569 · 25 ก.ย. – 24 ต.ค.”.
- Filter notice “สรุปเฉพาะบัญชีและบัตรที่เลือก · ล้าง”.
- Overview: ได้รับ, ใช้ไป, “ได้รับ − ใช้ไป”, which reads “เหลือ” or “ใช้เกินรายรับ”.
- Segmented control รายจ่าย / รายรับ / ย้ายเงิน.
- Breakdown by category or by tag, shown as **horizontal bars (not a pie)** with amounts and shares. Pending items are one group; tapping it opens the category queue.
- **6-month trend** bar chart with month labels and amounts, current month highlighted, plus a sentence comparing with last month.
- Note: “ยอดย้ายเงินไม่รวมในรายรับและรายจ่าย”.
- Link “วางแผนงบ” with budget status.

### 04 หมูอ่านสลิป (slip auto-import)
**Where:** from the Home speech line or the profile tab.

**Layout:**
- Scan progress with the note “เปิดแอปไว้ก่อนน้า ปิดหน้านี้ได้ หมูจะอ่านต่อให้”.
- Results in three groups:
  - **ต้องช่วยหมู** (failed or incomplete): actions “ลองอ่านอีกครั้ง” and “จดเอง”, which opens the editor prefilled with the photo date.
  - **จดให้แล้ว** (created): “แตะรายการเพื่อเลือกหมวดหรือแก้ไข”.
  - **ข้ามไป** (not a slip or a duplicate): “ไม่ต้องทำอะไร หมูข้ามให้แล้ว”.
- Footer button “กลับหน้าแรก”.

### 05 แครอตสตรีค and 06 วิธีรับแครอต
**Layout:**
- Accent header with streak-hero art and “จดติดกัน N วัน”.
- Today status, for example “น้องหมูอิ่มแล้ว พรุ่งนี้มาจดกันใหม่นะ”, and a feed action.
- “7 วันล่าสุด” day row.
- “แครอตสะสม N หัว”.
- “วิธีนับวันติดกัน” sheet with 3 options: จดรายรับรายจ่าย / จดและเลือกหมวดครบ / ปิดการนับ.
  - When off: “ปิดการนับวันติดกันอยู่ · รายการที่จดไว้ยังอยู่ครบ เปิดการนับได้ทุกเมื่อ”, with the button “เปิดการนับ”.
- The tutorial (06) is a full-screen pager with 4 illustrations (tutorial-overview / streak / feed / return) and back/next buttons.

### 07 วางแผน, 08 ตั้งงบ, 09 จดซ้ำ (planning)
**Where:** from the summary (“วางแผนงบ”) or the profile tab.

**07 วางแผน:**
- Month switcher.
- **งบรวมทุกหมวด** hero card (accent): status icon and word, “ใช้ไป 9,999 จาก 10,000 ฿”, a 10px bar on `rgba(30,27,25,.16)`, “เหลือ … ฿” or “เกิน … ฿”, and an edit affordance. Empty state: “ยังไม่ได้ตั้งงบรวม” with the button “ตั้งงบรวม”.
- **งบแยกหมวด** list: icon, name, status word, 8px bar, “ใช้ไป X จาก Y ฿”, “เหลือ/เกิน”. Button “ตั้งงบแยกหมวด”.
- **รายการจดซ้ำ** list: “ทุกวันที่ 28 · ครั้งถัดไป 28 ต.ค.”, or “หยุดไว้ · หมูยังไม่จดให้” with a pause icon. Button “เพิ่มรายการจดซ้ำ”.

**08 ตั้งงบ (budget form, modal):**
- Period line, for example “สำหรับเดือนกันยายน 2569 · 1 ก.ย. – 30 ก.ย.”.
- Target segmented control: รวมทุกหมวด / เลือกหมวด (grid) / เลือกแท็ก (chips).
- Amount input at 32 with ฿.
- **Warning level as chips 50 / 70 / 80 / 90%** (before, typed by hand), with a sentence in baht: “ใช้ไปถึง 800 ฿ หมูจะเตือนว่าใกล้ครบงบ”.
- If the budget already exists: “มีงบนี้อยู่แล้ว … บันทึกแล้วจะใช้วงเงินใหม่แทน”.
- Delete with undo.

**09 จดซ้ำ (recurring form, modal):**
- Type tabs, name, amount.
- **Day-of-month grid 1–31** (before, an ISO date typed by hand), with the sentence “ครั้งแรก 5 ต.ค.” or “ครั้งแรก วันนี้ · หมูจดให้ทันทีที่บันทึก”. For days 29–31: “เดือนที่ไม่มีวันที่ 31 หมูจะจดวันสุดท้ายของเดือนแทน”.
- Category, **end month picked from a list** (“จดไปเรื่อย ๆ” or the next 12 months, each with its last date), note, **account chips** (before, typed by hand), tags.
- In edit mode: switch “หมูจดให้อัตโนมัติ” (pause without deleting), the note “แก้แล้วมีผลกับครั้งถัดไป…”, and delete with undo.
- Saving a new rule backfills past dates up to today, with a toast like “หมูจดย้อนหลังให้ 2 รายการ”.

### 10 พี่มนุษย์ (profile tab)
**Header:** accent block with “สวัสดี พี่มนุษย์!”, the line “มาช่วยกันดูแลการใช้จ่ายกันเถอะ” and the profile-greeting art at the bottom right.

**Sections, in order:**
1. **เครื่องมือของหมู** (moved to the top, each row with live status):
   - วางแผนงบและจดซ้ำ: “เดือนนี้ตั้งไว้ 4 งบ · เกินงบ 1 · จดซ้ำ 3 รายการ”
   - แครอตของน้องหมู: “จดติดกัน 7 วัน”
   - หมูอ่านสลิป: last scan result, or “ยังไม่ได้อนุญาตเข้าถึงรูป · แตะเพื่ออนุญาต”
2. **รายการ:** จัดการหมวดหมู่, จัดการแท็ก, บัตรเครดิตของฉัน (badge “ใหม่”, status line), and ส่งออกข้อมูล. Export makes a real UTF-8 CSV with a BOM and these columns: วันที่, เวลา, ประเภท, ชื่อรายการ, หมวด, จำนวนเงิน (บาท), บัญชี, แท็ก, โน้ต, ที่มา.
3. **บัญชีและความเป็นส่วนตัว:** email (the signed-in address), the 2 consent switches (they share state with onboarding), and the full terms sheet.
4. **การแสดงผล:** ธีม (sheet: สว่าง / มืด), ตั้งค่าปฏิทิน (the value shows the current mode, for example “รายเดือน · วันที่ 25”), and ภาษา (a plain info row “ภาษาไทย”).
5. **ช่วยเหลือ:** แนะนำการใช้งาน, คำถามที่หมูเจอบ่อย (accordion), สลิปที่หมูอ่านได้, หมูไม่อ่านสลิปบางธนาคาร?, บัตรเครดิตที่หมูจดได้. All open as bottom sheets.

**Bottom of the page:**
- “ออกจากระบบ”: a confirm sheet, then the auth screen.
- Version line.
- Rows that only said “เร็ว ๆ นี้” are gone and replaced by one line: “เพจ Facebook และ LINE Open Chat เร็ว ๆ นี้”.

### 11 ค้นหา (search)
**Search field:** 48 tall, radius 24, `raised`, with a clear button. It gets focus when the screen opens.

**What it matches:**
- **All months at once.** The current app searches 2 months per page.
- Matches on title, note, category name, account name, or **amount** (“419” finds Netflix).

**Results:**
- Grouped by day, newest first, with the header “พบ 3 รายการ · รายจ่ายรวม … ฿”.
- Matches are highlighted with an `accent` background and `onAccent` text.
- Tapping a result opens the editor, or the category picker if the item is pending.

**Before typing:** recent searches (each removable), the empty-state pig, the hint “พิมพ์ชื่อร้าน ชื่อผู้รับ โน้ต หรือจำนวนเงินก็ได้ · หมูค้นให้ทุกเดือน”, and example chips Grab / อาหาร / เงินเดือน.

**No results:** “ไม่พบ “{คำ}”” plus a suggestion.

### 12 หมวดหมู่และแท็ก
**Tabs:** หมวดหมู่ / แท็ก.

**หมวดหมู่ tab:**
- Chips to choose รายจ่าย / รายรับ.
- **หมวดที่สร้างเอง** list with usage counts (“ใช้ใน 3 รายการ”); tap to edit.
- **หมวดพื้นฐาน** in a 4-column grid, labeled “แก้ไขหรือลบไม่ได้”.

**แท็ก tab:**
- **แท็กของฉัน** with usage counts.
- **แท็กแนะนำ**, where one tap adds a tag.

**Edit sheet:**
- Name field.
- For categories, an icon grid of 12 emoji in 6 columns (the color choice is removed because it wasn't shown anywhere).
- Errors: “มีหมวดชื่อนี้แล้ว” / “มีแท็กชื่อนี้แล้ว”, and 20 characters max for tags.

**Delete:** runs at once, with undo. Items that used a deleted category go back to pending; deleted tags come off their items.

**Also changed:** the current app's “จัดการ” mode toggle is removed.

### 13 ตั้งค่าปฏิทิน (calendar settings)
Changes apply **immediately**, so there is no save button and no confirm dialog. A caption says “แตะเลือกแล้วใช้ได้ทันที ไม่ต้องกดบันทึก”.

**Layout:**
- **หน้าแรกแสดงยอดทีละ:** radio cards รายเดือน / ราย 2 สัปดาห์ / รายสัปดาห์. Each shows its current range, for example “รอบนี้ 27 ก.ย. – 3 ต.ค. 69”.
- Weekly or 2-weekly: **สัปดาห์เริ่มวัน**, 7 chips (อา–ส) with the note “เริ่มวันอาทิตย์ จบวันเสาร์”. Changing the weekday resets the 2-week anchor to this week.
- 2-weekly: **รอบ 2 สัปดาห์นี้คือ**, two radio cards, “เริ่มสัปดาห์นี้” and “เริ่มสัปดาห์ที่แล้ว”, each with its date range.
- **วันเริ่มเดือน:** a 1–31 grid.
  - It affects Home in monthly mode, the summary and budgets. The caption says so: “ใช้กับหน้าแรก หน้าสรุป และงบ”, or “ใช้กับหน้าสรุปและงบ ซึ่งนับเป็นรายเดือนเสมอ”.
  - Info box: “เดือนนี้: 25 ก.ย. – 24 ต.ค. 69”, plus a hint (salary-day example; the 29–31 note).
- “คืนค่าเริ่มต้น · รายเดือน เริ่มวันที่ 1” (only shown when a setting differs from the default), with an undo toast.

**Replaces:** the current wheel pickers, the fortnight modal and the save-confirm dialog.

**Period logic** (the same as `features/home/period.ts` and `getPeriodForDate`):
- A month period runs from the start day (capped at the month's last day) to the day before the next start day. Its label is the start month.
- A week starts on `weekStart`.
- A 2-week period is `anchor + 14·floor(daysBetween(anchor, today)/14)`.

### 14 บัตรเครดิตของฉัน (credit cards)
**Layout:**
- Caption “บัตรที่เคยใช้จดรายการจะแสดงที่นี่”.
- Accent card for each card: `mdi-credit-card-outline`, “บัตร KTC”, “•••• 4821”, the caption “ใช้ไปเดือนนี้ · 1 ก.ย. – 30 ก.ย.”, the amount at 32, and “3 รายการ”.
- **รายการล่าสุดของบัตรนี้:** the latest 3 items. Tapping one opens the editor, or the queue if it's pending.
- “ดูทั้งหมด N รายการ ›” opens search with “KTC” already typed.
- Tip box: “ตอนจดรายการ เลือกบัตรในช่อง “จ่ายจากบัญชี” ยอดจะมารวมที่นี่”.
- Footer button “+ จดรายการบัตรเครดิต” opens the editor with the card already chosen.

---

## Interactions & navigation map
- Splash → auth → (sign up) greeting → steps 1–4 → ready → Home. (Sign in) → Home.
- Home:
  - Carrot chip → 05, then the tutorial 06.
  - Search → 11. Wallet → filter sheet.
  - Speech link → category queue sheet, or the photo permission.
  - “ดูสรุป” → 03 → “วางแผนงบ” → 07 → 08 / 09.
  - Row → 02 (pending rows → queue sheet).
  - “จดเพิ่ม” → 02.
- Tab พี่มนุษย์ → 10 → 07, 05, 04, 12, 14, 13, info sheets, and sign-out → auth.
- 02 → category sheet → “จัดการหมวดหมู่” → 12 (stacked above the editor). 02 → “จดซ้ำล่วงหน้า” → 09.
- 14 → 11 (search) / 02 (editor).
- **Stacking order in the prototype (low → high):**
  1. Home / profile content
  2. Summary 15, import 16, streak / settings / cards 17, plan 18, search 19
  3. Editor 20, budget / recurring forms 21, categories 22
  4. Home sheets 24–25, profile sheets 26–27
  5. Onboarding / auth 35
- **Escape (desktop):** closes the top-most sheet, then the top-most screen.
- **Undo toasts:** entry delete, budget delete, recurring rule delete, category and tag delete, calendar reset.

## State management (what the app needs)
- **Transactions:** `{ id, date (ISO), time, kind: expense|income|transfer, satang (int), title, note, source: manual|slip|statement|recurring, wallet, categoryId|null, tagIds[], ruleId? }`.
  - “Pending” means `kind !== transfer && !categoryId`.
  - Amounts are stored in **satang**.
- **Categories:** `[id, name, emoji]`. The `expense-*` and `income-*` system defaults come from `packages/api/src/shared/finance/category.service.ts`. Custom categories use ids like `expense-custom-*`.
- **Tags:** `{ id, name }`.
- **Budgets:** `{ id, periodKey: 'YYYY-MM', target: all|category|tag, categoryId, tagId, limitSatang, warn }`.
- **Recurring rules:** `{ id, kind, satang, title, day 1–31, startsOn, endMonth|null, categoryId, tagIds, wallet, note, active }`.
- **Calendar preferences:** `{ openPeriod: month|fortnight|week, monthStartDay 1–31, weekStart 0–6, fortnightAnchor ISO }`. These map to the existing `calendar_open_period`, `calendar_week_start` and `calendar_fortnight_anchor` settings and to `setMonthStartDay`.
- **Onboarding answers:** terms accepted, photo permission (unknown / granted / limited / denied / skipped), reasons[], birthday, personalization, updates.
- **Auth:** email, name.
- **UI state:**
  - Home: period offset, wallet filter.
  - Entry draft `{ kind, amount (string), title, occurredOn, categoryId, tagIds, note, wallet }` compared against its initial value to detect unsaved changes.
  - Keypad calculator state.
  - Theme (light / dark; the current app follows the system only, and the prototype adds a manual choice).

## Assets (in `assets/`, from `apps/native/assets/generated/`, resized to 480–720px wide)
- **Mascot and brand:** brand-mascot.png (mascot), carrot-reward.png (streak chip, profile row).
- **Entry:** entry-pig.png (unsaved-changes dialog).
- **Onboarding:** onboarding-welcome / privacy / slips / reasons / final.png.
- **Profile and search:** profile-greeting.png (profile header), search-empty-pig.png (search empty state).
- **Streak:** streak-hero.png, tutorial-overview / streak / feed / return.png.
- **Fonts:** `fonts/LINESeedSansTH-Regular.ttf` is the only weight used. The current app also bundles Bold, ExtraBold and Heavy; those can be dropped.
- **Icons:** Material Design Icons (`@mdi/font` 7.4.47) plus a few inline line icons (search, wallet, calendar, pencil, chevrons) at 2px stroke. In RN, use `@expo/vector-icons/MaterialCommunityIcons` or the app's own `HomeIcon`.

## Files
- `Moojot Home.dc.html`: the whole prototype (template and logic). It opens in a browser next to `support.js`.
- `support.js`: the prototype runtime (not part of the design).
- `ios-frame.jsx`, `android-frame.jsx`: status bars and nav bars for the device frames (not part of the design).
- `fonts/`, `assets/`: see above.
- `screenshots/`: 29 PNGs of the iPhone frame at 1× (402×874; Android 412×892), light theme unless noted. Names match the screen numbers above:
  - Auth and onboarding: 00a-auth-signup, 00b-auth-signin-error, 00c-onboarding-greeting, 00d-onboarding-terms, 00e-onboarding-slips, 00f-onboarding-goals, 00g-onboarding-extras, 00h-onboarding-ready
  - Home: 01a-home, 01b-home-dark, 01c-home-android, 01d-home-filter-sheet, 01e-home-category-queue, 01f-home-reading-slips
  - Entry editor: 02a-entry-create-keypad, 02b-entry-edit-slip
  - Other screens: 03-summary, 04-slip-import, 05-streak, 06-streak-tutorial, 07-plan, 08-budget-form, 09-recurring-form, 10-profile, 11-search, 12a-categories, 12b-tags, 13-calendar-settings (month start set to 25), 14-credit-cards
  - The screenshots are a quick visual reference. The HTML prototype is the source of truth for sizes and behavior.

**Viewing tips:** above the phone there are switches for iPhone / Android and light / dark, plus test buttons (first launch, new slip, photo access, reset). There are also props: `device`, `theme`, `startAt` (onboarding | home) and `showControls`.

### Source files in the repo
| Prototype screen | Repo files |
|---|---|
| 00 auth | app/(auth)/sign-in.tsx, sign-up.tsx |
| 00 onboarding | app/onboarding/* , features/onboarding/components/onboarding-controls.tsx |
| 01 Home | app/(app)/(tabs)/index.tsx, _layout.tsx, features/home/*, constants/theme.ts |
| 02 editor | app/(app)/(entries)/entry/index.tsx, [id].tsx, features/entries/* |
| 03 summary | app/(app)/(tabs) summary route (ดูสรุป) |
| 04 slips | features/slips/auto-import/* |
| 05–06 streak | app/(app)/(streak)/* |
| 07–09 planning | app/(app)/(planning)/plan.tsx, budget-form.tsx, recurring-form.tsx |
| 10 profile | app/(app)/(tabs)/settings.tsx, app/(app)/(settings)/settings/* |
| 11 search | app/(app)/(entries)/search.tsx |
| 12 categories & tags | app/(app)/(categories)/categories.tsx, tags.tsx |
| 13 calendar | app/(app)/(settings)/settings/calendar.tsx, features/home/period.ts |
| 14 cards | app/(app)/(settings)/settings/cards.tsx |

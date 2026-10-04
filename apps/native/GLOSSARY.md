# Mobile Ledger

Shared terms for finance entries and their groups in the Moojot mobile app.

## Language

**Transaction bank** (`ธนาคารของรายการ`):
The bank used to group finance entries.
Entries at one bank share one group, including multiple accounts and both slip and manual entries.
_Avoid_: Individual bank account (`บัญชีธนาคารรายบัญชี`), when referring to a bank group.

**Transaction card** (`บัตรของรายการ`):
The credit card used for the entry's spending.
Its identity includes the card name and last four digits.

**Transaction date** (`วันรายการ`):
The reference date for a finance entry.
Manual entries use the selected date, slip entries use the extracted date, and recurring entries use their due date.

**Transaction time** (`เวลาทำรายการ`):
The time of the financial event according to the entry's evidence.
This time may be unknown when the evidence supplies only a date.
_Avoid_: Recording time (`เวลาบันทึก`).

**Recording time** (`เวลาบันทึก`):
The time when Moojot saved the entry.
_Avoid_: Transaction time (`เวลาทำรายการ`).

**Budget** (`งบ`):
A planned limit that the user sets for expenses during a period.
It may cover all categories, one category, or one tag.

**Over budget** (`เกินงบ`):
A budget whose spending exceeds its limit.
Spending equal to the limit is not over budget.
_Avoid_: Reached the limit (`ครบงบ`), when referring to over-budget spending.

**Near budget limit** (`ใกล้ครบงบ`):
A budget whose spending reaches the configured warning percentage without exceeding its limit.
This includes spending exactly equal to the limit.

**Summary month** (`เดือนสรุป`):
The one-month period that Summary counts, starting on the user's configured month-start day.
Summary remains monthly when Home shows weeks or fortnights.
_Avoid_: Period (`รอบ`), when referring to a Summary month.

**Share of transaction kind** (`สัดส่วนของชนิดรายการ`):
A category's or tag's amount compared with the total for the selected transaction kind, expense or income.
An entry with multiple tags counts in each tag, so combined tag shares can exceed 100%.

**Needs-help work** (`ต้องช่วยหมู`):
Slip images whose reading outcome still needs action, such as incomplete data or an unavailable reading service.
Manual entry or retry handles the work according to its cause.

**Pending-category transaction** (`รายการรอเลือกหมวด`):
A saved expense or income entry with no selected category.

**Category queue** (`คิวเลือกหมวด`):
Pending-category transactions within the scope the user opened, such as today, one row, or one Summary group.
The queue presents one entry at a time for choosing a category, skipping, or editing.
_Avoid_: All pending-category transactions (`รายการรอเลือกหมวดทั้งหมด`), when the queue has a narrower scope.

**Unspecified-account transaction** (`รายการไม่ระบุบัญชี`):
An entry without a transaction bank or transaction card, regardless of manual or slip origin.
A manual entry with a bank belongs to that bank's group.
_Avoid_: Manual entry (`รายการจดเอง`), when referring to the unspecified group.

**Recurring rule** (`กฎจดซ้ำ`):
A rule that makes Moojot create finance entries on the due dates the user sets.

**Recurring pause interval** (`ช่วงหยุดจดซ้ำ`):
A period when the user intentionally disables a recurring rule.
Resuming the rule does not create entries for due dates within that period.
_Avoid_: App inactivity (`ช่วงที่ไม่ได้เปิดแอป`), when referring to an intentional rule pause.

**Setup** (`ตั้งค่าเริ่มใช้งาน`):
The steps a new account completes before Home: terms, photo access, goals, and optional information, then a recap.
Setup is complete only after the server saves the account's answers.
_Avoid_: Onboarding complete, when the answers are not saved yet.

**Photo access** (`สิทธิ์เข้าถึงรูปภาพ`):
The device permission for Moojot to read photos: full, limited, or refused.
Automatic slip reading needs full access.
A skipped photo step (`ข้ามไปก่อน`) is a choice in Setup, not a permission.

**Found slip photos** (`รูปในอัลบั้มสลิป`):
Images from the last 30 days in the supported bank albums, counted in Setup.
They are unread, and they are not saved entries.
_Avoid_: Slips or transactions, when referring to counted photos.

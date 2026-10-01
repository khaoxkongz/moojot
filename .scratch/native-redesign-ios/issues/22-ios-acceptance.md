# 22: ตรวจรับแอปครบชุดบน iOS

**What to build:** ทดลองทุก flow กับชุดข้อมูลใหม่บน iPhone จริงและเครื่องจำลอง มีหลักฐานว่าหน้าตาและข้อมูลทำงานร่วมกันตาม spec

**Blocked by:** 21 — [เริ่มข้อมูลทดลองใหม่ในบัญชีเดิม](21-scoped-cutover.md)

**Status:** ready-for-agent

**Source:** [Spec: ปรับแอปหมูจดตามดีไซน์ใหม่ — ตรวจรับ iOS ก่อน](../spec.md)

**User stories:** 1–110 (integration/visual acceptance)

**Why blocked:** ต้องเปลี่ยนชุดข้อมูลและผ่านเส้นทางหลักในงานเริ่มข้อมูลทดลองใหม่ก่อนรับงานทั้งชุด

- [ ] เดิน auth/onboarding/Home/editor/slips/summary/search/budgets/rules/manager/calendar/streak/profile/cards/CSV ครบ primary task พร้อม failure/recovery ของ flow โหลดหรือ save
- [ ] เปรียบเทียบภาพ 29 ภาพและ states/sheets ที่ไม่มีภาพกับ handoff ทั้ง light/dark คง copy/spacing/assets/motion/targets
- [ ] ตรวจ iPhone 13 Pro/ExpoGo จริง และ iPhone 11 จำลอง/DeviceHub แยกผล; permission/photo behaviors ที่ simulator พิสูจน์ไม่ได้ตรวจเครื่องจริง
- [ ] Keyboard, safe areas, Dynamic Type, ไทย/ชื่อ/ยอดยาว, scroll/back/dismiss/unsaved draft ยังทำงานครบ
- [ ] Cross-feature data consistent: เปลี่ยนหมวด/filter/calendar/undo/rule/work queue แล้วทุก consumer ได้ข้อมูลจริง ไม่ข้ามข้อมูลหน้าอื่น
- [ ] รัน check, tests ที่เปลี่ยน และ check-types ของ workspace ที่แก้; ผ่านเกณฑ์ fixture สำคัญของ spec โดยไม่อ้างว่าชุดเดิมพอ
- [ ] ตัด legacy UI/font aliases ที่ไม่ใช้เมื่อผู้เรียกย้ายครบ และตรวจไม่ทำให้ flow เดิมหรือสัญญาที่ต้องคงอยู่เสีย
- [ ] รายงาน evidence/เครื่อง/รุ่น/runtime และกรณียังไม่ตรวจอย่างตรงไปตรงมา Android ไม่เป็นเงื่อนไขรับงานรอบนี้; bug ที่พบมี issue แยก ไม่ปิดงานที่เกณฑ์ยังไม่ครบ

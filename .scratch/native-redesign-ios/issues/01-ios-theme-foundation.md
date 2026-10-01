# 01: ตัวอักษรและธีมบน iOS

**What to build:** เปิดแอปเดิมบน iOS และเลือกสว่าง/มืดได้จริง หน้าแรกและหน้าจดใช้ฟอนต์ สี และฐาน controls ร่วมตามดีไซน์ เป็น prefactor ก่อนปรับ flow อื่น โดยคงการอ่านและบันทึกเดิมให้ใช้งานได้

**Blocked by:** None (can start immediately)

**Status:** done

**Done in:** 28a2ba6 feat(native): add iOS theme foundation for the redesign; 4cdc481 fix(native): keep fills readable and put baht after amounts

**Source:** [Spec: ปรับแอปหมูจดตามดีไซน์ใหม่ — ตรวจรับ iOS ก่อน](../spec.md)

**User stories:** 1–5, 7, 10, 110

**Why blocked:** เป็นฐาน typography/theme/controls และทางรัน iOS ที่งานหน้าจอถัดไปใช้

- [ ] เก็บ design reference ชุดที่ผูก version พร้อม assets/font/copy สำหรับตรวจต่อได้ ไม่ใช้ HTML runtime เป็นแอปจริง
- [ ] รันแอปและเชื่อม API ทดสอบบน iOS ได้ แยกผล iPhone 13 Pro/Expo Go กับ iPhone 11 จำลอง/Device Hub; หากต้อง build ให้บอกเหตุจาก capability จริง
- [ ] เลือกธีมจากหน้าตั้งค่าแล้วเก็บค่าจริง เปิดแอปใหม่ยังใช้ค่าที่เลือก และ root/navigation/status/components ใช้ palette เดียวกัน
- [ ] ข้อความไทย Regular 400 และยอดเงิน font ระบบ 500/tabular ในหน้าอ้างอิง; safe areas, touch targets และ Dynamic Type เข้าถึง actions ได้
- [ ] ปรับฐาน reusable controls โดยรักษา interface เดิมหรือเพิ่มแบบใหม่คู่กันก่อนย้ายผู้เรียก ไม่ทำให้ screens เดิม compile หรือทำงานไม่ได้
- [ ] ความล้มเหลวในการโหลด/บันทึกธีมแสดงตามจริงและไม่ทำให้ preference/หน้าจอแย้งกัน; มีภาพตรวจ light/dark และ primary task เดิมบน iOS

## Comments

**2026-10-01 — agent:** โค้ดเสร็จใน 28a2ba6 feat(native): add iOS theme foundation for the redesign และ 4cdc481 fix(native): keep fills readable and put baht after amounts (merge เข้า `feat/native-redesign-ios` ที่ 12f77b9) `vp check`, `vp test` (201), native check-types และ lint ผ่าน design reference อยู่ที่ `docs/design/native-redesign-2026-09-30/`

เหลือให้คนตรวจบน iPhone 13 Pro (Expo Go) และ iPhone 11 จำลอง (Device Hub) แล้วค่อยตั้ง `Status: done`:

- เปิดด้วย `expo start --go` (มี `expo-dev-client` ติดตั้งอยู่ ถ้าไม่ใส่ `--go` จะหา development build) และเชื่อม API ทดสอบที่รันจริง
- เลือก มืด/สว่าง ในหน้าธีม → ปิดแอปแล้วเปิดใหม่ ธีมคงอยู่ทุกหน้า รวม tabs, modals, status bar และคีย์บอร์ด
- หน้าแรกและหน้าจด light/dark เทียบ `screenshots/01a-home.png`, `01b-home-dark.png`, `02a-entry-create-keypad.png`: ไทย Regular, ยอดเงิน 500/tabular, ฿ หลังยอดน้ำหนักปกติ (ตรวจว่า ฿ ใน hero วางตรงเส้นฐานตัวเลข), ยอดยาวย่อขนาด, tab bar อยู่เหนือ home indicator
- Dynamic Type ขนาดใหญ่สุด: ยังกดบันทึก (หน้าจด) และปุ่มย้อนกลับในหน้าตั้งค่าได้
- primary task เดิม: สร้าง แก้ และบันทึกรายการกับ API จริง
- เก็บภาพ light/dark เป็นหลักฐาน (ภาพจำลองหน้า sign-in ที่ agent ถ่ายไว้ไม่พอสำหรับข้อนี้)

**2026-10-01 — ผู้ใช้ตรวจบน iOS:** ผ่าน

- เลือกธีมมืด → ปิดแล้วเปิดใหม่ ทุกหน้ามืด; เลือกธีมสว่าง → ปิดแล้วเปิดใหม่ ทุกหน้าสว่าง
- ฿ ใน hero หน้าแรกวางเสมอแนวตัวเลข
- จด แก้ และบันทึกรายการกับ API ทำงานเหมือนเดิม
- Dynamic Type ขนาดใหญ่สุด: ไม่ได้ทดสอบ ผู้ใช้ตัดสินว่าไม่จำเป็นสำหรับตั๋วนี้

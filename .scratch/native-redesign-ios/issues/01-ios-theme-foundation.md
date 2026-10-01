# 01: ตัวอักษรและธีมบน iOS

**What to build:** เปิดแอปเดิมบน iOS และเลือกสว่าง/มืดได้จริง หน้าแรกและหน้าจดใช้ฟอนต์ สี และฐาน controls ร่วมตามดีไซน์ เป็น prefactor ก่อนปรับ flow อื่น โดยคงการอ่านและบันทึกเดิมให้ใช้งานได้

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Source:** [Spec: ปรับแอปหมูจดตามดีไซน์ใหม่ — ตรวจรับ iOS ก่อน](../spec.md)

**User stories:** 1–5, 7, 10, 110

**Why blocked:** เป็นฐาน typography/theme/controls และทางรัน iOS ที่งานหน้าจอถัดไปใช้

- [ ] เก็บ design reference ชุดที่ผูก version พร้อม assets/font/copy สำหรับตรวจต่อได้ ไม่ใช้ HTML runtime เป็นแอปจริง
- [ ] รันแอปและเชื่อม API ทดสอบบน iOS ได้ แยกผล iPhone 13 Pro/Expo Go กับ iPhone 11 จำลอง/Device Hub; หากต้อง build ให้บอกเหตุจาก capability จริง
- [ ] เลือกธีมจากหน้าตั้งค่าแล้วเก็บค่าจริง เปิดแอปใหม่ยังใช้ค่าที่เลือก และ root/navigation/status/components ใช้ palette เดียวกัน
- [ ] ข้อความไทย Regular 400 และยอดเงิน font ระบบ 500/tabular ในหน้าอ้างอิง; safe areas, touch targets และ Dynamic Type เข้าถึง actions ได้
- [ ] ปรับฐาน reusable controls โดยรักษา interface เดิมหรือเพิ่มแบบใหม่คู่กันก่อนย้ายผู้เรียก ไม่ทำให้ screens เดิม compile หรือทำงานไม่ได้
- [ ] ความล้มเหลวในการโหลด/บันทึกธีมแสดงตามจริงและไม่ทำให้ preference/หน้าจอแย้งกัน; มีภาพตรวจ light/dark และ primary task เดิมบน iOS

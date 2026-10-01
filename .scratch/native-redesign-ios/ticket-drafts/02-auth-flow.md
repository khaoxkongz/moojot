# 02: สมัครและเข้าสู่ระบบ

**What to build:** สมัคร เข้าสู่ระบบ สลับ mode และออกจากระบบได้ตามดีไซน์ พร้อม field errors และข้อความบัญชีจากผล auth จริง

**Blocked by:** 01 — [ตัวอักษรและธีมบน iOS](01-ios-theme-foundation.md)

**Status:** draft — awaiting breakdown approval

**Source:** [Spec: ปรับแอปหมูจดตามดีไซน์ใหม่ — ตรวจรับ iOS ก่อน](../spec.md)

**User stories:** 11–19, 98

**Why blocked:** ต้องใช้ฐานข้อความ/ธีมและ controls ที่พร้อมในงานตัวอักษรและธีม

- [ ] First launch เปิดสมัคร; สลับ modes คงข้อมูลที่เกี่ยวข้อง; logout ยืนยันแล้วเปิด signin พร้อมอีเมลล่าสุด โดยไม่เก็บรหัสผ่านข้าม logout
- [ ] ชื่อ ≥2 ตัว อีเมลถูกต้อง รหัสผ่าน ≥8 ตัว พร้อม show/hide, live rule และ Enter focus/submit ตาม handoff
- [ ] CTA ตรวจข้อมูลไม่ครบและแสดง field errors ได้ typing ล้างเฉพาะ error ที่แก้; pending ป้องกันส่งซ้ำและไม่ทำข้อมูลหาย
- [ ] Unknown email/wrong password/duplicate signup แสดงข้อความและ action ตามข้อเท็จจริงของ auth contract ไม่เดาจาก error เดียว
- [ ] Signup เข้า greeting; signin ที่ครบ onboarding เข้า Home พร้อมชื่อ; incomplete account ยังผ่าน guard ให้เริ่มใช้งานต่อได้
- [ ] ตรวจผ่าน auth interface กับบัญชี fixture ครบ success/failure/recovery และเดิน keyboard/back/mode switch บน iOS

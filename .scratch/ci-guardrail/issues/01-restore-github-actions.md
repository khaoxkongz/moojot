# 01: เปิด CI บน GitHub Actions กลับมา

**Status:** ready-for-human

**Blocked by:** บัญชี GitHub ถูกล็อกเพราะการชำระเงินไม่ผ่าน (Actions ขึ้น "account is locked due to a billing issue" ทั้งตอน repo เป็น private และ public)

**What to build:** ใส่ `.github/workflows/ci.yml` กลับเมื่อบัญชีปลดล็อก ไฟล์เดิมอยู่ใน commit 57ea9a9 และถูกเอาออกเพื่อไม่ให้ทุก PR ขึ้นว่าล้มโดยที่โค้ดไม่ผิด

- [ ] คืนไฟล์ด้วย `git checkout 57ea9a9 -- .github/workflows/ci.yml` และอัปเดต `voidzero-dev/setup-vp` เป็น release ล่าสุด
- [ ] PR แรกหลังคืนไฟล์ต้องผ่าน `vp check`, `vp test` และ `vp run check-types` บน GitHub

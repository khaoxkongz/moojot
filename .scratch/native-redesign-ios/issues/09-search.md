# 09: ค้นหาทุกเดือนและจำนวนเงิน

**What to build:** ค้นด้วยสิ่งที่จำได้ข้ามทุกเดือน เห็นผลและยอดครบ พร้อม highlight/recent searches และเปิดแก้หรือเลือกหมวดต่อได้

**Blocked by:** 05 — [หน้าแรก ตัวกรอง และคิวเลือกหมวด](05-home-filter-queue.md)

**Status:** ready-for-agent

**Source:** [Spec: ปรับแอปหมูจดตามดีไซน์ใหม่ — ตรวจรับ iOS ก่อน](../spec.md)

**User stories:** 64–69

**Why blocked:** ใช้ editor และ pending queue/filter identity ที่พร้อมผ่านงานหน้าแรก

- [ ] เอาขอบเขตสองเดือนออก มี pagination หรือ aggregate ที่ให้ counts/expense total ของผลทั้งหมดถูกต้องเมื่อเกิน 1,000 แถว (stories 64, 69)
- [ ] จับ title/note/category/Thai bank/card/amount ตามพฤติกรรมข้อความ baht ในต้นแบบ รวม comma/decimal ไม่เปลี่ยนเป็น exact-only เอง (story 65)
- [ ] Grouped day/newest order, matched highlights, initial focus/clear, examples/no-results และ recent add/remove ทำงานจริง (stories 66, 67)
- [ ] ผล pending ไปคิวและผลอื่นไป editor; prefilled query รองรับ exact card name+last4 scope เพื่อใช้จากหน้าบัตรภายหลัง (story 68)
- [ ] คำขอเก่าหรือ error ไม่ทับผลของคำล่าสุด และ recovery ไม่ทำคำค้นหาย
- [ ] ตรวจ authenticated query contract กับ >1,000 rows และหลายใบชื่อเดียวกัน พร้อมเดิน search→edit/queue บน iOS

## Comments

**จากงาน 04 (review):** รายการเก็บธนาคารเป็น identity แบบที่สลิปใช้ ("KBank", "SCB", "KTB", "BBL", "Krungsri", "ttb", "TrueMoney") และแสดงชื่อไทยด้วย `bankDisplayName` (`apps/native/features/wallets/banks.ts`) แถวเก่าอาจเป็นชื่อไทย ("กสิกรไทย") ตอนนี้ server ค้น `bank contains search` ตรงตัว ค้น "กสิกร" จึงไม่เจอแถว "KBank" งานนี้ต้องค้นด้วยทุกชื่อของธนาคารเดียวกัน (เช่นแปลงคำค้นเป็นกลุ่ม identity ก่อนส่ง หรือย้ายตาราง alias ไปไว้ที่ใช้ร่วมกับ server)

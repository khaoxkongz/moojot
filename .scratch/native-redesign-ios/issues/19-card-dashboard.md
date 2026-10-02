# 19: ดูรายการและยอดของบัตร

**What to build:** จากหน้าบัตรดูยอดเดือนนี้และสามรายการล่าสุด เปิดดูทั้งหมดหรือจดเพิ่มโดยคงบัตรใบที่เลือก

**Blocked by:** 09 — [ค้นหาทุกเดือนและจำนวนเงิน](09-search.md); 11 — [เพิ่มและเลือกบัตร](11-first-card.md)

**Status:** ready-for-agent

**Source:** [Spec: ปรับแอปหมูจดตามดีไซน์ใหม่ — ตรวจรับ iOS ก่อน](../spec.md)

**User stories:** 105–106

**Why blocked:** ต้องมีบัตรจริงที่เลือกได้และ search ที่รับ exact card scope/prefill ได้

- [ ] แสดงบัตรจากรายการจริงตามชื่อ+last4 พร้อม empty state ไม่สร้างบัตร seed ให้ผู้ใช้
- [ ] ยอด/จำนวนรายจ่ายเดือนบัญชีครบทุกหน้าตาม custom bounds และสามรายการล่าสุดทุกชนิดจากทุกเดือน (story 105)
- [ ] ดูทั้งหมดเข้า search พร้อม query ที่เกี่ยวข้องและ exact card identity ไม่รวมอีกใบชื่อเดียวกัน (story 106)
- [ ] Pending row เปิด queue/other เปิด editor; จดเพิ่ม prefill card ที่เลือก ไม่ hardcode ใบแรกเมื่อมีหลายใบ (story 106)
- [ ] Profile ใช้ข้อมูล/สถานะบัตรชุดเดียวกันได้ และ loading/error/empty ไม่แสดงยอด seed
- [ ] ตรวจ query totals กับหลายใบชื่อเดียวกัน/>1,000 rows และ dashboard→search/editor บน iOS

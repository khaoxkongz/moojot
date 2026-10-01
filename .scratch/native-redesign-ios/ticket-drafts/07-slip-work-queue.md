# 07: ผลอ่านสลิปและงานต้องช่วยหมู

**What to build:** ดูผลสามกลุ่ม ไปหน้าอื่นขณะอ่านได้ และกลับมาจัดการสลิปค้างด้วยจดเองหรือลองใหม่ตามสาเหตุจนเสร็จ โดยไม่สร้างรายการซ้ำ

**Blocked by:** 05 — [หน้าแรก ตัวกรอง และคิวเลือกหมวด](05-home-filter-queue.md); 06 — [อ่านสลิปและดูหลักฐานจริง](06-slip-evidence.md)

**Status:** draft — awaiting breakdown approval

**Source:** [Spec: ปรับแอปหมูจดตามดีไซน์ใหม่ — ตรวจรับ iOS ก่อน](../spec.md)

**User stories:** 48–59

**Why blocked:** ใช้ Home navigation/status ที่เสร็จและผลอ่านพร้อมหลักฐาน/transaction binding จากงานอ่านสลิป

- [ ] Owner รอบอ่านระดับ signed-in app อ่านต่อเมื่อเปลี่ยน route; background/lock/permission loss หยุดส่งรูปใหม่ และ resume เมื่อ eligible; account switch/logout แยกผล
- [ ] หน้าผลแยก created→จดให้แล้ว, duplicate/no-candidate→ข้ามไป, incomplete→ต้องช่วย พร้อม actions ที่ทำงานจริง
- [ ] เก็บงานค้างตามบัญชีบนมือถือข้ามรอบ/วัน/restart และเกินช่วงค้นรูป 30 วันจนจัดการเสร็จ ไม่ใช้ lastRound แทน durable queue
- [ ] Incomplete รูปเดิมที่จำผลไว้ไม่ส่ง GenAI ซ้ำอัตโนมัติ; transient failures ใช้ backoff/Retry-After/eligibility และ targeted retry ที่เลือกงานได้
- [ ] จดเองจากงานค้างเติมวันรูป เก็บ handled state และผูกภาพกับ transaction ID ที่สำเร็จ
- [ ] Manual-vs-inflight/ตอบกลับสูญหาย/คำขอซ้ำใช้ identity ของรูปเดียวกันและ reconcile conflict จนมีรายการเดียว ไม่มี successful-toast เทียม
- [ ] รูปหายหรือสิทธิ์เปลี่ยนยังคงงานและแจ้งข้อจำกัด; ค่าจาก user เก่าไม่เข้าสถานะ user ใหม่
- [ ] พิสูจน์ session+native transport+server+ฐานทดสอบด้วย clock/photo/storage/provider ที่ควบคุมได้ และเดินผลอ่าน→จดเอง/ลองใหม่บน iOS

# 21: เริ่มข้อมูลทดลองใหม่ในบัญชีเดิม

**What to build:** เปลี่ยนมาทดลองแอปโฉมใหม่ด้วยสมุดข้อมูลใหม่ โดยใช้อีเมลเดิมและไม่กระทบบัญชีอื่น

**Blocked by:** 03 — [เริ่มใช้งานสี่ขั้น](03-onboarding.md); 08 — [สรุปยอดและแนวโน้ม](08-summary.md); 15 — [ลบหมวดหรือแท็กแล้วกู้คืนครบ](15-category-tag-cascade-undo.md); 16 — [ตั้งค่าปฏิทินแล้วใช้ทันที](16-calendar.md); 17 — [แครอต สตรีค และบทสอน](17-streak.md); 18 — [ส่งออก CSV พร้อมวันเวลาจริง](18-csv.md); 19 — [ดูรายการและยอดของบัตร](19-card-dashboard.md); 20 — [หน้า พี่มนุษย์ และคำแนะนำ](20-profile.md)

**Status:** draft — awaiting breakdown approval

**Source:** [Spec: ปรับแอปหมูจดตามดีไซน์ใหม่ — ตรวจรับ iOS ก่อน](../spec.md)

**User stories:** 109

**Why blocked:** ต้องให้ทุก flow และ schema/API/client พร้อมก่อนเริ่มชุดข้อมูลใหม่ Blockers เป็นงานปลายสายที่ครอบงานก่อนหน้าทั้งหมดผ่าน dependency

- [ ] เตรียม runbook/คำสั่งที่ review ได้ ระบุ account/environment/รุ่น schema-API-client และรายการข้อมูลที่ reset ไม่ใส่ credentials ลงเอกสาร
- [ ] ก่อน reset หยุด scheduling/writes ใหม่และให้ผลคำขอเดิมแน่นอน ไม่ถือว่าปิด client แล้ว server หยุดเขียน
- [ ] ตรวจ schema/index/generated client/contract ในฐานทดสอบแยกก่อนใช้กับชุดทดลองจริง
- [ ] Reset เฉพาะ entries/rules/budgets/tags/custom categories/preferences ของบัญชีที่เลือก คง auth/email/credentials/system categories และบัญชีอื่น
- [ ] Local scan/work memory/image bindings/query cache ของบัญชีเดียวกันเริ่มใหม่จริง และ errors แต่ละขั้นกู้/retry ได้โดยไม่ปนข้อมูลเก่า
- [ ] เข้า onboarding ใหม่แล้วจด/อ่านรูปเดิม/จัดหมวด/ดูยอด/จดซ้ำ/CSV ได้จริง ชุดใหม่ไม่ถูก memory เก่าห้ามอ่านหรือสร้างซ้ำในชุดเดียวกัน
- [ ] พิสูจน์ reset isolation/auth preservation ในฐานทดสอบ; การ cutover จริงระบุเป้าหมายและขอบเขตให้ review ก่อนดำเนินการ และรายงานสิ่งที่ยังไม่ทำ

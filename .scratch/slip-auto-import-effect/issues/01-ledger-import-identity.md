# 01: Ledger ตรวจอัตลักษณ์สลิปของผู้ใช้

**What to build:** ให้ Ledger ตอบได้ว่า `slip:<assetId>` ของผู้ใช้เคยสร้าง `FinanceTransaction` แล้วหรือยัง รวมรายการที่ลบแบบ soft-delete เพื่อให้การส่งภาพซ้ำและคำขอที่แข่งกันไม่สร้างรายการเพิ่ม นี่เป็นการเตรียมทางสร้างรายการเดิมก่อนเปิด API ใหม่

**Blocked by:** None (can start immediately).

**Status:** done

**Done in:** `4ed613e` Implement authenticated slip auto-import with Effect

- [ ] Ledger เปิดการตรวจ identity ของผู้ใช้โดยไม่กรอง soft-deleted rows และไม่เปิดการอ่านข้อมูลข้ามผู้ใช้
- [ ] ทางสร้าง `FinanceTransaction` เดิมยังเป็นเจ้าของการตรวจข้อมูล ผูก `userId` และใช้ unique `(userId, dedupeIdentity)` โดยไม่เปลี่ยนสัญญา Ledger ที่มีอยู่โดยไม่จำเป็น
- [ ] ทดสอบกับ MongoDB สำหรับทดสอบที่แยกจากข้อมูลจริง: key เดิมพบได้หลัง soft-delete, key เดียวกันของคนละผู้ใช้ไม่ชนกัน, และ unique constraint ป้องกันการสร้างซ้ำเมื่อคำขอแข่งกัน
- [ ] การเตรียม Ledger นี้ผ่าน type check ของ API และไม่เปลี่ยนพฤติกรรม import route เดิม

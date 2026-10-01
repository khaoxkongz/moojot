# 06: อ่านสลิปและดูหลักฐานจริง

**What to build:** รายการที่อ่านจากสลิปแสดงรูป วัน เวลาทำรายการ คู่โอน และข้อมูลธนาคาร/บัตรที่มีหลักฐานจริงใน editor โดยไม่เดาข้อมูลที่อ่านไม่ได้

**Blocked by:** 04 — [จดเองและแก้รายการ](04-manual-entry.md)

**Status:** draft — awaiting breakdown approval

**Source:** [Spec: ปรับแอปหมูจดตามดีไซน์ใหม่ — ตรวจรับ iOS ก่อน](../spec.md)

**User stories:** 43, 47, 59

**Why blocked:** ต้องแสดงและแก้รายการผ่าน editor ที่เสร็จแล้ว และขยายข้อมูล transaction โดยรักษาผู้เรียกเดิม

- [ ] ส่งรูปหนึ่งรูปผ่าน authenticated import และเก็บเฉพาะข้อมูลจริงที่ qualify เป็นรายการตาม contract; optional evidence ที่ไม่ทราบคง unknown
- [ ] Schema/prompt/provider/mapping/storage/output ส่งหลักฐานที่ UI ใช้ครบ รวม actual time เมื่ออ่านได้ และยังรับ missing optional fields ได้
- [ ] วันที่รูป ชื่ออัลบั้ม และ createdAt ไม่ถูกแทนเป็นเวลาทำรายการ/ธนาคาร/คู่โอนโดยไม่มีหลักฐาน
- [ ] Editor เปิด thumbnail/viewer กับรายละเอียดจริง; ภาพหายแสดงข้อจำกัด ไม่ใช้ชื่อ fallback เป็นหลักฐาน payer/merchant
- [ ] Asset identity ต่อผู้ใช้และ unique/conflict handling กันซ้ำอยู่ครบ รวม soft-deleted imported entry
- [ ] ตรวจ transport→route→provider fake→ledger→detail กับ fixture known/unknown evidence และ viewer บน iOS; caller เดิมยังทำงานกับการขยายแบบข้อมูลได้

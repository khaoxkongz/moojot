# 03: เริ่มใช้งานสี่ขั้น

**What to build:** ผู้ใช้ใหม่ตั้งค่าข้อตกลง สิทธิ์รูป เป้าหมาย และข้อมูลเพิ่มเติม แล้วดู recap ก่อนเข้า Home โดยใช้ค่าจริงร่วมกับโปรไฟล์

**Blocked by:** 02 — [สมัครและเข้าสู่ระบบ](02-auth-flow.md)

**Status:** draft — awaiting breakdown approval

**Source:** [Spec: ปรับแอปหมูจดตามดีไซน์ใหม่ — ตรวจรับ iOS ก่อน](../spec.md)

**User stories:** 20–27

**Why blocked:** ต้องอาศัย signup/session/guard ที่เสร็จในงานสมัครและเข้าสู่ระบบ

- [ ] Splash แตะข้ามหรือไปต่อเมื่อสองวินาที Greeting/progress/back และสี่ขั้นตรง handoff
- [ ] ข้อตกลงมีสรุป/ฉบับเต็ม ต้องยอมรับก่อนผ่าน; เป้าหมาย multi-select ต้องอย่างน้อยหนึ่งข้อ พร้อม error ที่เข้าใจได้
- [ ] ขอสิทธิ์ผ่าน OS และแสดง all/limited/denied/skipped ตามจริง ไป Settings แล้วกลับมาตรวจใหม่ และข้ามได้
- [ ] ค้นและนับ metadata รูปต่ออัลบั้มโดยยังไม่ส่ง GenAI จนเข้า Home; recap ไม่เรียกจำนวนรูปที่พบว่าจดสำเร็จแล้ว
- [ ] วันเกิด optional ผ่านคอลัมน์วัน/เดือน/ปี พ.ศ. ตรวจวันจริง consent สองข้อใช้ค่าร่วม profile
- [ ] บันทึก completion หลังข้อมูลที่จำเป็นสำเร็จเท่านั้น partial failure คงข้อมูลให้ลองต่อและไม่แสดงว่าพร้อมแล้ว
- [ ] ตรวจ sign-up→ready→Home, skip permission, กลับจาก Settings และ partial save/recovery บน iOS

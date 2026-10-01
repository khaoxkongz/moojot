# Spec: ปรับแอปหมูจดตามดีไซน์ใหม่ — ตรวจรับ iOS ก่อน

Status: ready-for-agent
Source: [วางทางปรับแอปหมูจดตามดีไซน์ใหม่](../native-redesign-wayfinding/map.md)

## Problem Statement

ผู้ใช้พอใจกับดีไซน์ใหม่จาก Claude Design ซึ่งแก้ตัวอักษรใหญ่และหนาเกินไป พร้อมทำคำอธิบายและการกดใช้งานให้เข้าใจง่ายขึ้น แต่แอปเดิมยังใช้หน้าตาและพฤติกรรมที่ต่างจากต้นแบบ การเปลี่ยนเฉพาะสีหรือจัดหน้าไม่พอ เพราะงานสลิปค้าง การเอากลับคืน การค้นหาทุกเดือน และกฎจดซ้ำต้องใช้ข้อมูลและสัญญาการทำงานที่ระบบเดิมยังรองรับไม่ครบ

แอปอยู่ในช่วงทดลอง ผู้ใช้เริ่มข้อมูลการเงินใหม่ได้ แต่ต้องรักษาบัญชีเข้าสู่ระบบเดิม ต้องการให้การจดรายการและอ่านสลิปที่ใช้อยู่มาก่อน แล้วทำส่วนอื่นจนครบดีไซน์ รอบนี้ตรวจและรับงานเฉพาะ iOS ส่วน Android ทำภายหลัง

## Solution

ปรับแอป Expo / React Native เดิมให้ตรง handoff ทั้งสี ฟอนต์ ขนาด ระยะ รูปประกอบ copy และ interactions ใน light/dark โดยใช้ฐาน component, navigation, queries/forms และ API เดิมที่ยังทำงานตามข้อกำหนดได้ เพิ่มหรือปรับข้อมูลและสัญญาเฉพาะช่องว่างที่ตรวจพบ ทุก flow ต้องทำงานกับข้อมูลที่อ่านและบันทึกจริง มีสถานะรอ ผิดพลาด และกลับมาทำสำเร็จได้

ข้อตกลงใน spec นี้มีลำดับความสำคัญเหนือข้อมูลจำลองและพฤติกรรมเก่าที่ขัดกัน: รวมรายการตามธนาคาร, บัตรแยกชื่อและเลขท้ายสี่หลัก, จดเองเลือกวันที่อย่างเดียว, เวลาไม่ทราบเว้นว่างใน CSV, ลบหมวด/แท็กแล้วลบงบที่ผูกและเอากลับคืนได้ครบ, คงงานต้องช่วยหมูข้ามรอบ, และเปิดจดซ้ำกลับมาแล้วข้ามช่วงที่กดหยุด

ส่งงานเป็นสี่ช่วงที่มีสิ่งให้ลองบน iPhone ได้:

| ช่วง                    | ผลที่ต้องได้                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| เตรียมฐานร่วม           | Typography/theme/components/navigation และสัญญาข้อมูลสำคัญพร้อม พร้อม fixture และทางรัน iOS |
| ทำการใช้งานหลัก         | Auth/onboarding → Home → จด/แก้/เลือกหมวด → อ่านสลิป/ช่วยจดงานค้าง ทำงานครบกับ API          |
| ทำสรุปและการวางแผน      | Summary, Search ทุกเดือน, งบ, จดซ้ำ, หมวด/แท็ก และปฏิทิน ใช้ข้อมูลสอดคล้องกัน               |
| เก็บส่วนเสริมและตรวจครบ | Profile, แครอต/tutorial/help, บัตรเครดิต, CSV และ flow ทั้งชุดผ่านการตรวจ iOS               |

## User Stories

### หน้าตาและการใช้งานร่วม

1. As a user, I want ข้อความไทยใช้ LINE Seed Sans TH Regular, so that ตัวอักษรอ่านง่ายและไม่หนาเกินไป
2. As a user, I want ยอดเงินใช้ตัวเลขระบบที่จัดแนวได้, so that เปรียบเทียบจำนวนเงินได้ง่าย
3. As a user, I want สี ระยะ รูปประกอบ และข้อความตรงดีไซน์ที่เลือก, so that แอปจริงให้ประสบการณ์ที่คาดไว้
4. As a user, I want เลือกธีมสว่างหรือมืดแล้วทุกหน้าใช้ธีมเดียวกัน, so that อ่านแอปได้สบายตา
5. As a user, I want ปุ่มและแถวกดง่ายบน iPhone, so that ไม่ต้องแตะซ้ำหรือเล็งจุดเล็ก
6. As a user, I want ปุ่มหลักอธิบายสิ่งที่ต้องแก้เมื่อข้อมูลยังไม่ครบ, so that รู้ว่าจะทำต่ออย่างไร
7. As a user, I want ข้อความสถานะมีคำและไอคอน, so that เข้าใจได้โดยไม่ต้องตีความจากสีอย่างเดียว
8. As a user, I want เห็นสถานะกำลังโหลด ผิดพลาด ว่าง และมีข้อมูลอย่างถูกต้อง, so that ไม่เข้าใจผิดว่ารายการหาย
9. As a user, I want ข้อมูลที่กรอกยังอยู่เมื่อบันทึกไม่สำเร็จ, so that ลองอีกครั้งได้โดยไม่กรอกใหม่
10. As a user, I want ปุ่มสำคัญยังเข้าถึงได้เมื่อเปิดคีย์บอร์ดหรือเพิ่มขนาดตัวอักษร, so that ทำงานหลักได้ครบ

### บัญชีและเริ่มใช้งาน

11. As a new user, I want เห็นหน้าสมัครสมาชิกหลัง splash, so that เริ่มสร้างบัญชีได้ตรงทาง
12. As a returning user, I want เข้าสู่ระบบด้วยอีเมลและรหัสผ่านเดิม, so that กลับมาใช้แอปได้
13. As a user, I want สลับเข้าสู่ระบบและสมัครโดยคงข้อมูลที่เกี่ยวข้อง, so that ไม่ต้องพิมพ์อีเมลซ้ำ
14. As a user, I want ดูหรือซ่อนรหัสผ่านและเห็นกฎอย่างน้อยแปดตัวอักษร, so that ตรวจสิ่งที่พิมพ์ได้
15. As a user, I want ข้อผิดพลาดแสดงตรง field และหายเมื่อแก้ field นั้น, so that แก้ข้อมูลได้ถูกจุด
16. As a user, I want ข้อผิดพลาดบัญชีแยกอีเมลที่ยังไม่สมัคร รหัสผ่านผิด และอีเมลที่สมัครแล้วตามข้อมูลจริง, so that เลือกเข้าสู่ระบบหรือสมัครต่อได้ถูกต้อง
17. As a user, I want กด Enter ไป field ถัดไปและส่งแบบฟอร์มจาก field สุดท้ายได้, so that กรอกข้อมูลต่อเนื่องได้
18. As a new user, I want สมัครสำเร็จแล้วเข้าสู่ greeting และขั้นตอนตั้งค่า, so that ไม่ติดข้อความให้คาดเดาว่าต้องทำอะไรต่อ
19. As a returning user, I want เข้าหน้า Home เมื่อเริ่มใช้งานครบแล้ว และกลับไปตั้งค่าเมื่อยังไม่ครบ, so that ใช้งานต่อจากสถานะที่ถูกต้อง
20. As a new user, I want ตั้งค่าเพียงสี่ขั้นพร้อมความคืบหน้าและย้อนกลับได้, so that เข้าใจว่าเหลืออะไรต้องทำ
21. As a new user, I want อ่านสรุปข้อตกลงและเปิดฉบับเต็มก่อนยอมรับ, so that รู้เงื่อนไขก่อนเริ่มใช้
22. As a new user, I want เข้าใจการอ่านสลิปก่อนขอสิทธิ์รูปและเลือกข้ามได้, so that ตัดสินใจการเข้าถึงรูปได้
23. As a user, I want เห็นผลสิทธิ์ all/limited/denied และกลับจาก Settings แล้วตรวจใหม่, so that รู้วิธีเปิดการอ่านสลิป
24. As a new user, I want เห็นจำนวนรูปต่ออัลบั้มโดยยังไม่อ่าน AI จนเข้า Home, so that เข้าใจขั้นค้นรูปแยกจากขั้นจดให้
25. As a new user, I want เลือกเป้าหมายได้หลายข้อและเห็นคำแนะนำเมื่อยังไม่เลือก, so that ตั้งค่าได้โดยแตะตัวเลือก
26. As a new user, I want ใส่วันเกิดเป็นตัวเลือกและตั้ง consent สองข้อ, so that เลือกข้อมูลเพิ่มเติมเท่าที่ต้องการ
27. As a new user, I want เห็น recap เป้าหมายและสิทธิ์รูปก่อนเริ่มใช้, so that รู้ว่าแอปพร้อมทำอะไรให้

### หน้าแรกและจดรายการ

28. As a user, I want Home แสดงยอดใช้จ่ายกับรายการแบ่งรายวัน, so that เห็นการใช้เงินในช่วงที่เลือก
29. As a user, I want เลื่อนดูรอบเดือน สัปดาห์ หรือสองสัปดาห์ตามปฏิทินที่ตั้ง, so that ดูข้อมูลตามรอบที่ใช้จริง
30. As a user, I want ดูสรุปจากช่วงที่กำลังดู, so that ตรวจรายละเอียดได้ต่อเนื่อง
31. As a user, I want กรองตามธนาคาร บัตร หรือไม่ระบุแล้วล้างได้, so that เห็นรายการเฉพาะกลุ่มที่ต้องการ
32. As a user, I want รายการของธนาคารเดียวกันรวมอยู่กลุ่มเดียว, so that ใช้งานได้โดยไม่ต้องตั้งบัญชีธนาคารรายบัญชี
33. As a user, I want รายการจดเองที่เลือกธนาคารอยู่ในกลุ่มธนาคารนั้น, so that ตัวกรองไม่จัดรายการผิดกลุ่ม
34. As a user, I want เห็นจำนวนรายการรอเลือกหมวดและเลือกต่อกันเป็นคิว, so that จัดรายการได้โดยไม่เปิดทีละหลายหน้า
35. As a user, I want ข้ามหรือแก้รายการระหว่างเลือกหมวดได้, so that จัดการรายการที่ยังตัดสินใจไม่ได้
36. As a user, I want กดจดเพิ่มแล้วเข้าหน้าจดทันที, so that เริ่มจดได้เร็ว
37. As a user, I want เลือกรายจ่าย รายรับ หรือย้ายเงินด้วยคำไทย, so that เข้าใจชนิดรายการ
38. As a user, I want ใช้ keypad คำนวณและวางจำนวนเงินได้, so that รวมยอดก่อนจดได้
39. As a user, I want เลือกหมวดต่อหลังใส่ยอดของรายการใหม่, so that จดตามลำดับที่เข้าใจง่าย
40. As a user, I want เลือกวันที่จากปฏิทินและจดย้อนหลังได้โดยไม่ต้องกรอกเวลา, so that จดรายการที่จำเพียงวันได้
41. As a user, I want กรอกชื่อ โน้ต หมวด และแท็ก พร้อมรู้ชื่อที่ใช้เมื่อเว้นชื่อไว้, so that จำรายการบน Home ได้
42. As a user, I want เลือกธนาคาร บัตร หรือไม่ระบุในรายการจดเอง, so that กรองและดูยอดจากแหล่งที่ใช้ได้
43. As a user, I want ดูรูปสลิปและรายละเอียดที่อ่านได้ของรายการจากสลิป, so that ตรวจหลักฐานก่อนแก้รายการ
44. As a user, I want ได้รับคำถามบันทึกหรือทิ้งเมื่อปิด draft ที่เปลี่ยนแล้ว, so that ไม่เสียสิ่งที่กรอกโดยไม่ตั้งใจ
45. As a user, I want ลบรายการแล้วกดเอากลับคืนได้, so that แก้การลบผิดได้ทันที
46. As a user, I want ย้ายเงินไม่ถูกนับเป็นรายรับหรือรายจ่าย, so that ยอดสรุปไม่เพิ่มจากการย้ายเงิน

### การอ่านสลิปและงานค้าง

47. As a user, I want อ่านรูปใหม่จากอัลบั้มที่รองรับเมื่อแอปพร้อมทำงาน, so that หมูจดรายการให้โดยไม่เลือกรูปเองทีละรูป
48. As a user, I want ไปหน้าอื่นในแอปได้ขณะอ่านสลิป, so that จดหรือดูข้อมูลต่อได้
49. As a user, I want แอปพักการส่งรูปใหม่เมื่อสลับแอปหรือล็อกเครื่องและทำต่อเมื่อกลับมา, so that งานอ่านมีพฤติกรรมที่คาดได้
50. As a user, I want เห็นผลสามกลุ่มต้องช่วยหมู จดให้แล้ว และข้ามไป, so that รู้ว่ารูปใดต้องทำอะไรต่อ
51. As a user, I want งานต้องช่วยหมูยังอยู่เมื่อมีรอบอ่านใหม่หรือกลับมาเปิดแอป, so that ไม่ลืมงานที่ยังไม่จด
52. As a user, I want สลิปที่ข้อมูลไม่ครบคงรอจดเองโดยไม่ส่ง GenAI ซ้ำอัตโนมัติสำหรับรูปเดิมที่จำผลไว้, so that งานค้างไม่ถูกอ่านวนโดยไม่มีข้อมูลใหม่
53. As a user, I want ข้อผิดพลาดชั่วคราวลองใหม่ได้ตามเวลาที่เหมาะสม, so that จดสลิปได้เมื่อบริการกลับมาพร้อม
54. As a user, I want จดเองจากสลิปค้างแล้วมีวันที่รูปเติมให้, so that กรอกข้อมูลที่ขาดได้สะดวก
55. As a user, I want สลิปที่ช่วยจดสำเร็จเชื่อมกับรายการและแสดงว่าจัดการแล้ว, so that ไม่กลับมาเป็นงานค้าง
56. As a user, I want รูปเดียวกันไม่สร้างรายการซ้ำแม้ลองอ่านหรือจดเองพร้อมกัน, so that ยอดการเงินไม่ซ้ำ
57. As a user, I want รูปซ้ำหรือไม่ใช่สลิปแสดงว่าข้ามได้โดยไม่ต้องทำอะไร, so that ไม่ถูกขอให้ช่วยจดรูปที่ไม่จำเป็น
58. As a user, I want รู้ข้อจำกัดเมื่อรูปหายหรือสิทธิ์เข้าถึงเปลี่ยน, so that ไม่เข้าใจว่าจัดการงานสำเร็จแล้วทั้งที่ยังไม่ได้จด
59. As a user, I want ผลอ่านและรูปที่ผูกกับรายการแยกตามบัญชีเข้าสู่ระบบ, so that การสลับบัญชีไม่ปนข้อมูล

### สรุปและค้นหา

60. As a user, I want เห็นได้รับ ใช้ไป และเหลือหรือใช้เกินรายรับใน Summary, so that เข้าใจผลรวมของเดือน
61. As a user, I want ดูสัดส่วนตามหมวดหรือแท็กเป็นแท่งแนวนอน, so that เปรียบเทียบกลุ่มได้ง่าย
62. As a user, I want เปิดคิวของรายการรอเลือกหมวดจากสรุปในช่วงและตัวกรองที่ดู, so that จัดหมวดตรงกลุ่มที่เห็น
63. As a user, I want เห็นแนวโน้มหกเดือนและเทียบกับเดือนก่อน, so that รู้การเปลี่ยนแปลงของรายรับหรือรายจ่าย
64. As a user, I want ค้นหารายการทุกเดือนพร้อมกัน, so that ไม่ต้องเดาว่ารายการอยู่เดือนไหน
65. As a user, I want ค้นหาด้วยชื่อ โน้ต หมวด บัญชี หรือจำนวนเงิน, so that หารายการจากสิ่งที่จำได้
66. As a user, I want เห็นจำนวนผล ยอดรายจ่ายรวม และคำที่ตรงเน้นไว้, so that ตรวจผลค้นหาได้เร็ว
67. As a user, I want ใช้และลบคำค้นหาล่าสุดหรือแตะคำค้นหาตัวอย่างได้, so that เริ่มค้นหาได้สะดวก
68. As a user, I want ผลค้นหาที่รอหมวดเปิดเลือกหมวดและผลอื่นเปิดแก้ได้, so that ทำงานต่อจากผลค้นหา
69. As a user, I want จำนวนผลและยอดรวมครบแม้มีข้อมูลมากกว่าหนึ่งหน้า, so that ไม่เข้าใจว่าผลบางส่วนเป็นทั้งหมด

### งบและกฎจดซ้ำ

70. As a user, I want ตั้งงบรวมทุกหมวดหรือเฉพาะหมวด/แท็ก, so that วางแผนรายจ่ายในระดับที่ต้องการ
71. As a user, I want เห็นใช้ไป เหลือหรือเกิน พร้อมสถานะเป็นคำ, so that รู้ว่ายังใช้ได้เท่าไร
72. As a user, I want เลือกระดับเตือน 50/70/80/90% และเห็นเป็นจำนวนบาท, so that เข้าใจว่าแอปจะบอกใกล้ครบงบเมื่อใด
73. As a user, I want รู้ว่าการบันทึกงบเป้าหมายเดิมจะแทนวงเงินเก่า, so that ไม่เผลอคิดว่าเพิ่มงบซ้ำ
74. As a user, I want ลบงบแล้วเอากลับคืนได้โดยรายการใช้จ่ายยังอยู่, so that เปลี่ยนแผนได้โดยไม่ลบประวัติ
75. As a user, I want ตั้งกฎจดซ้ำด้วยวัน 1–31 และเดือนสิ้นสุดหรือจดไปเรื่อย ๆ, so that ตั้งรายการประจำได้โดยแตะตัวเลือก
76. As a user, I want เดือนที่ไม่มีวันที่กำหนดใช้วันสุดท้ายของเดือน, so that กฎทำงานได้ทุกเดือน
77. As a user, I want เห็นวันจดครั้งแรกและครั้งถัดไปก่อนบันทึก, so that รู้ว่าแอปจะจดให้เมื่อไร
78. As a user, I want กฎใหม่จดวันที่ถึงกำหนดถึงวันนี้และบอกจำนวนที่จดให้, so that รู้ผลทันทีหลังตั้งกฎ
79. As a user, I want สร้างหรือเปิดกฎจากรายการเดิมโดยรักษาความเชื่อมโยงและไม่จดรายการเดิมซ้ำ, so that จัดการรายการประจำจาก editor ได้
80. As a user, I want กฎจดซ้ำรักษาธนาคาร บัตร หมวด แท็ก และโน้ตที่เลือก, so that รายการที่สร้างตรงกับที่ตั้งไว้
81. As a user, I want การแก้กฎมีผลกับครั้งถัดไป, so that ประวัติที่เกิดขึ้นแล้วไม่เปลี่ยนหรือมีรายการย้อนหลังใหม่โดยไม่ตั้งใจ
82. As a user, I want กดหยุดกฎแล้วเปิดกลับมาโดยไม่จดย้อนช่วงที่หยุด, so that การหยุดมีผลตามที่ตั้งใจ
83. As a user, I want กฎที่ยังเปิดอยู่จดวันที่ถึงกำหนดเมื่อกลับมาใช้แอปแม้ไม่ได้เข้าแอปหลายเดือน, so that การไม่เปิดแอปไม่กลายเป็นการหยุดกฎ
84. As a user, I want ลบกฎโดยคงรายการที่เคยจดไว้และเอากฎกลับคืนได้, so that เลิกจดซ้ำได้โดยไม่เสียประวัติ

### หมวด แท็ก และปฏิทิน

85. As a user, I want จัดการหมวดและแท็กจากหน้าที่มี tabs และจำนวนครั้งที่ใช้, so that รู้ว่าตัวเลือกใดมีรายการอ้างอยู่
86. As a user, I want สร้างหมวดพร้อม emoji และเพิ่มแท็กจากคำแนะนำได้, so that จัดกลุ่มรายการได้เร็ว
87. As a user, I want ระบบป้องกันชื่อซ้ำ แท็กเกิน 20 ตัวอักษร และการแก้หรือลบหมวดพื้นฐาน, so that ตัวเลือกไม่สับสน
88. As a user, I want ลบหมวดที่สร้างเองแล้วรายการเดิมรอเลือกหมวดใหม่และงบของหมวดนั้นถูกลบด้วย, so that ไม่มีงบที่อ้างหมวดที่หายไป
89. As a user, I want เอาหมวดกลับคืนพร้อมงบและการจัดหมวดรายการเดิม, so that กู้การลบผิดได้ครบ
90. As a user, I want ลบแท็กแล้วเอากลับคืนพร้อมความสัมพันธ์ที่ได้รับผล, so that การกู้ไม่ทำให้แท็กหรือข้อมูลอื่นของรายการหาย
91. As a user, I want ตั้งค่าปฏิทินด้วย radio cards/chips/day grid และใช้ได้ทันที, so that ไม่ต้องกดบันทึกหรือยืนยันซ้ำ
92. As a user, I want เลือกวันเริ่มสัปดาห์และ anchor รอบสองสัปดาห์พร้อมเห็นช่วงจริง, so that เข้าใจรอบที่เลือก
93. As a user, I want วันเริ่มเดือนมีผลกับ Home รายเดือน Summary และงบตรงกัน, so that ยอดทุกหน้าสอดคล้องกัน
94. As a user, I want คืนค่าปฏิทินเริ่มต้นแล้วเอาค่าก่อนหน้ากลับคืนได้, so that ทดลองการตั้งค่าได้

### โปรไฟล์ แครอต บัตร และส่งออก

95. As a user, I want หน้า “พี่มนุษย์” แสดงเครื่องมือก่อนพร้อมสถานะล่าสุดจริง, so that รู้ว่าจะไปทำอะไรต่อ
96. As a user, I want ดูอีเมลและเปลี่ยน consent ที่ใช้ร่วม onboarding, so that ข้อมูลบัญชีและการตั้งค่าตรงกัน
97. As a user, I want เปิดคำแนะนำ FAQ ข้อตกลง และความสามารถอ่านสลิปเป็น sheets, so that เข้าใจการทำงานโดยไม่ออกจาก flow
98. As a user, I want ออกจากระบบหลังยืนยันแล้วกลับหน้าเข้าสู่ระบบพร้อมอีเมลล่าสุด, so that กลับเข้าบัญชีเดิมได้สะดวก
99. As a user, I want ดูสตรีค วันนี้ เจ็ดวันล่าสุด และแครอตสะสม, so that รู้ความต่อเนื่องในการจด
100.  As a user, I want ให้อาหารหมูได้ตามเกณฑ์วันละหนึ่งครั้ง, so that แครอตไม่ถูกเพิ่มซ้ำ
101.  As a user, I want เลือกนับจากการจด การจดพร้อมเลือกหมวด หรือปิดการนับ, so that ใช้แครอตตามที่เหมาะกับตนโดยรายการยังอยู่
102.  As a user, I want เปิดบทสอนรับแครอตสี่หน้าพร้อมย้อนกลับและถัดไป, so that เข้าใจวิธีใช้
103.  As a user without credit cards, I want ใช้แอปได้โดยไม่ต้องเพิ่มบัตร, so that ฟีเจอร์เสริมไม่ขวางการจดทั่วไป
104.  As a card user, I want เพิ่มบัตรด้วยชื่อและเลขท้ายสี่หลักครั้งแรกแล้วเลือกใช้ต่อได้, so that จดบัตรจริงของตนได้
105.  As a card user, I want เห็นยอดเดือนนี้ จำนวนรายการ และสามรายการล่าสุดของบัตรแต่ละใบ, so that ตรวจการใช้บัตรได้
106.  As a card user, I want ดูทั้งหมดและจดเพิ่มโดยคงบัตรใบที่เลือก, so that รายการของบัตรชื่อเดียวกันไม่ปนกัน
107.  As a user, I want ส่งออก CSV ภาษาไทยที่เปิดใน Excel/Sheets ได้, so that นำข้อมูลไปใช้ต่อได้
108.  As a user, I want CSV แสดงเวลาทำรายการจริงเมื่อทราบและว่างเมื่อทราบเพียงวันที่, so that ไฟล์ไม่ใส่ข้อมูลเวลาที่เดา
109.  As a tester, I want เริ่มข้อมูลการเงินทดลองใหม่โดยเก็บบัญชีและอีเมลเดิม, so that ทดลองแอปโฉมใหม่ได้โดยไม่สมัครใหม่
110.  As a tester, I want ตรวจหน้าจอและงานหลักบน iPhone จริงกับเครื่องจำลอง iOS ก่อน, so that รอบนี้มีหลักฐานการใช้ที่ตรงอุปกรณ์ที่มี

## Implementation Decisions

### ขอบเขต ลำดับ และฐานเดิม

- ครอบคลุมทุกหน้าจอและ flow ใน handoff รวม light/dark และ states ที่ภาพหน้าจอไม่ได้ถ่ายไว้ ใช้ HTML/README ตรวจรายละเอียดและภาพ 29 ภาพเป็นรายการอ้างอิง
- คง Expo / React Native, Expo Router, TanStack Query/Form, theme และ typography wrappers เดิมเป็นฐาน ใช้โค้ดร่วมต่อไป เป้าหมายสองแพลตฟอร์มยังอยู่ แต่ตรวจ runtime/UI และรับงานบน iOS เท่านั้นในรอบนี้
- ทำตามสี่ช่วงใน Solution ภายในช่วงทำ UI ที่ไม่ติด schema ได้ก่อน แต่ flow ที่ใช้สัญญาใหม่ต้องเชื่อม owner ของสัญญานั้นให้พร้อมก่อนรับงาน
- Ledger, Analytics, Planning, Preferences และ Auth ที่รองรับข้อกำหนดแล้วใช้ต่อ เพิ่มความสามารถใน operation เดิมเมื่อเหมาะสม เช่น all-month search ไม่มีเหตุให้สร้าง endpoint ใหม่เพียงเพราะตัดขอบเขตเดือนออก
- เปลี่ยนพฤติกรรมเดิมที่ขัด handoff หรือคำตอบของ map อย่างชัดเจน โดยเฉพาะ scanner ที่ผูกกับ Home focus และข้อกำหนดเดิมที่ไม่ให้มีหน้าผลอ่านสลิป

### Visual fidelity และ shared controls

- UI ใช้ LINE Seed Sans TH Regular 400 ทุกข้อความ ยอดเงินใช้ font ระบบ iOS น้ำหนัก 500 และ tabular numerals เครื่องหมาย ฿ อยู่หลังยอดด้วยน้ำหนักปกติ Hierarchy ใช้ขนาด สี และระยะ ไม่ใช้ bold
- Scale หลัก: header 17, body/row title 15, input 16, secondary 12–13, tab label 12, Home hero amount 36, card amount 32, entry amount 40 ลดเป็น 32 เมื่อเกิน 10 ตัวและ 26 เมื่อเกิน 14 ตัว ตามต้นแบบ คง font scaling และตรวจการเข้าถึง actions เมื่อขยายข้อความ
- ใช้ palette ต่อไปนี้เป็น source of truth ของแอปทั้งสองธีม ไม่แทนสีแบรนด์ด้วยค่า system theme ที่ทำให้หน้าตาต่างจาก handoff

| Token               | Light              | Dark              |
| ------------------- | ------------------ | ----------------- |
| background          | #F9F9F7            | #2D2D2B           |
| surface             | #FFFFFF            | #383835           |
| raised              | #F0EFEC            | #454541           |
| text                | #2D2D2B            | #F9F9F7           |
| muted               | #5E5D59            | #C9C8C3           |
| border              | #D7D5CE            | #565650           |
| accent              | #CC7D5E            | #CC7D5E           |
| accentText          | #8D472D            | #E1A68E           |
| onAccent            | #1E1B19            | #1E1B19           |
| success             | #006F30            | #20D269           |
| danger              | #AD3414            | #FF9984           |
| inverse / onInverse | #2D2D2B / #F9F9F7  | #F9F9F7 / #2D2D2B |
| inverseAccent       | #E1A68E            | #8D472D           |
| shade               | rgba(30,27,25,.42) | rgba(0,0,0,.55)   |

- Side padding 16, card padding 14–18, section gaps 18–26, chip gap 8; hero radius 20, grouped/card radius 16, sheet top radius 24, tab bar top radius 17 ใช้ค่ารายละเอียดที่เหลือตาม handoff
- Cards ไม่มี drop shadow ใช้ raised inset ring; selected tiles ใช้ accent ring ใช้ shadows เฉพาะ floating action, toast, menu/dialog และ selected segment ตามต้นแบบ
- Touchable targets อย่างน้อย 44×44, primary button สูง 52, rows 52–64 รักษาขนาด visual chips/day cells ตามต้นแบบและจัด effective touch area ให้กดง่ายโดยไม่ทับกัน ใช้ safe-area insets จริง ไม่ copy frame/top/bottom constants ของ mock phone
- ใช้ shared header, segmented control, grouped list, chips, radio cards/day grid, sheet, info box และ toast ให้ consistent ใช้ mascot/assets/emoji/MDI icon ตาม handoff ไม่ copy prototype runtime และ device frame เข้าแอป
- CTA ที่ข้อมูลไม่ครบยังกดแล้วแสดง error ตรง field ได้ ระหว่าง pending แสดง busy copy และป้องกัน submit ซ้ำ ไม่ทิ้ง draft หรือ dismiss ก่อน save สำเร็จ ข้อยกเว้น disabled ที่ต้นแบบกำหนด เช่น next period/future dates/filter ว่าง ให้รักษาพฤติกรรมและคำอธิบาย
- Push/modal 0.34s, sheet 0.32s, dim 0.25s, centered dialog 0.2s, search 0.3s และ easing ตาม handoff Toast ปกติ 2.6s และมี action 5s คงการ dismiss/back และ interruptions ที่ไม่ทำให้ state หาย ไม่ใช้ timers จำลอง network เป็นเวลาตอบจริง

### Auth, onboarding และ navigation

- Auth เป็น modes เข้าสู่ระบบ/สมัครบน flow ที่แชร์ draft ใช้ validation ชื่ออย่างน้อยสองตัว อีเมลถูกต้อง รหัสผ่านอย่างน้อยแปดตัว พร้อม labels/show-hide/errors/keyboard ตาม handoff First launch เปิดสมัคร; logout เปิด signin พร้อมอีเมลล่าสุด ไม่คงรหัสผ่านข้าม logout
- Unknown email, wrong password และ duplicate signup ต้องใช้ข้อเท็จจริงจากสัญญา auth เพื่อแสดงข้อความและ action ตาม handoff ห้ามเดากรณีจาก error code เดียว ตรวจ library ที่ติดตั้งก่อนปรับ contract; หากพบข้อจำกัดที่เปลี่ยนผลที่ผู้ใช้ได้รับ ให้รายงานก่อนเปลี่ยน UI
- Signup สำเร็จเข้า greeting; signin ของบัญชีที่ครบ onboarding เข้า Home พร้อมชื่อ บัญชีที่ยังไม่ครบใช้ guard พาไปทำต่อ
- Onboarding เป็นข้อตกลง → สิทธิ์รูป/ค้นอัลบั้ม → เป้าหมาย → ข้อมูลเพิ่มเติม optional มี recap/ready ใช้ค่าจริงร่วม profile และ flag completion หลังบันทึกที่จำเป็นสำเร็จ จัดการ partial save โดยไม่อ้างว่าตั้งค่าครบแล้ว
- Splash ไปต่อเมื่อครบสองวินาทีหรือแตะ วันเกิดเปิด sheet คอลัมน์วัน/เดือน/ปี พ.ศ.ตาม handoff วันที่ไม่ถูกต้องมี error เป้าหมายต้องเลือกอย่างน้อยหนึ่งข้อ ยอมรับข้อตกลงก่อนผ่านขั้นแรก และ consent สองข้อไม่ทำให้ผู้ใช้จำเป็นต้องกรอกวันเกิด
- Request permissions ผ่าน OS จริง แยก counting รูปจากการอ่าน AI; unknown/limited/denied/skipped แสดงตามจริง ข้ามได้และเปิดภายหลังได้ กลับจาก Settings ตรวจสิทธิ์ใหม่ เมื่อพร้อมเข้า Home จึงเริ่มอ่าน
- ใช้ tab หน้าแรก/พี่มนุษย์, จดเพิ่มเปิด editor โดยตรง, summary/search/plan/settings เป็น pushed screens, editor/budget/recurring เป็น modal, pickers/queues/help ตาม sheets/dialogs ที่ต้นแบบกำหนด Preserve draft เมื่อจัดการหมวดซ้อนเหนือ editor

### Domain และสัญญาข้อมูล

- จำนวนเงินเก็บเป็น satang จำนวนเต็ม วันรายการเป็น ISO calendar day ที่ไม่เลื่อนตาม timezone เวลาทำรายการเป็น optional จากหลักฐานที่เชื่อถือได้ เวลาบันทึกเป็นคนละข้อมูล ใช้แสดงจดล่าสุดและลำดับที่เกี่ยวข้อง ไม่เติมเวลาทำรายการจาก createdAt หรือเวลาจำลอง
- ธนาคารของรายการเป็นกลุ่มธนาคาร ไม่แยกหลายบัญชีของธนาคารเดียวกัน บัตรของรายการแยกชื่อกับเลขท้ายสี่หลัก Normalize identity/display names ให้ selection/filter/search ตรงกัน ไม่ระบุคือไม่มีธนาคารหรือบัตรที่เลือก ไม่ใช่ manual source ทั้งหมด
- รายจ่าย/รายรับที่ไม่มีหมวดเป็นรายการรอเลือกหมวด ย้ายเงินไม่เป็น pending category และไม่รวมรายรับรายจ่าย มีต้นทางหนึ่งค่าโดยยังไม่เพิ่มระบบบัญชีปลายทาง/ยอดคงเหลือ
- Entry create/update ต้องรักษา fields ที่ผู้ใช้เลือก มี fallback title ตามต้นแบบ การเปลี่ยนชนิดล้างหมวดที่ไม่เข้ากัน จดเองเลือกวันที่อย่างเดียวและห้ามเลือกอนาคตตาม UI
- Keypad รองรับ AC, %, การคำนวณพื้นฐาน, decimal, delete และ paste จำกัดสองตำแหน่งทศนิยม/12 digits ตามต้นแบบ พร้อม hardware keys และ errors; หลังยืนยันยอดใหม่เปิดเลือกหมวดอัตโนมัติ ไม่เพิ่มช่องเวลาให้ผู้ใช้กรอก
- หลักฐานสลิปต้องมี schema/extraction/mapping ที่ส่งวัน เวลา คู่โอน และแหล่งที่ใช้ใน UI ตามข้อเท็จจริง Unknown ต้องยังเป็น unknown ชื่ออัลบั้มหรือเวลารูปไม่ใช่หลักฐานของทุก field Thumbnail ใช้การผูกภาพในมือถือที่มีอยู่ และมี fallback เมื่อเปิดรูปไม่ได้
- อ่านรายการครบทุกหน้าหรือมีสัญญา aggregate ที่ให้ผลครบ Counts/totals/usage และ card summaries ห้ามใช้แถวแรก 1,000 เป็นข้อมูลทั้งหมด

### Home, Summary และ Search

- Home ใช้ช่วงปฏิทินที่ตั้งไว้ แสดงยอดรายจ่าย/วันและแหล่งรายการตาม copy, badges/empty states/permission link/reading state กับจดล่าสุดจากเวลาบันทึกจริง เลื่อนข้ามรอบปัจจุบันไปอนาคตไม่ได้
- Filter selection แชร์กับ Summary รายการธนาคาร/บัตร/ไม่ระบุมีความหมายเดียวกันทุก operation คิวหมวดเปิดตาม scope ของ action และ refresh หลังจัดการสำเร็จ
- Summary นับเป็นรายเดือนเสมอแม้ Home เป็น week/fortnight ใช้เดือนสัมพันธ์กับช่วงที่เลือก custom month start มีผลกับขอบเขตและ labels แสดง income/expense/net, bars ตามหมวด/แท็ก, pending queue, transfer แยก และ trend หกเดือน
- Tag share ใช้ยอดของชนิดรายการที่เลือกเป็นฐาน รายการหลายแท็กอาจปรากฏหลายกลุ่ม จึงไม่บังคับรวม shares เป็น 100% งบใช้ขอบเขตของงบ ไม่แอบทำเป็น budget ของ wallet filter
- Search ไม่มีข้อจำกัดสองเดือน ค้นชื่อ โน้ต หมวด ธนาคาร/บัตร และจำนวนเงินตามพฤติกรรมข้อความในต้นแบบ รวม comma/decimal อย่างสอดคล้องกัน ไม่เปลี่ยนเป็น exact amount equality โดยปริยาย Highlight fields ที่ตรงและคงการเปิด pending→queue/other→editor
- Recent searches เพิ่ม/ลบจริง และ prefilled query จากบัตรต้องรักษา identity ของใบที่เลือก แม้บัตรชื่อเดียวกันมีหลายใบ

### การลบและเอากลับคืน

- ลบ entry/budget/rule/custom category/tag ทันทีพร้อม action “เอากลับคืน” ใน toast ล่าสุด 5 วินาที Toast ใหม่แทน action เดิม เมื่อ action หายให้คงการกระทำที่เสร็จแล้ว ไม่ทำเป็น undo ทั้งสมุดข้อมูล
- Server เป็นเจ้าของ delete/restore ของข้อมูล server ต้องมีข้อมูลผลของ operation เพื่อคืน ID/fields/relationships เดิมได้ ไม่สร้าง clone ด้วยชื่อเดียวกันแทน identity
- ลบหมวดแล้วถอด category ของรายการและกฎที่ได้รับผล พร้อมลบงบที่ผูก รายการใช้จ่ายยังอยู่และกลับไปรอเลือกหมวด คืนแล้วต้องคืนหมวด งบ และ links ครบ ใช้หลักเดียวกันกับ tag links และงบที่ผูกแท็ก
- ลบกฎคงรายการที่เคยสร้างไว้ คืนกฎและความสัมพันธ์ที่เปลี่ยนจากการลบให้ editor/generation เชื่อมได้ถูกต้อง
- คืนข้อมูลภายใต้ ownership/transaction ที่ไม่ทับการแก้ fields หรือ links อื่น ถ้ามี conflict หรือคืนไม่ได้ครบ ให้คืน error ที่ UI อธิบายและลองแก้ได้ ไม่รายงานสำเร็จทั้งที่กู้บางส่วน Validate repeated requests และไม่ปล่อย delete/save ที่ pending ทำให้ผู้ใช้เห็นผลสำเร็จเทียม
- Calendar reset คืนค่าก่อนหน้าเฉพาะ preferences ที่เกี่ยวข้อง โดยใช้ operations การตั้งค่าเดิมได้

### งานสลิปและรอบอ่าน

- ใช้ฐานอ่าน/บันทึก/กันซ้ำ/retry เดิม Owner ของรอบอ่านอยู่ระดับ signed-in app การเปลี่ยน route ไม่หยุดส่งใหม่ถ้า app active และสิทธิ์ครบ; พักแอป/ล็อกเครื่องหยุด scheduling รูปใหม่ คำขอที่ส่งแล้วจบและเก็บผลได้ กลับมาจึง resume; logout/account switch cancel และแยกผลตามบัญชี
- รับ created พร้อม transaction binding; skipped แยก duplicate/no_candidate→ข้ามไป และ incomplete_candidate→ต้องช่วยหมู ข้อผิดพลาดชั่วคราวแสดงเหตุและ retry ตาม eligibility/backoff ส่วนข้อมูลไม่ครบใช้จดเอง
- งานต้องช่วยหมูคงข้ามรอบ/วัน/restart จนจัดการเสร็จ เก็บบนมือถือแยกบัญชีเป็นฐานรอบนี้ แยก persistence งานค้างออกจาก cache/discovery รูปใหม่ย้อนหลัง 30 วัน จึงไม่ล้างงานค้างเพียงเพราะอยู่นอกช่วงค้นรูป
- รูปเดิมที่มีผล incomplete และยังจำผลไว้ไม่ส่ง GenAI ซ้ำอัตโนมัติ การคงงานค้างไม่ทำให้วนอ่าน ข้อผิดพลาด temporary อ่านใหม่ในรอบที่มีสิทธิ์ทำงานเมื่อถึง retry time และมี targeted retry ที่เหมาะกับสาเหตุ
- Manual resolution เติมวันรูป, ใช้ identity ของรูปเดียวกันกับ import, reconcile manual-vs-inflight/คำตอบสูญหายด้วย identity กันซ้ำ, ผูกภาพกับรายการที่สำเร็จ และคงสถานะจัดการแล้ว การแก้หรือเลือกรายการไม่สร้างซ้ำ
- รักษา identity asset ต่อบัญชีและ unique write/conflict handling เดิม ไม่ใช้ title/amount/date ในต้นแบบเป็นหลักฐานซ้ำเพียงอย่างเดียว Soft-deleted imported entry ไม่ควรถูก scan สร้างใหม่เพราะยกเลิกการแสดงแถว
- หากภาพเข้าถึงไม่ได้หรือ permission เปลี่ยน ให้รักษางานและบอกข้อจำกัดจริง ไม่เปลี่ยนเป็น resolved โดยคาดเดา การคงงานบนเครื่องไม่รับประกันหลังลบข้อมูลแอป/ติดตั้งใหม่

### งบ จดซ้ำ หมวด แท็ก และปฏิทิน

- งบเป็นแผนวงเงินรายจ่ายในเดือนบัญชี all/category/tag มี unique target ต่อ period บันทึกเป้าหมายเดิมแทนวงเงินเดิมพร้อมคำอธิบาย ใช้ warning chips 50/70/80/90 และประโยคจำนวนบาท Status เกินงบเมื่อ spent มากกว่าวงเงิน ไม่ใช่เท่าพอดี
- กฎจดซ้ำมี type/amount/title/day/start/end/category/tags/bank/card/note/active ใช้ day 1–31 ที่ capped วันสุดท้ายของเดือน end month เลือกจากรายการหรือ forever และแสดงวันแรก/วันถัดไปจาก schedule จริง
- สร้างกฎใหม่สร้างวันถึงกำหนดในช่วงที่ตั้งถึงวันนี้และรายงานจำนวนที่สร้าง เมื่อสร้างจาก existing entry เริ่มหลังวันรายการนั้นและผูกกฎกลับ original โดยไม่สร้าง original ซ้ำ; create-from-draft ที่ได้รายการจากกฎแล้วไม่บันทึก manual ซ้ำ
- การแก้กฎมีผลกับครั้งถัดไป ไม่ย้อนเปลี่ยนประวัติหรือสร้างวันย้อนหลังใหม่ด้วยค่าที่แก้ ต้องเก็บ effective schedule/version หรือช่วงการมีผลที่ generator ใช้ได้จริง
- หยุดกฎด้วย switch แล้วเปิดกลับมาเริ่มครั้งถัดไป ข้ามวันในช่วงหยุดและคงรายการก่อนหยุด การไม่เปิดแอปไม่ใช่หยุด: กลับมาสร้างวันครบกำหนดที่ยังมีผลภายในช่วง start/end ได้โดยไม่ซ้ำ ไม่เพิ่ม timer เปิดกลับอัตโนมัติหลังจำนวนเดือน
- เก็บ card identity ในกฎและส่งต่อรายการที่สร้าง กำหนด due-generation trigger เมื่อเข้าแอปพร้อมทำงาน รวม retry/partial failure ที่ไม่สร้างกฎหรือรายการใหม่ซ้ำ
- หมวด/แท็กมี tabs และ counts ของ active entries ครบ หมวดพื้นฐานแก้/ลบไม่ได้ทั้ง UI และ server หมวด custom เลือก emoji ได้ ไม่มี color picker ตรวจชื่อซ้ำในบริบทชนิดหมวด/แท็กและแท็กไม่เกิน 20 ตัวทุก create/update/inline path
- Calendar ใช้ month/week/fortnight radio cards, weekday chips/anchor options/day grid ใช้ทันทีโดยไม่มี save-confirm จัดลำดับ writes/pending/failure rollback ให้ค่าไม่ย้อนเพราะคำตอบเก่ามาถึงทีหลัง วันเริ่มเดือน capped และมีผลตรงกันใน Home รายเดือน/Summary/งบ

### Profile, streak, cards และ CSV

- Profile ใช้ sections/copy ตาม handoff ให้ tools และ live status อยู่ก่อน ค่า email มาจาก session consent ใช้ค่าเดียวกับ onboarding Help/FAQ/terms เป็น sheets และ accordion ตามต้นแบบ ภาษาเป็น info ไทย Version ใช้ข้อมูลแอปจริง ไม่ใช่ seed
- Streak ใช้วันรายการและ mode recorded/categorized กับ enabled; feed ได้วันละหนึ่งครั้งเมื่อครบเกณฑ์จริง รอ server สำเร็จก่อนยืนยันแครอต ปิดการนับไม่ลบรายการหรือ reset ประวัติโดยปริยาย Tutorial สี่หน้าตาม assets ที่กำหนด
- เพิ่มบัตรด้วยชื่อกับเลขท้ายสี่หลักเป็น optional flow ตรวจข้อมูลและรักษา draft จากนั้นเลือกใช้ต่อได้จริงจาก editor/rule/cards บัตรตัวอย่างไม่เป็นบัตรของผู้ใช้ วิธีนี้ทบทวนหลังผู้ใช้บัตรจริงลองได้ โดยยังไม่เพิ่มระบบหนี้หรือชำระบัตร
- หน้าบัตรแสดงใบที่ใช้จด ยอดรายจ่ายและจำนวนรายการรายจ่ายในเดือนบัญชี และสามรายการล่าสุดทุกชนิดจากทุกเดือน พร้อม actions ที่คง card identity ดูทั้งหมดต้องไม่ปนบัตรชื่อเดียวกัน จดเพิ่ม prefill ใบที่เลือก
- CSV จริงเป็น UTF-8 พร้อม BOM และคอลัมน์ตามลำดับ: วันที่, เวลา, ประเภท, ชื่อรายการ, หมวด, จำนวนเงิน (บาท), บัญชี, แท็ก, โน้ต, ที่มา ใช้วันที่/เวลาทำรายการจริง; เวลา unknown ว่าง รักษา Thai encoding/formula escaping และ formatter ตรงกันทั้ง server/native

### การเปลี่ยนข้อมูลทดลอง

- เมื่อ schema/index/generated client/API/native client ใหม่เข้ากันและตรวจ contract ด้วยฐานทดสอบแล้ว จึงเปลี่ยนชุดข้อมูลของบัญชี/environment ที่ระบุอย่างชัดเจน
- หยุดส่งรูปและ writes ใหม่ จัดการผลคำขอที่ยังทำงานให้แน่นอนก่อน reset การปิด client ไม่พิสูจน์ว่า server หยุดบันทึกแล้ว
- Reset รายการ กฎ งบ แท็ก หมวด custom และ preferences ของบัญชีที่เลือก พร้อม outcome/work memory, image bindings และ query cache บนมือถือบัญชีเดียวกัน คง auth/อีเมล/credentials และหมวดพื้นฐาน ไม่ drop ทั้งฐานข้อมูลหรือกระทบบัญชีอื่น
- ผ่าน onboarding ใหม่และตรวจ core flows ด้วยข้อมูลใหม่ รูปที่เคยอ่านในสมุดทดลองเก่าสามารถเติมสมุดใหม่ได้หลัง reset identities/memory เป็นการเริ่มข้อมูลใหม่ ไม่ใช่การสร้างซ้ำในสมุดเดียวกัน
- เอกสารและการทดสอบ spec นี้ไม่ดำเนิน reset จริง ขั้นตอน cutover ต้องมีชุดข้อมูลเป้าหมาย คำสั่งที่ review ได้ และรายงานผลในงานลงมือทำ

## Testing Decisions

### ขอบเขตหลักที่ใช้ต่อจากแผนที่ตกลงแล้ว

- ใช้ workflow ของแอปผ่าน transport ที่เรียก authenticated API กับฐานข้อมูล MongoDB ทดสอบแยกเป็นขอบเขตหลัก สังเกต outgoing requests, API responses, รายการ/identity/relationships ที่บันทึก และ query-derived results แทนตรวจ private helper calls
- ใช้ scan session/transport เดิมร่วมกับ server จริงใน harness สำหรับงานสลิป แทนเฉพาะ GenAI, photo library, clock, device storage และ image bindings เพื่อควบคุม created/skipped/incomplete/retry/inflight/race ได้แน่นอน ไม่สร้าง wrapper test seam ต่อหน้าจอหรือทุก service
- ใช้ขอบเขต iOS UI สำหรับสิ่งที่ API พิสูจน์ไม่ได้ เช่นฟอนต์ ภาพ ระยะ safe areas, keyboard, touch targets, sheet/navigation และ draft recovery
- ขอบเขตเหล่านี้สืบทอดจากแผนตรวจที่ผู้ใช้ทบทวนแล้วและคำสั่งล่าสุดให้ตรวจ iOS ก่อน ไม่ต้องเปลี่ยนผล source inspection เดิมให้เป็น runtime proof

### Prior art และโมดูลที่ต้องตรวจ

- ใช้แนวทาง integration tests เดิมของ slip import และ native auto-import ที่ต่อ transport/route/Import/Ledger กับ MongoDB ชั่วคราวและ fake provider รวม identity tests ที่พิสูจน์ per-user uniqueness หลัง soft deleteและ concurrent writes
- ใช้ scanner session tests เดิมที่มี clock/photo/storage ports ตรวจ scheduling, retry, permissions, retention และการพัก/กลับมา ทำ assertions ที่ผลสังเกตได้
- ขยาย integration coverage ของ Ledger/delete-restore, Planning/effective schedule, Analytics/filters/periods, Preferences/reset และ Auth contracts ผ่าน interfaces ที่ผู้ใช้แอปใช้ สร้าง fixtures จากสถานการณ์ ไม่เรียก production reset หรืออาศัยภาพการเงินจริงเพื่อให้ tests ผ่าน
- ไม่เขียน tests ที่เพียงทวน implementation หรือ style constants รูปลักษณ์ตรวจจาก handoff กับภาพ/การเดิน flow และพฤติกรรมใหม่มี tests ที่แยกความผิดพลาดได้จริง

### กรณีตรวจข้อมูลและพฤติกรรมที่ต้องผ่าน

1. มีข้อมูลมากกว่า 1,000 รายการแล้ว search/count/expense total/category usage/card summary ครบทุกหน้า พร้อม amount substring/comma/decimal และชื่อธนาคารไทย
2. Card name เดียวกันต่าง last4 ยังแยก filter/view-all/recurring/CSV ถูกต้อง และผู้ไม่มีบัตรใช้ core ได้
3. Calendar month start 29–31, leap/month end, week/fortnight anchor และ custom-period Summary/งบ/trend ตรงกัน เทียบ spent เท่างบกับ spent เกินงบ
4. Delete/undo ทุกชนิดคืน identity/fields/references/งบที่ cascade ครบ ทำซ้ำไม่สร้าง clone รักษาการแก้ unrelated fields/tag links และจัดการ failure/conflict/account ownership
5. กฎใหม่ backfill ตาม start/end, rule-from-entry ไม่ซ้ำ original, edit day/amount มีผลครั้งถัดไป, pause สองเดือนแล้ว resume ไม่จดช่วงหยุด, หลาย pause intervals และ app inactivity ไม่เป็น pause เรียก generator ซ้ำไม่สร้างรายการซ้ำ
6. Scan สามกลุ่มตรง reason; incomplete ไม่ส่งซ้ำรูปเดิม, temporary failures retry ตามเวลา, manual-help race กับ import/คำตอบสูญหายยังมีรายการเดียว และภาพผูกกับรายการที่ชนะ
7. งานค้างอยู่หลัง restart/รอบใหม่/เกิน 30 วัน และกรณี photo unavailable/permission revoked ไม่ถูกทิ้งหรือแสดง resolved เทียม เปลี่ยน route อ่านต่อ; background/lock พักการส่งใหม่; logout/user switch แยกผล
8. Auth field errors และ account-specific errors ได้ตาม contract จริง, incomplete onboarding guard, goals/terms validation, consent/profile shared values และ partial save ไม่ทำให้ completion เทียม
9. CSV 10 columns/order, UTF-8 BOM, formula-like text, bank/card labels, satang precision และ known/unknown actual time ทั้งสอง formatter ตรงกัน
10. Cutover ในฐานทดสอบรักษา auth ของบัญชีเดิม/บัญชีอื่น ล้างข้อมูลการเงินกับความจำมือถือที่เลือกครบ เริ่ม onboarding และนำรูปเดิมเข้าชุดใหม่ได้โดยไม่ปน queries เก่า

### การตรวจหน้าจอและอุปกรณ์

- ตรวจ iPhone 13 Pro ผ่าน Expo Go เป็นเครื่องจริง และ iPhone 11 จำลองผ่าน Device Hub เป็นการตรวจเพิ่มเติม เตรียม working launch/network/session ก่อนใช้เป็นหลักฐาน แอปหรือ configuration ที่มีอยู่เฉย ๆ ไม่ใช่ผลตรวจสำเร็จ
- เริ่มด้วยทาง Expo Go ที่ผู้ใช้ใช้ หาก feature ที่เลือกต้อง development build ให้ระบุ capability ที่ตรวจพบและเตรียมเฉพาะที่จำเป็น ไม่บังคับเปลี่ยน SDK/toolchain โดยไม่มีเหตุ
- ตรวจ primary task ของแต่ละช่วง พร้อมอย่างน้อยหนึ่ง failure/recovery ของ flow ที่โหลดหรือ save เปรียบเทียบภาพ 29 ภาพและ interactions/sheets/empty/errors จากต้นแบบ ตรวจ light/dark, ไทย/ชื่อยาว, ยอดเงินยาว, Dynamic Type, keyboard, close/back, scrolling และ photo permissions
- รายงานเครื่องจริงกับ simulator และรายการที่ยังไม่ตรวจแยกกัน ตรวจ native permission/photo behavior บนเครื่องจริงเมื่อ simulatorพิสูจน์ไม่ได้ การตรวจ Android SDK/AVD/runtime/UI ไม่เป็นเงื่อนไขรับงานรอบนี้ และผล iOS ไม่รับรอง Android
- รัน Review Checklist ของ repo: install, check, test และ scripts ที่จำเป็นสำหรับ workspace ที่แก้ การตรวจ code changes ต้องรัน check-types แยกเพราะ check ปัจจุบันไม่ได้เปิด type checking; ใช้ผล tests ที่เหมาะกับงาน ไม่อ้างว่าชุดเดิมที่ผ่านพิสูจน์ดีไซน์ใหม่แล้ว

## Out of Scope

- การเตรียม Android SDK/AVD และการตรวจรับ runtime/UI/เครื่องจริง Android ในรอบนี้; กลับมาทำเป็นงานภายหลังโดยคงฐานโค้ดร่วมไว้
- ปรับเว็บแอป และเผยแพร่ App Store/Google Play
- แยกหลายบัญชีของธนาคารเดียวกัน ระบบยอดคงเหลือ/บัญชีปลายทางของการย้ายเงิน และข้อมูลบัญชีเก่าที่ต้องเดาแยกย้อนหลัง
- ระบบหนี้ รอบบิล วงเงิน และการชำระบัตรเครดิตเพิ่มเติมจากหน้าบัตรตาม handoff
- Sync งานสลิปค้างข้ามเครื่อง การรับประกันอยู่หลัง uninstall/reset แอป และการอ่านรูปเมื่อปิดแอปด้วย OS background task
- การเปิดกฎจดซ้ำกลับอัตโนมัติหลังระยะหยุดที่ตั้งเป็นเดือน ฟีเจอร์นี้ยังไม่ใช่ข้อตกลง
- Flow นำเข้า statement/PDF ใหม่ และฟีเจอร์ที่ prototype บอก “จะทำในรอบถัดไป” หรือเร็ว ๆ นี้
- Copy HTML/support runtime มาเป็นแอปจริง หรือใช้ seed dates/amounts/timers เป็น production data/contract
- Drop ทั้งฐานข้อมูล เปลี่ยน credentials หรือลบบัญชี auth จากการเริ่มข้อมูลการเงินทดลองใหม่

## Further Notes

- สังเคราะห์จาก [แผนที่ต้นทาง](../native-redesign-wayfinding/map.md) และอ่าน Answer ของทุกชื่อที่ Decisions so far ลิงก์ไว้ ใช้คำตอบล่าสุด โดยเฉพาะ iOS-only verification แทนแผนสองแพลตฟอร์มที่คุยในช่วงแรก
- รายละเอียดการตรวจ codebase อยู่ใน [ข้อมูลและ API สำหรับดีไซน์มือถือใหม่](../native-redesign-wayfinding/assets/data-api-coverage.md); ลำดับและเกณฑ์เดิมอยู่ใน [แผนส่งต่อ](../native-redesign-wayfinding/assets/delivery-plan-proposal.md) ทั้งสองเป็นหลักฐานวางแผน ไม่ใช่รายงานว่า implementation ใหม่ผ่านแล้ว
- Design reference อยู่ใน [README handoff](/Users/computer/Downloads/design_handoff_moojot_app/README.md) และ [HTML prototype](</Users/computer/Downloads/design_handoff_moojot_app/Moojot Home.dc.html>) พร้อม assets/fonts/screenshots ชุดเดียวกัน เมื่อเริ่มพัฒนาให้เก็บ reference ที่ผูก version ไว้ใน repo เพื่อให้ผู้ทำงานต่อใช้ชุดเดียวกัน
- ข้อยกเว้นเหนือ prototype คือการคงงานค้าง, classification ของ incomplete, cascade budget/full undo, CSV unknown time, pause/resume และเพิ่มบัตรใบแรก ตามคำตอบใน map ถ้าพบข้อจำกัดจริงที่เปลี่ยนผลที่ผู้ใช้ได้รับ ให้อธิบายด้วยสถานการณ์ก่อนเปลี่ยนขอบเขต
- ภาษาร่วมใช้ [บริบทแอปมือถือ](../../apps/native/CONTEXT.md) และ [บริบทการนำเข้าสลิป](../../packages/api/CONTEXT.md) ก่อนเขียน Effect code ต้องอ่านคำแนะนำของ Effect ใน dependency ตามกฎ repo
- Spec นี้เป็นงานพร้อมส่งต่อ `ready-for-agent` ยังไม่เปลี่ยน implementation ไม่ติดตั้งเครื่องมือ iOS/Android และไม่รีเซ็ตข้อมูลจากการเขียนเอกสาร การแตก build issues เริ่มที่ 01 ใน feature directory นี้และแยกจาก decision tickets ของ map

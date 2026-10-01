# ข้อเสนอลำดับพัฒนาและเกณฑ์ตรวจรับหมูจดโฉมใหม่

สำหรับ [กำหนดลำดับงานและเกณฑ์ตรวจรับการปรับโฉม](../issues/06-delivery-sequence.md) ใช้ข้อตกลงใน [แผนที่](../map.md) และ [ผลตรวจข้อมูล/API](data-api-coverage.md) เป็นฐาน เอกสารนี้เป็นข้อเสนอสำหรับทบทวนก่อนส่งต่อ spec ยังไม่มีการแก้ implementation

## เป้าหมายและลำดับที่ผู้ใช้เลือก

ปรับแอปเดิมให้ตรง handoff ทั้งหน้าตาและพฤติกรรม มีเป้าหมายรองรับ iPhone/Android โดยรอบนี้ตรวจและรับงานบน iOS ก่อน แล้วตรวจ Android ภายหลังตามคำสั่งล่าสุด ให้การจดรายการและอ่านสลิปที่ผู้ใช้ใช้อยู่มาก่อน แล้วทำส่วนอื่นจนครบ รวมบัตรเครดิตซึ่งเป็น flow เสริม ทุกช่วงต้องดูหน้าจอและลองงานหลักได้กับระบบจริง ไม่รับเฉพาะภาพที่ใช้ข้อมูลตัวอย่างแล้วกดบันทึกไม่ได้

## สี่ช่วงงาน

| ช่วง                        | ผลที่ผู้ใช้เห็นและลองได้                                                                        | งานข้อมูล/ระบบที่ต้องพร้อม                                                                                                                                                                                     | จุดตรวจรับของช่วง                                                                                                                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **เตรียมฐานร่วม**           | ตัวอย่างหน้าที่แสดงข้อความ ปุ่ม ยอดเงิน และ sheets ตรงดีไซน์ทั้งสองธีม                          | ตั้ง typography/theme/components/navigation ร่วม; วาง schema/API สำหรับ undo, เวลาจริงและหลักฐานสลิป, บัตร/กฎจดซ้ำ และงานค้าง; เตรียม fixture/ทางรันตรวจ iOS                                                   | ข้อความไทย Regular; ตัวเลข font ระบบ 500/tabular; safe areas/keyboard; โครงสัญญาใหม่ผ่านตรวจด้วยฐานข้อมูลทดสอบแยก ไม่เปลี่ยนข้อมูลผู้ใช้เพื่อทดสอบ contract                                                |
| **ทำการใช้งานหลัก**         | เข้าแอป/ตั้งค่า 4 ขั้น → Home → จดเอง/แก้/เลือกหมวด → อ่านสลิป/ช่วยจดรายการค้าง                 | auth error mapping และ onboarding/shared consent; bank/filter identity; app-level scan coordinator; persistent work rows/targeted retry/manual resolution; delete/restore ของ entry; เวลาบันทึกแยกเวลาทำรายการ | จดและอ่านจริงได้; สลิปค้างข้ามรอบ/restart; incomplete ไม่ส่งซ้ำรูปเดิม; temporary error retry; manual-vs-inflight ไม่สร้างซ้ำ; เปลี่ยนหน้าอ่านต่อ/พักแอปหยุดส่งใหม่; validation/save failure รักษา draft   |
| **ทำสรุปและการวางแผน**      | Summary → Search ทุกเดือน → งบ/จดซ้ำ → จัดการหมวด/แท็ก/ปฏิทิน                                   | amount matching และ pagination/counts; custom-period consistency; cascade delete/full undo; recurring card/link/effective schedule/pause history; settings immediate persistence                               | ยอดทุกหน้าตรงกันกับข้อมูลเกิน 1,000 แถว; spent เท่างบ; month start 29–31; undo คืนความสัมพันธ์; new-rule backfill, edit next-only, ข้ามช่วงที่หยุด; ปฏิทินใช้ทันทีและกู้ค่าก่อน reset ได้                  |
| **เก็บส่วนเสริมและตรวจครบ** | Profile พร้อมสถานะจริง → แครอต/tutorial/help → บัตรเครดิต/เพิ่มบัตร → CSV และทดสอบ flow ทั้งชุด | queries/status aggregation, optional card choices ที่ใช้ร่วม editor/rules/cards, formatter 10 columns และ known/unknown time, cutover ชุดข้อมูลใหม่                                                            | ไม่มีบัตรก็ใช้ core ได้; card name+last4 ตรงกันทุกหน้า; CSV ไทย/BOM/ยอดครบ; help อธิบายพฤติกรรมจริง; light/dark และ error/recovery ครบ; ตรวจ iPhone จริงและ iPhone จำลองครบตามแผน iOS; Android ตรวจภายหลัง |

ภายในช่วงเตรียมฐานร่วมและการใช้งานหลัก ให้เริ่มงาน UI ที่ไม่ติด schema ได้ก่อน แต่ flow ที่ต้องใช้ contract ใหม่ต้องรอ owner ของสัญญานั้นพร้อม ใช้ feature branch ตาม repo workflow และแตก issue ลงมือทำใน feature directory ใหม่ตอนส่งต่อ spec

## แนวทางทางเทคนิคสำหรับส่งต่อ spec

### รักษาฐานแอปและสัญญาที่ใช้ได้

คง Expo Router, TanStack Query/Form, useAppTheme และ wrappers typography ที่มีอยู่ ใช้ palette/assets/font/copy ของ handoff เป็นค่าตรวจรับ กฎ UI ทั่วไปใน skills ไม่เปลี่ยนหน้าตาที่ผู้ใช้เลือก เช่นสีแบรนด์ รูปแบบปุ่ม “จดเพิ่ม” หรือ MDI icons มีค่า geometry/timing ที่ต้นแบบกำหนดให้ตรวจจากต้นแบบจริง ไม่คัดลอก HTML runtime มาเป็น production app

คง satang เป็นจำนวนเต็มและวันบัญชีเป็น ISO calendar strings เก็บเวลาทำรายการเป็นข้อมูล optional จากหลักฐานเท่านั้น createdAt ใช้เป็นเวลาบันทึก ห้ามแปลงวันรายการให้เลื่อนด้วย timezone หรือเติมเวลาใน CSV จาก createdAt

ค้นหาทุกเดือน หน้าบัตร และสถานะหลายหน้าสามารถใช้ operations เดิมได้ เพิ่ม amount predicate/normalized bank names ในเจ้าของการค้นหา และกำหนดวิธีได้ counts/totals ครบทุกหน้า ไม่ดึง 1,000 แถวแล้วเรียกว่าข้อมูลครบทั้งหมด

### การลบและเอากลับคืน

ให้ server เป็นเจ้าของการลบ/คืน entity ที่อยู่บน server และบันทึกผลของ operation เฉพาะนั้นเพื่อคืน identity/relationships เดิมได้ native แสดง toast ล่าสุด 5 วินาทีตามข้อตกลง ระบบคืนต้องทำงานกับข้อมูลจริง ไม่สร้าง entity ใหม่โดยใช้ชื่อเดียวกันแทน ID เดิม

สำหรับหมวด/แท็ก/งบ/กฎจดซ้ำ ให้เลือก schema การลบที่รักษาข้อมูลที่ต้องคืนกับผลกระทบของ cascade ภายใน operation เดียว ก่อน implementation ระบุ owner ของ receipt/snapshot กับทาง restore ให้ครบ เพิ่ม validation ownership/การเรียกซ้ำ และทำการคืนเป็น transaction ที่ไม่ทับการแก้ข้อมูลอื่น หากมี conflict ให้คืน error ที่แอปอธิบายได้แทนรายงานว่าคืนครบทั้งที่คืนเพียงบางส่วน

การปิด toast ไม่หมายถึงคำขอ server สำเร็จ ต้องมี pending/failure/recovery จริง ระยะเก็บข้อมูลสำหรับรับมือคำขอซ้ำ/ล้มเหลวเป็นรายละเอียด implementation แต่ UI action window ยังคงตามดีไซน์

### งานสลิปและหลักฐาน

ใช้ความจำงานค้างบนมือถือแยกตามบัญชีเป็นฐานของรอบนี้ เนื่องจากยังไม่มีข้อกำหนด sync งานค้างข้ามอุปกรณ์ แยก work-item persistence ออกจาก discovery/outcome cache ที่ล้างตาม 30 วัน ให้ record มี asset ID, วันที่รูปที่ใช้ prefill, สาเหตุ/สถานะ, retry metadata ที่จำเป็น, transaction binding และการจัดการเสร็จ

ใช้เจ้าของ scan ระดับ signed-in app เพื่ออ่านต่อเมื่อเปลี่ยน route ใช้ app activity/permission/account เป็นเงื่อนไขส่งใหม่ เมื่อไม่ active พักการส่งใหม่ และเมื่อกลับมามีสิทธิ์ทำงานให้ทำต่อ โดยไม่เพิ่มคำสัญญาทำงานขณะปิดแอป

คง asset identity `slip:<assetId>` และการกันซ้ำบน server ให้การจดเองจากงานค้างใช้ identity ของรูปเดียวกันและ reconcile ข้อขัดแย้งกับคำขอที่ส่งไว้แล้ว สำเร็จแล้วผูกรูปกับรายการและปิดงาน ไม่เอาเวลารูปหรือชื่ออัลบั้มไปอ้างว่าเป็นเวลาทำรายการหรือธนาคารในธุรกรรมโดยไม่มีหลักฐาน

เพิ่ม schema/prompt/extraction/mapping ของหลักฐานที่ UI ใช้จริง โดยคง unknown เป็น unknown และ qualify ชุดข้อมูลก่อนสร้างรายการ Generic skipped ต้องแยกเหตุผล: incomplete เข้าต้องช่วย; duplicate/no-candidate เข้าข้าม เมื่อหาไฟล์รูปไม่พบหรือสิทธิ์ถูกจำกัด รักษางานและแจ้งข้อจำกัดจริง

### จดซ้ำ บัตร และ settings

กฎจดซ้ำต้องเก็บบัตรที่เลือกได้และผูกรายการเดิมกับกฎจาก editor ให้ครบ เลือกการเก็บช่วงที่มีผลหรือ version ของกฎเพื่อให้ generator เข้าใจประวัติ ไม่ใช้ isActive ปัจจุบันกับ startsOn เดิมแล้วสร้างย้อนหลังด้วยวัน/ยอดที่แก้ใหม่ทั้งหมด

สร้างกฎใหม่จดย้อนเฉพาะช่วงที่ handoff กำหนด; แก้กฎมีผลครั้งถัดไป; pause interval ไม่ถูก backfill หลัง resume การไม่ได้เปิดแอปไม่ใช่ pause และต้องกำหนด trigger ของ due-generation เมื่อเข้าแอปให้ยังเคารพช่วงสิ้นสุดและ identity กันซ้ำ

เพิ่มบัตรครั้งแรกด้วยชื่อ+เลขท้าย 4 หลักเป็น optional flow ใช้ตัวเลือกเดียวกันใน editor/rule/cards การเลือก representation ของรายการตัวเลือกต้องให้เลือกใช้ครั้งต่อไปได้จริงโดยไม่พึ่งข้อมูลตัวอย่าง คงการดูรวมธนาคารและ card identity ตามข้อตกลง

calendar/theme/consent ใช้ persistence ที่มีได้ แต่ต้องให้ UI consumer ทุกจุด refresh ตามค่าเดียวกัน Save button ที่กดได้ไม่หมายถึง submit ซ้ำได้ระหว่าง mutation ให้ป้องกัน duplicate submit และรักษา draft เมื่อคำขอผิดพลาด

### Auth และ onboarding

ใช้ auth service เดิม แต่ต้องแสดง unknown-email/wrong-password ตามข้อมูลที่ contract ให้ได้จริง ไม่เดาจาก INVALID_EMAIL_OR_PASSWORD เดียว ตรวจวิธีปรับ contract กับ library ที่ติดตั้งก่อนเสนอ implementation และบันทึกข้อจำกัดจริงหาก flow ใดทำตาม handoff ไม่ได้

ผู้ที่ onboarding ยังไม่ครบต้องมีทางทำให้ครบผ่าน guard เดิม; signin→Home ใน README ใช้กับบัญชีที่พร้อมแล้ว การตั้งค่า 4 ขั้นและ profile แชร์ key/value ความยินยอมเดียวกัน ตรวจ loading/error/partial save แล้วคงข้อกำหนด terms ที่มีอยู่

## การเริ่มข้อมูลใหม่และการตรวจงาน

ใช้วิธีตาม [กำหนดวิธีพาข้อมูลทดลองไปสู่ระบบใหม่](../issues/05-data-transition.md#answer) หลังชุด schema/API/client เข้ากันและ contract tests ผ่าน ระบุ account/environment ให้ชัด หยุด writes เดิมก่อน reset ข้อมูลการเงินและ local memories ของบัญชีเดียวกัน รักษา auth และทดสอบ onboarding ใหม่

ตรวจในช่วงพัฒนาด้วย iPhone 13 Pro/Expo Go และ iPhone 11/Device Hub ที่ผู้ใช้มีอยู่ ใช้ Expo Go เป็นทางเริ่มที่มีหลักฐานเดิม ถ้ามี capability ที่ต้อง development build ให้ระบุเหตุที่ตรวจพบและเตรียม build ใน issue ของงานนั้น รายงาน iPhone เครื่องจริง/เครื่องจำลองและสิ่งที่ตรวจแยกกันเสมอ

ตามคำสั่งล่าสุด การเตรียม Android SDK/AVD และการตรวจ runtime/UI ของ Android เลื่อนไปภายหลัง ไม่เป็นเงื่อนไขรับงานรอบ iOS นี้ เมื่อกลับมาทำ Android ให้ตรวจเครื่องจำลองและเครื่องจริง โดยเฉพาะ permissions/คลังรูป/keyboard/back/layout และบันทึกผลแยกจาก iOS โค้ดร่วมยังคงเป็นฐาน แต่ผลผ่าน iOS ไม่รับรอง Android

### ความพร้อมที่ตรวจจากเครื่องในรอบวางแผน

- มี Xcode 27.0 build 27A266a และ Device Hub bundle ที่ `/Applications/Xcode.app/Contents/Applications/DeviceHub.app` พร้อม configuration iPhone 11 / iOS 27.0
- ตรวจตำแหน่ง bundle ของแอปที่ติดตั้งใน iPhone 11 จำลองแล้วยังไม่พบ Expo Go หรือหมูจด จึงต้องเตรียมทาง launch ของแอปบน simulator ก่อนใช้เป็นผลตรวจงาน
- ไม่พบ adb/emulator ใน PATH และไม่พบ SDK/AVD ในตำแหน่งมาตรฐานที่ตรวจ ข้อนี้ไม่ตัดความเป็นไปได้ว่ามี SDK ใน custom path ให้ตรวจหรือเตรียม environment จริงในงานช่วงแรก
- เวอร์ชัน dependency ที่ติดตั้งตรง manifest: Expo 57.0.25, React Native 0.86.3 และ package Expo ที่เกี่ยวข้อง ไม่ใช่หลักฐานว่ารันใน Expo Go/build สำเร็จแล้ว
- การตรวจนี้อ่าน filesystem/config เท่านั้น ไม่มีการ boot simulator, เปิดแอป, ติดตั้ง SDK หรือทดลอง native build

แต่ละช่วงมีภาพ/การเดิน primary task พร้อมหนึ่งกรณีผิดพลาดและกลับมาทำสำเร็จของ flow ที่อ่านหรือบันทึกข้อมูล ตรวจภาษาไทย/ข้อความยาว/จำนวนเงินยาว/large system text/light-dark/keyboard/close-back/permission โดยรักษาขนาด touch targets และข้อมูลที่กรอก

รัน Review Checklist ของ repo และ scripts check-types ของ workspace ที่แก้ `vp check` ปัจจุบันตั้ง typeCheck:false จึงไม่ใช้แทน type checks รัน tests ของผลลัพธ์ที่เปลี่ยน รวม contract/database/scanner boundaries ที่สำคัญ ไม่มีการเพิ่ม tests ที่เพียงทวน style constants

## การใช้ต้นแบบที่ต้องตัดสินใจตามระบบจริง

network timers และ seed data ไม่ใช่ SLA หรือสัญญา API ให้ใช้ data fetching states จริง: กำลังโหลด ผิดพลาด ว่าง และมีข้อมูล รวมสถานะกำลังบันทึกกับ draft recovery ส่วนข้อความ onboarding/help/profile ต้องทบทวนพร้อม scanner flow ที่เปลี่ยน แทนคำแนะนำที่ย้อนแย้งกับการอ่านอัตโนมัติ

ใช้ภาพ 29 ภาพเป็นรายการอ้างอิงการตรวจตามหน้าจอ แต่การไม่มี screenshot ของบาง sheet/error ไม่ตัด flow นั้นออก ใช้ HTML/README สำหรับรายละเอียดที่ภาพไม่ครอบคลุม เก็บ handoff ที่ผูก version ไว้ใน repo เมื่อเริ่ม implementation เพื่อให้ agent คนถัดไปใช้ reference ชุดเดียวกัน

เอกสารนี้พร้อมทบทวนลำดับและขอบเขตกับผู้ใช้ รายละเอียด representation/receipt/effective scheduling ใน spec เป็นการตัดสินใจวิศวกรรมตามเงื่อนไขข้างต้น ผู้ใช้ไม่ต้องเลือกชนิดฐานข้อมูลหรือชื่อ endpoint แทนผู้พัฒนา

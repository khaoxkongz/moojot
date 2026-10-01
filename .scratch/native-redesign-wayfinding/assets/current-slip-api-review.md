# API อ่านสลิปปัจจุบันและสถานะที่แอปเก็บเอง

ตรวจเมื่อ 1 ตุลาคม 2569 จาก codebase ตามคำขอผู้ใช้ ก่อนตัดสินใจเรื่องรายการ “ต้องช่วยหมู” ค้างข้ามรอบอ่าน

## ผลที่ยืนยันจากโค้ด

ระบบอ่านและบันทึกสลิปทีละรูปมีอยู่แล้ว ส่วนความจำผลอ่านอยู่ในมือถือแยกตามบัญชีผู้ใช้ ปัจจุบันไม่มี endpoint ดึงรายการงานอ่านสลิปที่ค้างหรือล้มเหลวจาก server

| หน้าที่                | Endpoint ที่แอปใช้                  | สิ่งที่ทำ                                                                  |
| ---------------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| อ่านและบันทึกสลิป      | `POST /rpc/import/slip/auto-import` | รับรูปหนึ่งรูป ตรวจข้อมูล อ่านด้วย AI และสร้างรายการเมื่อมีข้อมูลจำเป็นครบ |
| ดึงรายการที่บันทึกแล้ว | `POST /rpc/ledger/listTransactions` | อ่านรายการบัญชี เช่นกรอง `source: slip` และแบ่งหน้าด้วย `limit`/`offset`   |
| ตรวจ server            | `GET /`, `POST /rpc/healthCheck`    | คืน `OK`                                                                   |
| ดูเอกสาร API           | `GET /api-reference/spec.json`      | สร้าง OpenAPI ของ router ส่วนที่เปิดเผย; import ถูกยกเว้นจากเอกสารนี้      |

เส้นทาง RPC สำหรับ import ถูก mount ด้วย object keys พิเศษใน server และ native transport ใช้ keys เดียวกัน ให้ใช้ path ข้างต้น ไม่อนุมานเป็น `/rpc/import/autoImportSlip` จากชื่อ method

หลักฐาน: [server app](../../../apps/server/src/app.ts), [native transport](../../../apps/native/features/slips/auto-import/transport.ts), [import route](../../../packages/api/src/features/import/import.route.ts), [ledger routes](../../../packages/api/src/features/ledger/ledger.route.ts)

## ข้อมูลเข้าและผลอ่านสลิป

Input มี `assetId`, `fileBase64` และ `mimeType` ซึ่งรองรับ JPEG/PNG ต้องใช้ session ของผู้ใช้ที่เข้าสู่ระบบ

ผลสำเร็จของคำขอมีสองชนิด:

- `created`: บันทึกแล้ว คืน `transactionId` และ `warnings`
- `skipped`: ไม่สร้างรายการ คืน `reason`, `reasons`, `warnings` โดย reason เป็น `duplicate`, `no_candidate` หรือ `incomplete_candidate`

`incomplete_candidate` เป็นผลข้ามเมื่อจำนวนเงินหรือวันรายการไม่ครบ/ไม่ผ่าน validation ไม่ใช่ network error แอปปัจจุบันจำเป็น `skipped` และไม่อ่านรูปเดิมซ้ำตามปกติ เว้นแต่ตัวรูปเปลี่ยน จึงต้องจัดเข้ากลุ่มช่วยจดเองให้ตรงดีไซน์ใหม่ แทนการแสดงทุก skipped ว่าไม่ต้องทำอะไร

ข้อผิดพลาด เช่น `BUSY`/`AI_RATE_LIMITED` ใช้ 429 พร้อม `Retry-After`; upstream/timeout/persistence มีรหัสแยกต่างหาก ฝั่งมือถือใช้รหัสเพื่อแยก retry กับ rejected

Server กันซ้ำด้วย `slip:${assetId}` ภายในบัญชีผู้ใช้ ตรวจ identity ก่อนอ่านและตรวจ conflict ตอนเขียนอีกครั้ง การส่งรูปซ้ำจึงไม่ควรสร้างรายการใหม่จากรูปเดียวกัน

หลักฐาน: [input/outcome schema](../../../packages/api/src/features/import/import.schema.ts), [import errors](../../../packages/api/src/features/import/import.error.ts), [import service](../../../packages/api/src/features/import/import.service.ts), [candidate qualification](../../../packages/api/src/features/import/candidate.ts)

## ความจำของมือถือและข้อจำกัดปัจจุบัน

- เก็บ `saved`, `duplicate`, `skipped`, `rejected`, `retry` ต่อ asset ID ในไฟล์ `moojot-slip-scan-v1.<account>.json` ของมือถือ แยกตามบัญชีผู้ใช้
- ไม่เก็บภาพ session หรือผลข้อความจาก AI ในไฟล์ความจำนี้
- Retry จำจำนวนครั้ง เวลาอ่านครั้งถัดไป และรหัสผิดพลาด โดยกลับมาอ่านในรอบที่มีสิทธิ์ทำงานและเลยเวลา retry แล้ว
- ค้นหารูปจากอัลบั้มที่รองรับย้อนหลัง 30 วัน ความจำล้าง records ที่ discovery ไม่พบแล้ว ยกเว้น retry ที่ยังรอเวลาครั้งถัดไป จึงไม่ใช่รายการงานค้างแบบเก็บจนผู้ใช้จัดการเสร็จ
- `lastRound` เป็นผลสรุปรอบล่าสุดในหน่วยความจำและถูกแทนที่เมื่อรอบใหม่จบ ส่วน Home แสดง reading/animation/access ยังไม่มีหน้ารายการค้างตามดีไซน์ใหม่
- ต้องให้ Home อยู่ด้านหน้าและแอป active จึงส่งรูปใหม่ได้ เมื่อเปลี่ยนหน้าหรือพักแอปจะหยุด scheduling คำขอที่ส่งแล้วจบได้

หลักฐาน: [native adapter/storage](../../../apps/native/features/slips/auto-import/index.ts), [scan memory](../../../apps/native/features/slips/auto-import/scan-memory.ts), [scan session](../../../apps/native/features/slips/auto-import/scan-session.ts), [discovery](../../../apps/native/features/slips/auto-import/discovery.ts), [Home eligibility](../../../apps/native/features/slips/auto-import/home-scan.ts)

## ผลต่อดีไซน์ใหม่และคำถามที่ยังเปิด

- ใช้ระบบอ่าน บันทึก และกันซ้ำเดิมเป็นฐานได้
- ต้องเพิ่มการเปิดผลอ่านให้ UI ใช้งาน และแยก skipped แต่ละเหตุผลให้ตรงกลุ่ม “ต้องช่วยหมู”/“ข้ามไป”
- การจดเองจากผลอ่านที่ไม่ครบต้องผูกรูปกับรายการและสถานะจัดการแล้ว เพื่อไม่กลับมาเป็นงานค้างหรือถูกจดซ้ำ
- ถ้าเลือกให้คงงานค้างจนจัดการเสร็จ ต้องกำหนดการเก็บงานค้างแยกจากการล้างความจำตามช่วงค้นรูป 30 วัน รวมกรณีไม่พบรูปหรือสิทธิ์เข้าถึงเปลี่ยน
- ยังไม่ตัดสินใจว่าจะคงงานค้างข้ามรอบหรือเก็บบนมือถือ/server ผู้ใช้ขอให้ตรวจระบบก่อนตอบเรื่องนี้

## ขอบเขตหลักฐาน runtime ที่มีเพิ่มเติม

ก่อนผู้ใช้เปลี่ยนมาตรวจจากโค้ด ได้เปิด development server ของ checkout นี้และตรวจแบบไม่มี session:

- health ทั้งสองทางตอบ 200/OK
- `ledger/listTransactions` และ import ตอบ 401/UNAUTHORIZED
- OpenAPI spec ตอบ 200 มี 52 documented paths และยกเว้น import ตามโค้ด
- path ทดลอง `/rpc/import/listResults` ตอบ 404; ข้อสรุปว่าไม่มีรายการผลอ่านใช้การตรวจ router เป็นหลัก ไม่อนุมานจาก 404 ของชื่อที่ลองเพียงอย่างเดียว

หลักฐานเหล่านี้ยืนยันการเปิด route/การบังคับ session และเอกสาร API แต่ไม่ใช่ผลทดสอบอ่านสลิปสำเร็จหรือ query รายการของผู้ใช้ที่เข้าสู่ระบบ ไม่ได้ทดสอบ flow ของแอปครบผ่าน Device Hub การตรวจครั้งนี้จบด้วยการใช้ codebase ตามที่ผู้ใช้เลือก

# กำหนดนโยบายทรัพยากรและความล้มเหลวของ Import

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: 03, 04

## Question

ภายใต้สัญญา `import.autoImportSlip` ที่รับภาพ JPEG/PNG หลัง decode ไม่เกิน 10 MiB และ JSON payload ไม่เกิน 14 MiB จะบังคับเพดานเหล่านี้อย่างไร และควรจำกัด concurrency, timeout, cancellation กับจำนวน candidate เท่าใด? กำหนด code, HTTP status และ retry policy ให้ละเอียดสำหรับภาพ, Gemini, Schema และฐานข้อมูล โดยรักษาการแบ่งผล `skipped` ออกจาก request/system error ตาม ticket “กำหนดสัญญา API นำเข้าที่บันทึกอัตโนมัติ”

## Answer

**ขอบเขตทรัพยากร:** ให้ Hono บังคับขนาด HTTP JSON body จริงไม่เกิน 14 MiB ที่ path ใหม่ `/rpc/import/slip/auto-import` ก่อน oRPC parse; ตอบ `PAYLOAD_TOO_LARGE` (413) ด้วยรูปแบบ error ที่ client อ่าน `code` ได้. `fileBase64` ต้องเป็น base64 มาตรฐานของไฟล์จริง ไม่มี data-URI prefix, whitespace หรืออักขระอื่น; ตรวจความยาวก่อนสร้าง Buffer แล้วตรวจจำนวน byte หลัง decode อีกครั้ง โดยไฟล์ต้องไม่เกิน 10 MiB. ภาพว่างเป็น `FILE_REQUIRED`; base64 ผิดหรือภาพเสียที่ตรวจพบเป็น `INVALID_FILE`. ตรวจ JPEG/PNG signature ให้ตรง `mimeType`; signature ที่ไม่รองรับเป็น `UNSUPPORTED_IMAGE`, ส่วน signature กับ `mimeType` ไม่ตรงกันเป็น `UNSUPPORTED_FILE`. `assetId` เป็น opaque ID ที่ต้องไม่ว่างหลัง trim, ยาวไม่เกิน 256 UTF-8 bytes และไม่มี control character; ปฏิเสธ ID ที่มี whitespace หัวท้ายแทนการแก้ค่าเงียบ ๆ เพื่อรักษาอัตลักษณ์ `slip:<assetId>` ให้แน่นอน.

**งานพร้อมกันและคิว:** ให้ Gemini ทำงานได้ไม่เกิน **2 calls ต่อ server instance**. สร้าง `Semaphore` ของ Effect ตัวเดียวใน Layer/runtime ที่ทุกคำขอใช้ร่วมกัน; permit ครอบเฉพาะช่วงเรียก Gemini แล้วคืนเมื่อสำเร็จ, ล้มเหลว, timeout หรือถูกยกเลิก. หลังตรวจ input/ภาพและตรวจ dedupe ล่วงหน้าแล้ว จึงเข้าคิวรอ permit แบบ FIFO ได้อีก **2 คำขอ** ไม่เกิน **10 วินาที**. เมื่อคิวเต็มหรือรอครบเวลา ตอบ `BUSY` (429) พร้อม `Retry-After: 30`; ไม่ปล่อยให้ `Semaphore` สะสมผู้รอไม่จำกัด. คำขอที่ขาดการเชื่อมต่อขณะรอคิวต้องถอนตัวและคืนที่ว่าง. เพดานนี้ใช้ภายใน instance เท่านั้น; หลาย instance ยังอาจชน quota Gemini ซึ่งแยกเป็น `AI_RATE_LIMITED`. ไม่เพิ่ม `p-limit` เพราะ Effect มี primitive ที่จำเป็นอยู่แล้ว. Home autoScan ในงานปรับ client ภายหลังควรจำกัดจำนวนรูปที่ส่งพร้อมกันด้วย เพื่อลด `BUSY` เมื่อวันหนึ่งมีหลายรูป.

**เวลาและการยกเลิก:** บังคับ timeout ของ Gemini **110 วินาทีต่อ call** และ deadline **140 วินาทีตั้งแต่เริ่ม handler จนก่อนเริ่ม `LedgerService.createTransaction`** โดยรวมเวลารอคิว, ตรวจข้อมูลและเรียก Gemini. หากครบเวลาในช่วง Gemini เป็น `AI_TIMEOUT` (504); หากครบ deadline ในขั้นอื่นก่อนเริ่มเขียนเป็น `IMPORT_TIMEOUT` (504). ปิด retry ของ Gemini SDK โดยชัดแจ้ง เพราะ `interactions.create` ในเวอร์ชันที่ติดตั้งมี retry ภายในเป็นค่าเริ่มต้น; มิฉะนั้น 110 วินาทีอาจกลายเป็นหลาย attempts. เมื่อ client disconnect ให้ยกเลิกคิว/การอ่าน Gemini และไม่เริ่มเขียนรายการใหม่. เมื่อเริ่มคำสั่งสร้างรายการแล้ว ให้รอผลฐานข้อมูลจริงแม้ client disconnect หรือ deadline ก่อนเขียนผ่านไป; ไม่ timeout Effect รอบการเขียนจนรายงานผิดว่าไม่สำเร็จ ทั้งที่ฐานข้อมูลอาจ commit แล้ว. หากคำตอบหายหลัง commit, คำขอใหม่ที่ใช้ asset ID เดิมจะได้ `skipped: duplicate` ตามกฎ dedupe. ฝั่ง client ที่จะใช้ API ใหม่นี้ควรมี timeout ยาวกว่า deadline ฝั่ง server; การปรับ client อยู่นอก scope ของ migration นี้.

**จำนวน candidate:** prompt และ schema ขอได้ไม่เกิน 1 candidate และ runtime ต้องตรวจซ้ำก่อนบันทึก. อาร์เรย์ว่างที่โครงสร้างถูกต้องคือ `skipped: no_candidate`; candidate เดียวที่โครงสร้างถูกแต่ฟิลด์จำเป็นไม่พร้อมคือ `skipped: incomplete_candidate`. ถ้า Gemini ส่งมากกว่า 1 candidate, JSON เสีย, schema ผิด, `kind` ไม่รู้จัก หรือไม่มีผลลัพธ์ที่ parse ได้ ให้ `AI_INVALID_RESPONSE` (502) และไม่เลือกตัวแรกหรือบันทึกบางส่วน. ชื่อว่างยังใช้ชื่อสำรองพร้อม warning ตาม ticket “ออกแบบขอบเขต Effect สำหรับ Import Feature”.

**Error contract:** route แปลง tagged Effect errors เป็น oRPC code/status; body-limit middleware ใช้รูป error ที่เข้ากันได้. ข้อความและ log ต้องไม่ส่ง base64, Gemini key, raw AI response หรือรายละเอียดฐานข้อมูลให้ client. `skipped` เป็นผลปกติ ไม่ใช่ HTTP error.

| กรณี                                                          | Code                            | HTTP | Auto retry รูปเดิม                               |
| ------------------------------------------------------------- | ------------------------------- | ---: | ------------------------------------------------ |
| ไม่มี session                                                 | `UNAUTHORIZED`                  |  401 | ไม่ จนกว่าจะเข้าสู่ระบบใหม่                      |
| JSON/input ผิดโครงสร้างอื่น                                   | `INVALID_REQUEST`               |  400 | ไม่ จนกว่าจะแก้ input                            |
| asset ID ว่าง/ผิดกฎ                                           | `INVALID_ASSET_ID`              |  400 | ไม่ จนกว่าจะแก้ input                            |
| ไม่มีภาพ                                                      | `FILE_REQUIRED`                 |  400 | ไม่ จนกว่าจะมีภาพ                                |
| base64 ผิดหรือภาพเสียที่ตรวจพบ                                | `INVALID_FILE`                  |  400 | ไม่ จนกว่าจะแก้ไฟล์                              |
| body เกิน 14 MiB                                              | `PAYLOAD_TOO_LARGE`             |  413 | ไม่ จนกว่าจะลด payload                           |
| bytes หลัง decode เกิน 10 MiB                                 | `FILE_TOO_LARGE`                |  413 | ไม่ จนกว่าจะลดภาพ                                |
| signature ไม่ใช่ JPEG/PNG                                     | `UNSUPPORTED_IMAGE`             |  415 | ไม่ จนกว่าจะใช้ภาพที่รองรับ                      |
| signature ไม่ตรง `mimeType`                                   | `UNSUPPORTED_FILE`              |  415 | ไม่ จนกว่าจะแก้ MIME/ไฟล์                        |
| คิวเต็มหรือรอนานเกิน 10 วินาที                                | `BUSY`                          |  429 | รอบถัดไป หลัง `Retry-After`                      |
| Gemini ตอบ 429                                                | `AI_RATE_LIMITED`               |  429 | รอบถัดไป หลัง `Retry-After`                      |
| Gemini timeout/408 หรือครบ deadline ก่อนเขียน                 | `AI_TIMEOUT` / `IMPORT_TIMEOUT` |  504 | รอบถัดไป                                         |
| Gemini ส่ง JSON/schema ผิดหรือเกิน 1 candidate                | `AI_INVALID_RESPONSE`           |  502 | รอบถัดไป                                         |
| Gemini 4xx อื่นที่ไม่ได้พิสูจน์ว่าเป็น input ผิด              | `AI_UPSTREAM_ERROR`             |  502 | รอบถัดไป; แจ้งเหตุให้ operator ตรวจ config/model |
| Gemini network/5xx                                            | `AI_UNAVAILABLE`                |  503 | รอบถัดไป                                         |
| Ledger/DB เชื่อมต่อไม่ได้หรือ timeout                         | `PERSISTENCE_UNAVAILABLE`       |  503 | รอบถัดไปด้วย asset ID เดิม                       |
| Ledger/DB ล้มเหลวอื่น รวม conflict ที่ตรวจแล้วไม่ใช่ key เดิม | `PERSISTENCE_FAILED`            |  500 | รอบถัดไปด้วย asset ID เดิม; แจ้ง operator        |
| defect ที่ไม่คาดคิด                                           | `IMPORT_FAILED`                 |  500 | รอบถัดไป; แจ้ง operator                          |

Config ที่ขาดหรือรูปแบบผิดต้องทำให้ server startup ล้มเหลวก่อนรับคำขอ ตาม ticket “ออกแบบขอบเขต Effect สำหรับ Import Feature”; หาก Google ปฏิเสธ key/model ตอนเรียกจริง ให้จัดเป็น `AI_UPSTREAM_ERROR` และแจ้ง operator. การตรวจ dedupe อ่านฐานข้อมูลล้มเหลวต้องเป็น persistence error ก่อนเรียก Gemini. Unique conflict จะแปลงเป็น `skipped: duplicate` **เฉพาะ** เมื่อตรวจผ่าน Ledger อีกครั้งแล้วพบ `slip:<assetId>` ของผู้ใช้คนเดิม รวม soft-delete; conflict อื่นห้ามกลายเป็น `skipped`. ผล AI ที่ถูกต้องแต่ไม่มีรายการหรือข้อมูลไม่ครบต้องคืน `skipped` ตามสัญญา แม้มี warnings/issues.

**Retry policy:** server ไม่ retry Gemini หรือ Ledger อัตโนมัติ และตั้ง SDK เป็น no-retry. Home autoScan ในงาน client ภายหลังลองเฉพาะ `BUSY`, `AI_RATE_LIMITED` และ 5xx/504 ใน **รอบสแกนถัดไป** ไม่วนยิงซ้ำทันทีในรอบเดียว; ใช้ asset ID เดิมเสมอ. เว้นอย่างน้อย 30 วินาทีก่อนลองอีกครั้ง แล้วเพิ่มช่วงรอแบบ exponential พร้อม jitter เมื่อผิดซ้ำต่อ asset สูงสุด 15 นาที; สำหรับ 429 ให้เคารพ `Retry-After` ที่มากกว่าช่วงรอนี้ (ตรวจค่าก่อนใช้). 401/400/413/415 และ `skipped` ไม่ auto retry รูปเดิมที่ไม่เปลี่ยน. หลายรูปยังเป็น best effort แยกคำขอ; error ของรูปหนึ่งไม่ย้อนรายการของรูปอื่น.

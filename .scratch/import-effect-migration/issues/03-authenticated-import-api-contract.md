# กำหนดสัญญา API นำเข้าที่บันทึกอัตโนมัติ

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: 01, 02

## Question

API สลิปใหม่สำหรับ Home autoScan ควรมี operation, path, input, output และ error แบบใด เมื่อรับภาพหนึ่งรูป ต้องเข้าสู่ระบบและบันทึกอัตโนมัติ? ระบุข้อมูล asset ID สำหรับกันส่งซ้ำ ผลสร้าง/ข้าม/warning, การแปลงไฟล์, model option และข้อจำกัดขนาด โดยอนุญาตให้เปลี่ยนสัญญาเดิมที่ `apps/native` ใช้อยู่ และกำหนดขอบเขตการเรียกจาก flow อื่นให้ชัด

## Answer

API ใหม่คือ oRPC operation `import.autoImportSlip` ที่ `POST /import/slip/auto-import` คำว่า _import_ ในชื่อนี้หมายถึงอ่านสลิป **และบันทึก `FinanceTransaction` จริง** ในคำขอเดียว ไม่ใช่การสแกนเพื่อคืน candidate ให้ review. ใช้ `protectedProcedure`; ต้องมี session และใช้ `userId` จาก session เท่านั้น. API เดิม `import.slip` ที่ `POST /import/slip` และ statement/PDF จะยุติเมื่อ cutover ตาม ticket “กำหนดหลักฐานความถูกต้องและการตัดระบบ Import เดิม”. หนึ่งคำขอรับหนึ่งรูปและสร้างได้ไม่เกินหนึ่งรายการ. ผู้เรียกที่ออกแบบไว้คือ Home autoScan; หน้า plan, review และ import ไม่เรียก operation นี้. การแก้ `apps/native` อยู่นอกขอบเขต migration รอบนี้ และยอมให้ client เดิมใช้ API ใหม่ไม่ได้ชั่วคราว.

**Input** เป็น object แคบ ๆ: `{ assetId: string, fileBase64: string, mimeType: "image/jpeg" | "image/png" }`. `assetId` ต้องไม่ว่างและต้องคงเดิมเมื่อส่งรูปเดิมซ้ำ; server สร้าง `dedupeKey` เป็น `slip:<assetId>` เอง และ uniqueness ผูกกับผู้ใช้ตามคำตอบของ ticket “กำหนดเจ้าของการบันทึกและผลลัพธ์เมื่อบันทึกได้บางรายการ”. ไม่รับ `userId`, `dedupeKey`, `source`, `categoryId`, device-local URI, PDF password หรือ model override จาก client. Server เลือก Gemini model จาก configuration. รูปที่บันทึกมี `source = "slip"`, `categoryId = null` และไม่มี `slipImageUri` ฝั่ง server; client ในงานตามมาผูกรูปในเครื่องกับ transaction ID ที่ตอบกลับได้. การจัดหมวดหมู่เป็นหน้าที่ของผู้ใช้: เอาการอนุมาน category ออกจาก auto-import flow โดยไม่วางงานเพิ่ม AI enrichment ภายหลัง.

`fileBase64` เป็น base64 ของไฟล์จริงโดยไม่มี data-URI prefix. รับ JPEG/PNG และตรวจ signature ให้ตรง `mimeType`; ขนาดไฟล์หลัง decode สูงสุด 10 MiB และ HTTP JSON payload สูงสุด 14 MiB ตามเพดานเดิม โดยย้าย body limit ไป path ใหม่ตอน cutover. Client ส่งไฟล์ต้นฉบับถ้าอยู่ใต้เพดาน; resize/compression เฉพาะเมื่อจำเป็นเพื่อผ่านเพดาน โดยรักษาความชัดของตัวหนังสือบนสลิป. Server ไม่บังคับ JPEG conversion หรือการย่อภาพทุกคำขอ. ขนาด, timeout และ concurrency ในระดับการบังคับใช้/การทดสอบยังอยู่ใน ticket “กำหนดนโยบายทรัพยากรและความล้มเหลวของ Import”.

**ผลสำเร็จ** เป็น tagged result ที่ client อ่านผลสุดท้ายได้ทันที:

```ts
type AutoImportSlipResult =
  | { status: "created"; transactionId: string; warnings: string[] }
  | {
      status: "skipped";
      reason: "duplicate" | "no_candidate" | "incomplete_candidate";
      reasons: string[];
      warnings: string[];
    };
```

`reasons` อธิบายเหตุผลรายรูป โดยเฉพาะฟิลด์ที่ขาดหรือใช้ไม่ได้เมื่อ `incomplete_candidate`; `warnings` รวมคำเตือนระดับเอกสารและ `issues` จาก AI แม้รายการจะบันทึกสำเร็จ. ไม่มี `candidate`, `confidence`, คะแนน OCR หรือสถานะ `review` ในผลลัพธ์ใหม่. กรณีไม่พบรายการ, candidate ไม่พร้อมบันทึก หรือพบ `dedupeKey` เดิม รวมถึงรายการที่ soft-delete แล้ว ให้ตอบ `skipped` ไม่ใช่ error. กรณีสร้างสำเร็จคืน ID เพื่อให้ client ผูกรูปในเครื่องและนับรายการสร้างใหม่; `skipped` ไม่นับเป็นรายการสร้าง.

**Error contract** ใช้ oRPC error ที่มี HTTP status และ machine-readable `code`; client ตัดสินใจลองใหม่จาก code ไม่อ่านข้อความภาษาไทย. กลุ่มไม่ควรลองรูปเดิมซ้ำโดยไม่แก้ input คือ `UNAUTHORIZED` (401), `INVALID_ASSET_ID`/`FILE_REQUIRED`/`INVALID_FILE` (400), `FILE_TOO_LARGE`/`PAYLOAD_TOO_LARGE` (413), และ `UNSUPPORTED_IMAGE`/`UNSUPPORTED_FILE` (415). กลุ่มที่ให้ Home autoScan ลองรูปนั้นใหม่ในรอบถัดไปคือ `BUSY`/`AI_RATE_LIMITED` (429), `AI_INVALID_RESPONSE` หรือ upstream failure (502/503), และ persistence/system failure (5xx). ภาพที่ decode ได้แต่ไม่พบธุรกรรมเป็น `skipped: no_candidate`; ความล้มเหลวของการอ่านหรือเขียนจากระบบห้ามแปลงเป็น `skipped`. Ticket “กำหนดนโยบายทรัพยากรและความล้มเหลวของ Import” จะกำหนด code/timeout/retry policy ของความล้มเหลวเชิงทรัพยากรและ upstream ให้ละเอียด โดยรักษาการแบ่ง domain outcome กับ request/system error นี้.

การเชื่อมระบบต้องเอาข้อยกเว้นที่ทำให้ import path เดิมไม่โหลด session ใน server context ออกหรือปรับให้ path ใหม่นี้โหลด session ก่อนใช้ `protectedProcedure`; เป็นเกณฑ์ cutover ของ ticket “กำหนดหลักฐานความถูกต้องและการตัดระบบ Import เดิม”.

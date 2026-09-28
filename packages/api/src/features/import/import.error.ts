import { Schema } from "effect";

export const importErrors = {
  UNAUTHORIZED: { status: 401, message: "กรุณาเข้าสู่ระบบ" },
  INVALID_REQUEST: { status: 400, message: "คำขอไม่ถูกต้อง" },
  INVALID_ASSET_ID: { status: 400, message: "รหัสภาพไม่ถูกต้อง" },
  FILE_REQUIRED: { status: 400, message: "กรุณาเลือกไฟล์" },
  INVALID_FILE: { status: 400, message: "ข้อมูลภาพไม่ถูกต้องหรือเสียหาย" },
  PAYLOAD_TOO_LARGE: { status: 413, message: "คำขอมีขนาดเกินที่กำหนด" },
  FILE_TOO_LARGE: { status: 413, message: "ภาพมีขนาดเกิน 10 MiB" },
  UNSUPPORTED_IMAGE: { status: 415, message: "รองรับเฉพาะภาพ JPEG และ PNG" },
  UNSUPPORTED_FILE: { status: 415, message: "ชนิดไฟล์ไม่ตรงกับข้อมูลภาพ" },
  BUSY: { status: 429, message: "ระบบกำลังอ่านภาพอื่น กรุณาลองใหม่ภายหลัง" },
  AI_RATE_LIMITED: { status: 429, message: "บริการอ่านภาพมีคำขอมาก กรุณาลองใหม่ภายหลัง" },
  AI_INVALID_RESPONSE: { status: 502, message: "ผลการอ่านภาพไม่สมบูรณ์" },
  AI_UPSTREAM_ERROR: { status: 502, message: "บริการอ่านภาพตอบกลับไม่สำเร็จ" },
  AI_UNAVAILABLE: { status: 503, message: "บริการอ่านภาพไม่พร้อมใช้งาน" },
  PERSISTENCE_UNAVAILABLE: { status: 503, message: "ฐานข้อมูลไม่พร้อมใช้งาน" },
  AI_TIMEOUT: { status: 504, message: "บริการอ่านภาพใช้เวลานานเกินกำหนด" },
  IMPORT_TIMEOUT: { status: 504, message: "การนำเข้าใช้เวลานานเกินกำหนด" },
  PERSISTENCE_FAILED: { status: 500, message: "บันทึกรายการไม่สำเร็จ" },
  IMPORT_FAILED: { status: 500, message: "นำเข้าภาพไม่สำเร็จ" },
} as const;

export class ImportError extends Schema.TaggedError<ImportError>()("ImportError", {
  code: Schema.Literals(Object.keys(importErrors) as [keyof typeof importErrors, ...(keyof typeof importErrors)[]]),
  retryAfter: Schema.optional(Schema.Int),
}) {}

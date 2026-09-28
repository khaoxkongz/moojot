import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { publicProcedure } from "../shared/orpc/base";
import { analyzeImport } from "./gemini";
import { ImportError, type ImportInput, type ImportSource } from "./types";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MAX_ACTIVE_IMPORTS = 2;

const slipInput = z.object({
  fileBase64: z.string(),
  mimeType: z.enum(["image/png", "image/jpeg"]),
  model: z.string().optional(),
});

const statementInput = z.object({
  fileBase64: z.string(),
  mimeType: z.literal("application/pdf"),
  password: z.string().max(256).optional(),
});

let activeImports = 0;

function detectMimeType(bytes: Uint8Array, source: ImportSource): ImportInput["mimeType"] {
  if (source === "statement") {
    if (Buffer.from(bytes.subarray(0, 5)).toString("ascii") === "%PDF-") {
      return "application/pdf";
    }
    throw new ImportError(415, "UNSUPPORTED_PDF", "รองรับเฉพาะไฟล์ PDF");
  }

  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (pngSignature.every((byte, index) => bytes[index] === byte)) return "image/png";
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  throw new ImportError(415, "UNSUPPORTED_IMAGE", "รองรับเฉพาะภาพ PNG และ JPEG");
}

function decodeFile(fileBase64: string, source: ImportSource, suppliedMimeType: ImportInput["mimeType"]): Uint8Array {
  const maxBytes = source === "slip" ? MAX_IMAGE_BYTES : MAX_PDF_BYTES;
  if (!fileBase64) throw new ImportError(400, "FILE_REQUIRED", "กรุณาเลือกไฟล์");
  if (fileBase64.length > Math.ceil(maxBytes / 3) * 4) {
    throw new ImportError(413, "FILE_TOO_LARGE", "ไฟล์มีขนาดเกินที่กำหนด");
  }
  if (
    fileBase64.length % 4 !== 0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(fileBase64)
  ) {
    throw new ImportError(400, "INVALID_FILE", "ข้อมูลไฟล์ไม่ถูกต้อง");
  }

  const bytes = Buffer.from(fileBase64, "base64");
  if (bytes.byteLength > maxBytes) {
    throw new ImportError(413, "FILE_TOO_LARGE", "ไฟล์มีขนาดเกินที่กำหนด");
  }
  if (detectMimeType(bytes, source) !== suppliedMimeType) {
    throw new ImportError(415, "UNSUPPORTED_FILE", "ชนิดไฟล์ไม่ตรงกับข้อมูลที่ส่งมา");
  }
  return bytes;
}

async function runImport(
  source: ImportSource,
  input: {
    fileBase64: string;
    mimeType: ImportInput["mimeType"];
    password?: string;
    model?: string;
  },
  apiKey: string
) {
  if (activeImports >= MAX_ACTIVE_IMPORTS) {
    throw new ORPCError("BUSY", {
      status: 429,
      message: "ระบบกำลังอ่านเอกสารอื่น กรุณาลองใหม่อีกครั้ง",
    });
  }
  activeImports += 1;
  try {
    const bytes = decodeFile(input.fileBase64, source, input.mimeType);
    return await analyzeImport(
      {
        source,
        bytes,
        mimeType: input.mimeType,
        ...(input.password ? { password: input.password } : {}),
        ...(input.model ? { model: input.model } : {}),
      },
      apiKey
    );
  } catch (error) {
    if (error instanceof ORPCError) throw error;
    if (error instanceof ImportError) {
      throw new ORPCError(error.code, { status: error.status, message: error.message });
    }
    throw new ORPCError("IMPORT_FAILED", {
      status: 502,
      message: "อ่านเอกสารไม่สำเร็จ กรุณาลองใหม่",
    });
  } finally {
    activeImports -= 1;
  }
}

export const importRouter = {
  slip: publicProcedure
    .route({ method: "POST", path: "/import/slip" })
    .input(slipInput)
    .handler(({ input, context }) => runImport("slip", input, context.geminiApiKey)),
  statement: publicProcedure
    .route({ method: "POST", path: "/import/statement" })
    .input(statementInput)
    .handler(({ input, context }) => runImport("statement", input, context.geminiApiKey)),
};

import type { AppRouterClient } from "@moojot/api/features/index";
import { createORPCClient, ORPCError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { SimpleCsrfProtectionLinkPlugin } from "@orpc/client/plugins";
import { File as ExpoFile } from "expo-file-system";

import { getServerBaseUrl } from "@/utils/server-url";
import type { ImportResult } from "@/features/imports/types";

export interface FileForImport {
  uri: string;
  mimeType: string;
  webFile?: File;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_PDF_BYTES = 20 * 1024 * 1024;

async function readFileBase64(file: FileForImport, maxBytes: number): Promise<string> {
  if (process.env.EXPO_OS === "web") {
    const blob = file.webFile ?? (await fetch(file.uri).then((response) => response.blob()));
    if (!blob || !blob.size) throw new Error("ไม่สามารถเปิดไฟล์ที่เลือกได้");
    if (blob.size > maxBytes) throw new Error("ไฟล์มีขนาดเกินที่กำหนด");
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("ไม่สามารถเปิดไฟล์ที่เลือกได้"));
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") return reject(new Error("ไม่สามารถเปิดไฟล์ที่เลือกได้"));
        const comma = result.indexOf(",");
        if (comma < 0) return reject(new Error("ไม่สามารถเปิดไฟล์ที่เลือกได้"));
        resolve(result.slice(comma + 1));
      };
      reader.readAsDataURL(blob);
    });
  }

  const nativeFile = new ExpoFile(file.uri);
  if (!nativeFile.size) throw new Error("ไม่สามารถเปิดไฟล์ที่เลือกได้");
  if (nativeFile.size > maxBytes) throw new Error("ไฟล์มีขนาดเกินที่กำหนด");
  return nativeFile.base64();
}

export async function requestImport(
  source: "slip" | "statement",
  file: FileForImport,
  password?: string,
  model?: string
): Promise<ImportResult> {
  const baseUrl = getServerBaseUrl();
  const fileBase64 = await readFileBase64(file, source === "slip" ? MAX_IMAGE_BYTES : MAX_PDF_BYTES);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 180000);
  try {
    const link = new RPCLink({
      url: `${baseUrl.replace(/\/+$/, "")}/rpc`,
      plugins: [new SimpleCsrfProtectionLinkPlugin()],
      fetch: (request, init) => fetch(request, { ...init, signal: controller.signal }),
    });
    const client: AppRouterClient = createORPCClient(link);
    let data: ImportResult;
    if (source === "slip") {
      const mimeType = file.mimeType;
      if (mimeType !== "image/jpeg" && mimeType !== "image/png") throw new Error("รองรับเฉพาะภาพ PNG และ JPEG");
      data = await client.import.slip({ fileBase64, mimeType, ...(model ? { model } : {}) });
    } else {
      data = await client.import.statement({
        fileBase64,
        mimeType: "application/pdf",
        ...(password ? { password } : {}),
      });
    }
    if (!data || data.status !== "review" || !Array.isArray(data.candidates))
      throw new Error("ผลลัพธ์จากเซิร์ฟเวอร์ไม่ถูกต้อง");
    return data;
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError") throw new Error("ใช้เวลาอ่านไฟล์นานเกินไป ลองไฟล์ขนาดเล็กลง");
    if (cause instanceof ORPCError) {
      const detail = cause.data as { message?: unknown } | undefined;
      if (typeof detail?.message === "string") throw new Error(detail.message);
    }
    if (cause instanceof TypeError) throw new Error("ติดต่อเซิร์ฟเวอร์หมูจดไม่ได้ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง");
    throw cause;
  } finally {
    clearTimeout(timer);
  }
}

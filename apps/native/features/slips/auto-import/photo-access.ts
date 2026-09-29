export type PhotoAccess = "all" | "limited" | "denied" | "permission-required" | "unsupported";

export interface PhotoAccessPrompt {
  /** The system prompt can only appear before the first answer; after that, full access is granted in Settings. */
  action: "request" | "settings";
  message: string;
  label: string;
  hint: string;
}

const manualEntry = "ระหว่างนี้แตะ “จดเพิ่ม” เพื่อจดเองได้";
const openSettings = { action: "settings", label: "ไปที่การตั้งค่า", hint: "เปิดการตั้งค่าของหมูจดในเครื่อง" } as const;

const prompts: Partial<Record<PhotoAccess, PhotoAccessPrompt>> = {
  "permission-required": {
    action: "request",
    message: `อนุญาตให้หมูเข้าถึงรูปภาพทั้งหมดเพื่ออ่านสลิปอัตโนมัติ ${manualEntry}`,
    label: "อนุญาตเข้าถึงรูปภาพ",
    hint: "แสดงคำขอสิทธิ์รูปภาพของระบบ",
  },
  denied: { ...openSettings, message: `เปิดสิทธิ์เข้าถึงรูปภาพทั้งหมดเพื่อให้หมูอ่านสลิปอัตโนมัติ ${manualEntry}` },
  limited: {
    ...openSettings,
    message: `หมูเห็นรูปแค่บางส่วน เปิดสิทธิ์รูปภาพทั้งหมดเพื่ออ่านสลิปอัตโนมัติ ${manualEntry}`,
  },
};

/**
 * What Home asks of a person whose photo permission pauses automatic reading, or null when there is nothing to ask:
 * reading is allowed, the permission is not known yet, or this platform has no photo library.
 */
export function photoAccessPrompt(access: PhotoAccess | null): PhotoAccessPrompt | null {
  return (access && prompts[access]) ?? null;
}

import type { ImportCandidate, ImportResult, ImportSource, TransactionKind } from "./types";

export const MAX_CANDIDATES = 200;

// Keep the model schema small and validate the response again on the server.
export const modelResponseSchema = {
  type: "object",
  properties: {
    candidates: {
      type: "array",
      description: "Transactions visible in the supplied document, at most 200",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["expense", "income", "transfer"] },
          amountSatang: { type: ["integer", "null"] },
          occurredOn: { type: ["string", "null"] },
          title: { type: "string" },
          bank: { type: ["string", "null"] },
          cardName: { type: ["string", "null"] },
          cardLast4: { type: ["string", "null"] },
          issues: { type: "array", items: { type: "string" } },
        },
        required: ["kind", "amountSatang", "occurredOn", "title", "bank", "cardName", "cardLast4", "issues"],
      },
    },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["candidates", "warnings"],
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textOrNull(value: unknown, limit: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ").slice(0, limit);
  return text || null;
}

function validIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined || year < 1900 || year > 2100) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function confidenceFor(candidate: Omit<ImportCandidate, "confidence">): number {
  let value = 0.11;
  if (candidate.amountSatang !== null) value += 0.32;
  if (candidate.occurredOn !== null) value += 0.25;
  if (candidate.title !== "รายการจากสลิป" && candidate.title !== "รายการจากใบแจ้งยอด") value += 0.14;
  if (candidate.bank) value += 0.07;
  if (candidate.cardLast4) value += 0.04;
  value += 0.06;
  value -= Math.min(candidate.issues.length, 4) * 0.04;
  return Math.max(0.05, Math.min(0.95, Math.round(value * 100) / 100));
}

function normalizeCandidate(raw: unknown, source: ImportSource): ImportCandidate | null {
  if (!isRecord(raw) || !["expense", "income", "transfer"].includes(String(raw.kind))) return null;
  const kind = raw.kind as TransactionKind;
  const issues = Array.isArray(raw.issues)
    ? raw.issues
        .map((issue) => textOrNull(issue, 160))
        .filter((issue): issue is string => !!issue)
        .slice(0, 8)
    : [];

  const amountSatang =
    typeof raw.amountSatang === "number" && Number.isSafeInteger(raw.amountSatang) && raw.amountSatang > 0
      ? raw.amountSatang
      : null;
  if (amountSatang === null) issues.push("ไม่พบยอดเงินที่มั่นใจได้ กรุณาตรวจสอบยอด");

  const occurredOn = validIsoDate(raw.occurredOn) ? raw.occurredOn : null;
  if (occurredOn === null) issues.push("ไม่พบวันที่ที่มั่นใจได้ กรุณาตรวจสอบวันที่");

  const title = textOrNull(raw.title, 100) ?? (source === "slip" ? "รายการจากสลิป" : "รายการจากใบแจ้งยอด");
  if (title === "รายการจากสลิป" || title === "รายการจากใบแจ้งยอด") issues.push("ไม่พบชื่อร้านค้าหรือรายละเอียด");

  const bank = textOrNull(raw.bank, 80);
  const cardName = textOrNull(raw.cardName, 80);
  const cardLast4 = typeof raw.cardLast4 === "string" && /^\d{4}$/.test(raw.cardLast4) ? raw.cardLast4 : null;
  if (raw.cardLast4 != null && !cardLast4) issues.push("เลขท้ายบัตรไม่ชัดเจน กรุณาตรวจสอบ");

  const candidate = {
    kind,
    amountSatang,
    occurredOn,
    title,
    bank,
    cardName,
    cardLast4,
    source,
    issues: [...new Set(issues)].slice(0, 10),
  };
  return { ...candidate, confidence: confidenceFor(candidate) };
}

export function normalizeModelResult(
  raw: unknown,
  source: ImportSource
): Pick<ImportResult, "candidates" | "warnings"> {
  if (!isRecord(raw) || !Array.isArray(raw.candidates) || !Array.isArray(raw.warnings)) {
    throw new Error("Invalid Gemini response structure");
  }
  const warnings = raw.warnings
    .map((warning) => textOrNull(warning, 200))
    .filter((warning): warning is string => !!warning)
    .slice(0, 10);
  const candidates = raw.candidates
    .slice(0, source === "slip" ? 1 : MAX_CANDIDATES)
    .map((candidate) => normalizeCandidate(candidate, source))
    .filter((candidate): candidate is ImportCandidate => candidate !== null);
  if (raw.candidates.length > candidates.length && raw.candidates.length > MAX_CANDIDATES)
    warnings.push(`แสดงเพียง ${MAX_CANDIDATES} รายการแรก`);
  if (candidates.length === 0)
    warnings.push(
      source === "slip" ? "ไม่พบรายการบนสลิป กรุณาเพิ่มรายการเอง" : "ไม่พบรายการที่อ่านได้ กรุณาตรวจสอบเอกสารหรือเพิ่มรายการเอง"
    );
  return { candidates, warnings: [...new Set(warnings)] };
}

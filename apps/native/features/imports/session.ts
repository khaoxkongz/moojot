import type { ImportResult } from "@/features/imports/types";

let current: ImportResult | null = null;

export function setImportSession(result: ImportResult) {
  current = result;
}

export function getImportSession() {
  return current;
}

export function clearImportSession() {
  current = null;
}

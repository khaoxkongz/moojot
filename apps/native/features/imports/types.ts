import type { TransactionKind } from "@/types/finance";

export interface ImportCandidate {
  kind: TransactionKind;
  amountSatang: number | null;
  occurredOn: string | null;
  title: string;
  bank: string | null;
  cardName: string | null;
  cardLast4: string | null;
  source: "slip" | "statement";
  confidence: number;
  issues: string[];
}

export interface ImportResult {
  source: "slip" | "statement";
  status: "review";
  candidates: ImportCandidate[];
  warnings: string[];
  /** Client-side URI of the selected source photo. The image bytes are not stored in the database. */
  slipImageUri?: string | null;
}

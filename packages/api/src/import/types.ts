export type ImportSource = "slip" | "statement";
export type TransactionKind = "expense" | "income" | "transfer";

export interface ImportCandidate {
  kind: TransactionKind;
  amountSatang: number | null;
  occurredOn: string | null;
  title: string;
  bank: string | null;
  cardName: string | null;
  cardLast4: string | null;
  source: ImportSource;
  /** Backward-compatible field completeness heuristic, not calibrated model accuracy. */
  confidence: number;
  issues: string[];
}

export interface ImportResult {
  source: ImportSource;
  status: "review";
  candidates: ImportCandidate[];
  warnings: string[];
  pagesRead?: number;
  /** Retained for clients using the old OCR response. True when image input was used. */
  ocrUsed: boolean;
  /** Gemini does not provide a calibrated OCR confidence score. */
  ocrConfidence: null;
}

export interface ImportInput {
  source: ImportSource;
  bytes: Uint8Array;
  mimeType: "image/png" | "image/jpeg" | "application/pdf";
  password?: string;
  model?: string;
}

export type AnalyzeImport = (input: ImportInput, apiKey: string) => Promise<ImportResult>;

export class ImportError extends Error {
  constructor(
    public readonly status: 400 | 413 | 415 | 422 | 429 | 502 | 503,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ImportError";
  }
}

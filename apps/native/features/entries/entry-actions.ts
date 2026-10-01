import type { AppRouterClient } from "@moojot/api/features/index";
import { ORPCError } from "@orpc/client";

import type { FinanceTransaction, TransactionInput } from "../../types/finance";

type LedgerClient = Pick<
  AppRouterClient["ledger"],
  "createTransaction" | "updateTransaction" | "deleteTransaction" | "restoreTransaction"
>;

/** A failure the editor or toast can show as it is. */
export class EntryActionError extends Error {
  override name = "EntryActionError";
}

const NOT_FOUND = "ไม่พบรายการนี้แล้ว";

function failure(action: string, cause: unknown): EntryActionError {
  if (cause instanceof EntryActionError) return cause;
  if (cause instanceof ORPCError) {
    if (cause.code === "NOT_FOUND") return new EntryActionError(NOT_FOUND, { cause });
    if (cause.code === "BAD_REQUEST" || cause.code === "CONFLICT")
      return new EntryActionError(`${action}ไม่สำเร็จ ข้อมูลบางอย่างไม่ถูกต้อง ลองแก้แล้วบันทึกอีกครั้ง`, { cause });
    if (cause.code === "UNAUTHORIZED") return new EntryActionError(`${action}ไม่สำเร็จ ลองเข้าสู่ระบบอีกครั้ง`, { cause });
    return new EntryActionError(`${action}ไม่สำเร็จ ระบบมีปัญหา ลองอีกครั้ง`, { cause });
  }
  return new EntryActionError(`${action}ไม่สำเร็จ เชื่อมต่อไม่ได้ ลองอีกครั้ง`, { cause });
}

/**
 * Saving, deleting and restoring an entry from the editor. Deleting is immediate and restoring brings back the same
 * entry with the same ID and fields from the server, never a copy. Every failure is an EntryActionError in Thai.
 */
export function createEntryActions(ledger: LedgerClient) {
  return {
    /** Saves a draft that `checkEntryDraft` accepted: a new manual entry, or the entry with this ID. */
    async save({ id, input }: { id?: string; input: TransactionInput }): Promise<FinanceTransaction> {
      try {
        return id
          ? await ledger.updateTransaction({ id, patch: input })
          : await ledger.createTransaction({ ...input, source: "manual" });
      } catch (cause) {
        throw failure("บันทึก", cause);
      }
    },

    async remove(id: string): Promise<void> {
      let deleted: boolean;
      try {
        deleted = await ledger.deleteTransaction({ id });
      } catch (cause) {
        throw failure("ลบรายการ", cause);
      }
      if (!deleted) throw new EntryActionError(NOT_FOUND);
    },

    async restore(id: string): Promise<void> {
      let restored: boolean;
      try {
        restored = await ledger.restoreTransaction({ id });
      } catch (cause) {
        throw failure("เอากลับคืน", cause);
      }
      if (!restored) throw new EntryActionError("เอากลับคืนไม่ได้ รายการนี้อาจถูกเอากลับคืนหรือลบไปแล้ว");
    },
  };
}

export type EntryActions = ReturnType<typeof createEntryActions>;

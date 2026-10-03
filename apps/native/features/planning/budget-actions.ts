import type { AppRouterClient } from "@moojot/api/features/index";
import { ORPCError } from "@orpc/client";

import type { Budget } from "../../types/finance";

type PlanningClient = Pick<AppRouterClient["planning"], "upsertBudget" | "deleteBudget" | "restoreBudget">;
type SaveInput = Parameters<PlanningClient["upsertBudget"]>[0];

/** A failure the budget form or toast can show as it is. */
export class BudgetActionError extends Error {
  override name = "BudgetActionError";
}

const NOT_FOUND = "ไม่พบงบนี้แล้ว อาจถูกลบไปแล้ว";

function failure(action: string, cause: unknown, conflict?: string): BudgetActionError {
  if (cause instanceof ORPCError) {
    if (cause.code === "NOT_FOUND") return new BudgetActionError(NOT_FOUND, { cause });
    // Without a reason of its own, CONFLICT means another request changed the same budget at that moment.
    if (cause.code === "CONFLICT")
      return new BudgetActionError(conflict ?? `${action}ไม่สำเร็จ งบนี้เพิ่งถูกเปลี่ยนจากอีกที่ ลองอีกครั้ง`, { cause });
    if (cause.code === "BAD_REQUEST")
      return new BudgetActionError(`${action}ไม่สำเร็จ ข้อมูลบางอย่างไม่ถูกต้อง ลองแก้แล้วบันทึกอีกครั้ง`, { cause });
    if (cause.code === "UNAUTHORIZED") return new BudgetActionError(`${action}ไม่สำเร็จ ลองเข้าสู่ระบบอีกครั้ง`, { cause });
    return new BudgetActionError(`${action}ไม่สำเร็จ ระบบมีปัญหา ลองอีกครั้ง`, { cause });
  }
  return new BudgetActionError(`${action}ไม่สำเร็จ เชื่อมต่อไม่ได้ ลองอีกครั้ง`, { cause });
}

/**
 * Saving, deleting and restoring a budget. Saving onto a target that has a budget replaces its limit; saving with `id`
 * edits that budget, moving it to a new target in one step. Deleting is immediate and returns the ID its undo needs;
 * restoring brings back the same budget from the server, never a copy. Every failure is a BudgetActionError in Thai.
 */
export function createBudgetActions(planning: PlanningClient) {
  return {
    async save(input: SaveInput): Promise<Budget> {
      try {
        return await planning.upsertBudget(input);
      } catch (cause) {
        throw failure("บันทึกงบ", cause);
      }
    },

    async remove(id: string): Promise<string> {
      try {
        return (await planning.deleteBudget({ id })).deletionId;
      } catch (cause) {
        throw failure("ลบงบ", cause);
      }
    },

    async restore(deletionId: string): Promise<void> {
      try {
        await planning.restoreBudget({ deletionId });
      } catch (cause) {
        throw failure("เอากลับคืน", cause, "เอากลับคืนไม่ได้ เดือนนี้ตั้งงบของเป้าหมายนี้ใหม่แล้ว หรือหมวดหรือแท็กของงบถูกลบไป");
      }
    },
  };
}

export type BudgetActions = ReturnType<typeof createBudgetActions>;

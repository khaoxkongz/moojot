import type { Database, Prisma } from "@moojot/db";
import { Context, Effect, Layer, Schema } from "effect";
import { activeTransactionWhere, satangToNumber } from "../../shared/finance/common";
import { dateInMonth, getPeriodBounds, getPeriodForDate, shiftPeriodKey, todayISO } from "../../shared/finance/dates";
import { PrismaProvider } from "../../providers/prisma.provider";
import { FinanceCategories } from "../../shared/finance/category.service";
import { FinanceSettings } from "../../shared/finance/settings.service";
import { planningInputs, recurringInput } from "./planning.schema";
import { deleteWithUndo, keepDeletion, restoreDeletion } from "../../shared/finance/deletions";
import {
  FinanceBadRequestError,
  FinanceConflictError,
  FinanceNotFoundError,
  financeOperation,
} from "../../shared/finance/error";

function mapBudget(row: {
  id: string;
  periodKey: string;
  categoryId: string | null;
  tagId: string | null;
  limitSatang: bigint;
  warningThresholdPercent: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    periodKey: row.periodKey,
    categoryId: row.categoryId,
    tagId: row.tagId,
    limitSatang: satangToNumber(row.limitSatang),
    warningThresholdPercent: row.warningThresholdPercent,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** What deleting a budget keeps, so restoring it brings back the same ID, target, limit and dates. */
const BudgetSnapshot = Schema.Struct({
  id: Schema.String,
  periodKey: Schema.String,
  scopeKey: Schema.String,
  categoryId: Schema.NullOr(Schema.String),
  tagId: Schema.NullOr(Schema.String),
  /** Satang as a decimal string: JSON has no 64-bit integers. */
  limitSatang: Schema.String,
  warningThresholdPercent: Schema.Int,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

function budgetSnapshot(row: Parameters<typeof mapBudget>[0] & { scopeKey: string }) {
  return Schema.encodeSync(BudgetSnapshot)({
    id: row.id,
    periodKey: row.periodKey,
    scopeKey: row.scopeKey,
    categoryId: row.categoryId,
    tagId: row.tagId,
    limitSatang: row.limitSatang.toString(),
    warningThresholdPercent: row.warningThresholdPercent,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

function mapRecurring(row: {
  id: string;
  kind: string;
  amountSatang: bigint;
  title: string;
  note: string;
  bank: string | null;
  categoryId: string | null;
  tagIds: string[];
  dayOfMonth: number;
  startsOn: string;
  endsOn: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    kind: row.kind as "income" | "expense" | "transfer",
    amountSatang: satangToNumber(row.amountSatang),
    title: row.title,
    note: row.note,
    bank: row.bank,
    categoryId: row.categoryId,
    tagIds: row.tagIds,
    dayOfMonth: row.dayOfMonth,
    startsOn: row.startsOn,
    endsOn: row.endsOn,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Reads categories and tags: the database, or a transaction already open. */
type CategoryReader = Pick<Prisma.TransactionClient, "financeCategory" | "financeTag">;
/** The error a failed check throws: a bad request for a save, a conflict for a restore. */
type Refusal = (message: string) => Error;
const badRequest: Refusal = (message) => new FinanceBadRequestError({ message });
const conflict: Refusal = (message) => new FinanceConflictError({ message });

async function validateCategory(
  db: CategoryReader,
  userId: string,
  categoryId: string | null,
  kind: string,
  refuse: Refusal = badRequest
) {
  if (!categoryId) return;
  if (kind === "transfer") throw refuse("Transfers cannot have a category");
  const category = await db.financeCategory.findUnique({
    where: { userId_id: { userId, id: categoryId } },
    select: { kind: true },
  });
  if (!category || category.kind !== kind) throw refuse("Category kind does not match transaction kind");
}

async function validateTagIds(db: CategoryReader, userId: string, tagIds: string[], refuse: Refusal = badRequest) {
  if (!tagIds.length) return;
  const tags = await db.financeTag.findMany({
    where: { userId, id: { in: tagIds } },
    select: { id: true },
  });
  if (tags.length !== tagIds.length) throw refuse("Tag does not exist");
}

function budgetScopeKey(categoryId: string | null, tagId: string | null) {
  if (categoryId && tagId) {
    throw new FinanceBadRequestError({
      message: "A budget can target a category or a tag, not both",
    });
  }
  return categoryId ? `category:${categoryId}` : tagId ? `tag:${tagId}` : "all";
}

async function listBudgetsRaw(
  db: Database,
  userId: string,
  periodKey: string
): Promise<ReturnType<typeof mapBudget>[]> {
  const rows = await db.financeBudget.findMany({
    where: { userId, periodKey },
    orderBy: { scopeKey: "asc" },
  });
  return rows.map(mapBudget);
}

function monthsBetween(firstKey: string, lastKey: string): number {
  const [firstYear, firstMonth] = firstKey.split("-").map(Number) as [number, number];
  const [lastYear, lastMonth] = lastKey.split("-").map(Number) as [number, number];
  return (lastYear - firstYear) * 12 + lastMonth - firstMonth;
}

function makePlanningOperations(
  db: Database,
  categories: FinanceCategories["Service"],
  settings: FinanceSettings["Service"]
) {
  return {
    listBudgets: Effect.fn("PlanningService.listBudgets")(function* (
      userId: string,
      input: typeof planningInputs.listBudgets.Type
    ) {
      let periodKey = input?.periodKey;
      if (!periodKey) {
        const startDay = yield* settings.getMonthStartDay(userId);
        periodKey = getPeriodForDate(input?.asOf ?? todayISO(), startDay).periodKey;
      }
      return yield* financeOperation("listBudgets", () => listBudgetsRaw(db, userId, periodKey));
    }),

    upsertBudget: Effect.fn("PlanningService.upsertBudget")(function* (
      userId: string,
      input: typeof planningInputs.upsertBudget.Type
    ) {
      if (input.categoryId) yield* categories.ensureDefaults(userId);
      return yield* financeOperation("upsertBudget", async () => {
        const categoryId = input.categoryId ?? null;
        const tagId = input.tagId ?? null;
        const scopeKey = budgetScopeKey(categoryId, tagId);
        if (categoryId) await validateCategory(db, userId, categoryId, "expense");
        if (tagId) await validateTagIds(db, userId, [tagId]);
        const fields = {
          periodKey: input.periodKey,
          scopeKey,
          categoryId,
          tagId,
          limitSatang: BigInt(input.limitSatang),
          warningThresholdPercent: input.warningThresholdPercent ?? 80,
        };
        if (input.id) {
          // Editing keeps the budget's ID and month. A budget already set for the new target is removed in the same
          // step, kept as a deletion like any delete, so it can still be brought back.
          const id = input.id;
          const row = await db.$transaction(async (tx) => {
            const current = await tx.financeBudget.findFirst({ where: { id, userId }, select: { periodKey: true } });
            if (!current) throw new FinanceNotFoundError({ message: "Budget does not exist" });
            if (current.periodKey !== input.periodKey) {
              throw new FinanceBadRequestError({ message: "An edited budget stays in its own month" });
            }
            const replaced = await tx.financeBudget.findFirst({
              where: { userId, periodKey: input.periodKey, scopeKey, id: { not: id } },
            });
            if (replaced) {
              await tx.financeBudget.delete({ where: { id: replaced.id } });
              await keepDeletion(tx, {
                userId,
                kind: "budget",
                targetId: replaced.id,
                snapshot: budgetSnapshot(replaced),
              });
            }
            return tx.financeBudget.update({ where: { id }, data: fields });
          });
          return mapBudget(row);
        }
        const row = await db.financeBudget.upsert({
          where: { userId_periodKey_scopeKey: { userId, periodKey: input.periodKey, scopeKey } },
          create: {
            userId,
            periodKey: input.periodKey,
            scopeKey,
            categoryId,
            tagId,
            limitSatang: BigInt(input.limitSatang),
            warningThresholdPercent: input.warningThresholdPercent ?? 80,
          },
          update: {
            limitSatang: BigInt(input.limitSatang),
            warningThresholdPercent: input.warningThresholdPercent ?? 80,
          },
        });
        return mapBudget(row);
      });
    }),

    deleteBudget: Effect.fn("PlanningService.deleteBudget")(function* (
      userId: string,
      input: typeof planningInputs.deleteBudget.Type
    ) {
      return yield* deleteWithUndo(db, {
        userId,
        kind: "budget",
        targetId: input.id,
        remove: async (tx) => {
          const row = await tx.financeBudget.findFirst({ where: { id: input.id, userId } });
          if (!row) return null;
          await tx.financeBudget.delete({ where: { id: row.id } });
          return budgetSnapshot(row);
        },
      });
    }),

    restoreBudget: Effect.fn("PlanningService.restoreBudget")(function* (
      userId: string,
      input: typeof planningInputs.restoreBudget.Type
    ) {
      return yield* financeOperation("restoreBudget", () =>
        restoreDeletion(db, {
          userId,
          kind: "budget",
          deletionId: input.deletionId,
          current: async (tx, id) => {
            const row = await tx.financeBudget.findFirst({ where: { id, userId } });
            return row ? mapBudget(row) : null;
          },
          restore: async (tx, stored) => {
            const snapshot = Schema.decodeUnknownSync(BudgetSnapshot)(stored);
            const taken = await tx.financeBudget.findFirst({
              where: { userId, periodKey: snapshot.periodKey, scopeKey: snapshot.scopeKey },
              select: { id: true },
            });
            if (taken) {
              throw new FinanceConflictError({ message: "Another budget is set for this target now" });
            }
            // No budget for a name that is gone: the same checks as a save, refused as a conflict.
            await validateCategory(tx, userId, snapshot.categoryId, "expense", conflict);
            if (snapshot.tagId) await validateTagIds(tx, userId, [snapshot.tagId], conflict);
            const row = await tx.financeBudget.create({
              data: {
                ...snapshot,
                userId,
                limitSatang: BigInt(snapshot.limitSatang),
                createdAt: new Date(snapshot.createdAt),
                updatedAt: new Date(snapshot.updatedAt),
              },
            });
            return mapBudget(row);
          },
        })
      );
    }),

    getBudgetStatuses: Effect.fn("PlanningService.getBudgetStatuses")(function* (
      userId: string,
      input: typeof planningInputs.getBudgetStatuses.Type
    ) {
      const startDay = yield* settings.getMonthStartDay(userId);
      return yield* financeOperation("getBudgetStatuses", async () => {
        const key = input?.periodKey ?? getPeriodForDate(input?.asOf ?? todayISO(), startDay).periodKey;
        const bounds = getPeriodBounds(key, startDay);
        const [budgets, transactions] = await Promise.all([
          listBudgetsRaw(db, userId, key),
          db.financeTransaction.findMany({
            where: {
              userId,
              ...activeTransactionWhere,
              kind: "expense",
              occurredOn: { gte: bounds.from, lte: bounds.to },
            },
            select: { amountSatang: true, categoryId: true, tagIds: true },
          }),
        ]);
        return budgets.map((budget: ReturnType<typeof mapBudget>) => {
          const spent = transactions.reduce(
            (
              sum: bigint,
              transaction: {
                amountSatang: bigint;
                categoryId: string | null;
                tagIds: string[];
              }
            ) => {
              if (budget.categoryId && transaction.categoryId !== budget.categoryId) return sum;
              if (budget.tagId && !transaction.tagIds.includes(budget.tagId)) return sum;
              return sum + transaction.amountSatang;
            },
            0n
          );
          const spentSatang = satangToNumber(spent);
          const remainingSatang = satangToNumber(BigInt(budget.limitSatang) - spent);
          const percentUsed = (spentSatang / budget.limitSatang) * 100;
          return {
            budget,
            spentSatang,
            remainingSatang,
            percentUsed,
            /** At or past the warning percent; also true when over, so read isOverLimit first (ใกล้ครบงบ). */
            isNearLimit: percentUsed >= budget.warningThresholdPercent,
            /**
             * เกินงบ: spending is more than the limit. Spending exactly the limit is not over. (Before ticket 10 this
             * was true from 100%; no caller relied on that.)
             */
            isOverLimit: spent > BigInt(budget.limitSatang),
          };
        });
      });
    }),

    listRecurringRules: Effect.fn("PlanningService.listRecurringRules")(function* (userId: string) {
      return yield* financeOperation("listRecurringRules", async () => {
        const rows = await db.financeRecurringRule.findMany({
          where: { userId: userId },
          orderBy: [{ isActive: "desc" }, { dayOfMonth: "asc" }, { title: "asc" }],
        });
        return rows.map(mapRecurring);
      });
    }),

    createRecurringRule: Effect.fn("PlanningService.createRecurringRule")(function* (
      userId: string,
      input: typeof planningInputs.createRecurringRule.Type
    ) {
      if (input.categoryId) yield* categories.ensureDefaults(userId);
      return yield* financeOperation("createRecurringRule", async () => {
        const categoryId = input.categoryId ?? null;
        const tagIds = [...new Set(input.tagIds ?? [])];
        if (input.endsOn && input.endsOn < input.startsOn) {
          throw new FinanceBadRequestError({ message: "End date must not precede start date" });
        }
        await validateCategory(db, userId, categoryId, input.kind);
        await validateTagIds(db, userId, tagIds);
        const row = await db.financeRecurringRule.create({
          data: {
            userId,
            kind: input.kind,
            amountSatang: BigInt(input.amountSatang),
            title: input.title,
            note: input.note?.trim() ?? "",
            bank: input.bank?.trim() || null,
            categoryId,
            tagIds,
            dayOfMonth: input.dayOfMonth,
            startsOn: input.startsOn,
            endsOn: input.endsOn ?? null,
            isActive: input.isActive ?? true,
          },
        });
        return mapRecurring(row);
      });
    }),

    updateRecurringRule: Effect.fn("PlanningService.updateRecurringRule")(function* (
      userId: string,
      input: typeof planningInputs.updateRecurringRule.Type
    ) {
      const { current, next } = yield* financeOperation("updateRecurringRule", async () => {
        const current = await db.financeRecurringRule.findFirst({
          where: { id: input.id, userId },
        });
        if (!current) throw new FinanceNotFoundError({ message: "Recurring rule does not exist" });
        const definedPatch = Object.fromEntries(Object.entries(input.patch).filter(([, value]) => value !== undefined));
        const next = Schema.decodeUnknownSync(recurringInput)({
          ...mapRecurring(current),
          ...definedPatch,
        });
        return { current, next };
      });
      if (next.categoryId) yield* categories.ensureDefaults(userId);
      return yield* financeOperation("updateRecurringRule", async () => {
        const categoryId = next.categoryId ?? null;
        const tagIds = [...new Set(next.tagIds ?? [])];
        if (next.endsOn && next.endsOn < next.startsOn) {
          throw new FinanceBadRequestError({ message: "End date must not precede start date" });
        }
        await validateCategory(db, userId, categoryId, next.kind);
        await validateTagIds(db, userId, tagIds);
        const row = await db.financeRecurringRule.update({
          where: { id: current.id },
          data: {
            kind: next.kind,
            amountSatang: BigInt(next.amountSatang),
            title: next.title.trim(),
            note: next.note?.trim() ?? "",
            bank: next.bank?.trim() || null,
            categoryId,
            tagIds,
            dayOfMonth: next.dayOfMonth,
            startsOn: next.startsOn,
            endsOn: next.endsOn ?? null,
            isActive: next.isActive,
          },
        });
        return mapRecurring(row);
      });
    }),

    deleteRecurringRule: Effect.fn("PlanningService.deleteRecurringRule")(function* (
      userId: string,
      input: typeof planningInputs.deleteRecurringRule.Type
    ) {
      return yield* financeOperation("deleteRecurringRule", async () => {
        const [, result] = await db.$transaction([
          db.financeTransaction.updateMany({
            where: { userId, recurringRuleId: input.id },
            data: { recurringRuleId: null },
          }),
          db.financeRecurringRule.deleteMany({ where: { id: input.id, userId } }),
        ]);
        return result.count > 0;
      });
    }),

    generateDueRecurringTransactions: Effect.fn("PlanningService.generateDueRecurringTransactions")(function* (
      userId: string,
      input: typeof planningInputs.generateDueRecurringTransactions.Type
    ) {
      return yield* financeOperation("generateDueRecurringTransactions", async () => {
        const asOf = input?.asOf ?? todayISO();
        const rules = await db.financeRecurringRule.findMany({
          where: { userId, isActive: true, startsOn: { lte: asOf } },
        });
        let created = 0;
        for (const rule of rules) {
          const firstKey = rule.startsOn.slice(0, 7);
          const lastKey = asOf.slice(0, 7);
          const monthCount = monthsBetween(firstKey, lastKey);
          if (monthCount > 600) {
            throw new FinanceBadRequestError({
              message: "Recurring rule spans more than 50 years",
            });
          }
          for (let offset = 0; offset <= monthCount; offset += 1) {
            const dueDate = dateInMonth(shiftPeriodKey(firstKey, offset), rule.dayOfMonth);
            if (dueDate < rule.startsOn || dueDate > asOf || (rule.endsOn && dueDate > rule.endsOn)) {
              continue;
            }
            const id = crypto.randomUUID();
            try {
              await db.financeTransaction.create({
                data: {
                  id,
                  userId,
                  kind: rule.kind,
                  amountSatang: rule.amountSatang,
                  occurredOn: dueDate,
                  title: rule.title,
                  note: rule.note,
                  bank: rule.bank,
                  cardName: null,
                  cardLast4: null,
                  slipImageUri: null,
                  source: "recurring",
                  categoryId: rule.categoryId,
                  recurringRuleId: rule.id,
                  tagIds: rule.tagIds,
                  dedupeKey: null,
                  dedupeIdentity: `id:${id}`,
                  recurringIdentity: `rule:${rule.id}:${dueDate}`,
                  deletedAt: null,
                },
              });
              created += 1;
            } catch (error) {
              if (!(error instanceof Error) || !("code" in error) || error.code !== "P2002") throw error;
            }
          }
        }
        return created;
      });
    }),
  };
}

const makePlanningService = Effect.gen(function* () {
  const { prismaClient } = yield* PrismaProvider;
  const categories = yield* FinanceCategories;
  const settings = yield* FinanceSettings;
  return makePlanningOperations(prismaClient, categories, settings);
});

export class PlanningService extends Context.Service<PlanningService, Effect.Success<typeof makePlanningService>>()(
  "@moojot/api/PlanningService"
) {
  static readonly layer = Layer.effect(PlanningService, makePlanningService);
}

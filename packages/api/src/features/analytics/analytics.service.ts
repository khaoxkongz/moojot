import type { Database } from "@moojot/db";
import { Context, Effect, Layer } from "effect";
import { activeTransactionWhere, satangToNumber } from "../../shared/finance/common";
import { getPeriodBounds, getPeriodForDate, shiftPeriodKey, todayISO } from "../../shared/finance/dates";
import { PrismaProvider } from "../../providers/prisma.provider";
import { FinanceCategories } from "../../shared/finance/category.service";
import { FinanceSettings } from "../../shared/finance/settings.service";
import { analyticsInputs, walletFilterSchema } from "./analytics.schema";
import { FinanceBadRequestError, financeOperation } from "../../shared/finance/error";

function assertPeriod(from: string, to: string) {
  if (from > to) throw new FinanceBadRequestError({ message: "Start date must not be after end date" });
}

type WalletFilter = typeof walletFilterSchema.Type;
type WalletFields = {
  bank: string | null;
  cardName: string | null;
  cardLast4: string | null;
  source: string;
};
type CategoryMeta = { id: string; name: string; icon: string; color: string };
type TagMeta = { id: string; name: string; color: string };

function matchesWallet(transaction: WalletFields, filter?: WalletFilter): boolean {
  if (!filter) return true;
  const bank = transaction.bank?.trim() ?? "";
  const cardName = transaction.cardName?.trim() ?? "";
  const cardLast4 = transaction.cardLast4?.trim() ?? "";
  if (!cardName && !cardLast4 && filter.banks.some((name) => name.trim() && name.trim() === bank)) {
    return true;
  }
  if (
    filter.cards.some(
      (card) =>
        card.cardName.trim() && card.cardName.trim() === cardName && (card.cardLast4?.trim() ?? "") === cardLast4
    )
  ) {
    return true;
  }
  return filter.includeOther && (transaction.source === "manual" || (!cardName && (!bank || Boolean(cardLast4))));
}

function summarize(from: string, to: string, transactions: Array<{ kind: string; amountSatang: bigint }>) {
  let income = 0n;
  let expense = 0n;
  let transfer = 0n;
  for (const transaction of transactions) {
    if (transaction.kind === "income") income += transaction.amountSatang;
    else if (transaction.kind === "expense") expense += transaction.amountSatang;
    else if (transaction.kind === "transfer") transfer += transaction.amountSatang;
  }
  return {
    from,
    to,
    incomeSatang: satangToNumber(income),
    expenseSatang: satangToNumber(expense),
    transferSatang: satangToNumber(transfer),
    netSatang: satangToNumber(income - expense),
    transactionCount: transactions.length,
  };
}

function makeAnalyticsOperations(
  db: Database,
  categories: FinanceCategories["Service"],
  settings: FinanceSettings["Service"]
) {
  return {
    getDailyActivity: Effect.fn("AnalyticsService.getDailyActivity")(function* (userId: string) {
      return yield* financeOperation("getDailyActivity", async () => {
        const transactions = await db.financeTransaction.findMany({
          where: {
            userId: userId,
            ...activeTransactionWhere,
            kind: { in: ["income", "expense"] },
          },
          select: { occurredOn: true, kind: true, categoryId: true },
        });
        const byDate = new Map<
          string,
          {
            date: string;
            transactionCount: number;
            incomeCount: number;
            expenseCount: number;
            pendingCategoryCount: number;
          }
        >();
        for (const transaction of transactions) {
          const item = byDate.get(transaction.occurredOn) ?? {
            date: transaction.occurredOn,
            transactionCount: 0,
            incomeCount: 0,
            expenseCount: 0,
            pendingCategoryCount: 0,
          };
          item.transactionCount += 1;
          if (transaction.kind === "income") item.incomeCount += 1;
          else item.expenseCount += 1;
          if (!transaction.categoryId) item.pendingCategoryCount += 1;
          byDate.set(transaction.occurredOn, item);
        }
        return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
      });
    }),

    feedCarrotForDate: Effect.fn("AnalyticsService.feedCarrotForDate")(function* (
      userId: string,
      input: typeof analyticsInputs.feedCarrotForDate.Type
    ) {
      return yield* financeOperation("feedCarrotForDate", async () => {
        const localToday =
          input.timezoneOffsetMinutes === undefined
            ? todayISO()
            : new Date(Date.now() - input.timezoneOffsetMinutes * 60_000).toISOString().slice(0, 10);
        if (input.date !== localToday) {
          throw new FinanceBadRequestError({ message: "Carrots can only be awarded for today" });
        }
        return db.$transaction(async (tx) => {
          const [transactions, settings] = await Promise.all([
            tx.financeTransaction.findMany({
              where: {
                userId,
                ...activeTransactionWhere,
                occurredOn: input.date,
                kind: { in: ["income", "expense"] },
              },
              select: { categoryId: true },
            }),
            tx.financeSetting.findMany({
              where: {
                userId,
                key: { in: ["carrot_count", "last_fed_on", "streak_count_mode", "streak_enabled"] },
              },
              select: { key: true, value: true },
            }),
          ]);
          if (!transactions.length) {
            throw new FinanceBadRequestError({ message: "จดรายรับหรือรายจ่ายวันนี้ก่อนให้อาหารน้องหมู" });
          }
          const byKey = new Map<string, string>(
            settings.map((setting: { key: string; value: string }) => [setting.key, setting.value])
          );
          if (byKey.get("streak_enabled") === "false") {
            throw new FinanceBadRequestError({ message: "เปิดการนับความต่อเนื่องก่อนให้อาหารน้องหมู" });
          }
          if (
            byKey.get("streak_count_mode") === "categorized" &&
            transactions.some((item: { categoryId: string | null }) => !item.categoryId)
          ) {
            throw new FinanceBadRequestError({
              message: "เลือกหมวดของทุกรายการวันนี้ให้ครบก่อนให้อาหารน้องหมู",
            });
          }
          const stored = Number(byKey.get("carrot_count") ?? 0);
          const carrots = Number.isSafeInteger(stored) && stored >= 0 ? stored : 0;
          const lastFedOn = byKey.get("last_fed_on") ?? "";
          if (lastFedOn === input.date) return { awarded: false, carrots, lastFedOn };
          if (!Number.isSafeInteger(carrots + 1)) {
            throw new FinanceBadRequestError({
              message: "Carrot count exceeds the supported range",
            });
          }
          await tx.financeSetting.upsert({
            where: { userId_key: { userId, key: "carrot_count" } },
            create: { userId, key: "carrot_count", value: String(carrots + 1) },
            update: { value: String(carrots + 1) },
          });
          await tx.financeSetting.upsert({
            where: { userId_key: { userId, key: "last_fed_on" } },
            create: { userId, key: "last_fed_on", value: input.date },
            update: { value: input.date },
          });
          return { awarded: true, carrots: carrots + 1, lastFedOn: input.date };
        });
      });
    }),

    getPeriodSummary: Effect.fn("AnalyticsService.getPeriodSummary")(function* (
      userId: string,
      input: typeof analyticsInputs.getPeriodSummary.Type
    ) {
      return yield* financeOperation("getPeriodSummary", async () => {
        assertPeriod(input.from, input.to);
        const transactions = await db.financeTransaction.findMany({
          where: {
            userId: userId,
            ...activeTransactionWhere,
            occurredOn: { gte: input.from, lte: input.to },
          },
          select: {
            kind: true,
            amountSatang: true,
            bank: true,
            cardName: true,
            cardLast4: true,
            source: true,
          },
        });
        return summarize(
          input.from,
          input.to,
          transactions.filter((item: WalletFields & { kind: string; amountSatang: bigint }) =>
            matchesWallet(item, input.walletFilter)
          )
        );
      });
    }),

    getCategoryBreakdown: Effect.fn("AnalyticsService.getCategoryBreakdown")(function* (
      userId: string,
      input: typeof analyticsInputs.getCategoryBreakdown.Type
    ) {
      if (input.from > input.to) {
        return yield* new FinanceBadRequestError({
          message: "Start date must not be after end date",
        });
      }
      yield* categories.ensureDefaults(userId);
      return yield* financeOperation("getCategoryBreakdown", async () => {
        const [transactions, categories] = await Promise.all([
          db.financeTransaction.findMany({
            where: {
              userId,
              ...activeTransactionWhere,
              occurredOn: { gte: input.from, lte: input.to },
              kind: input.kind ?? "expense",
            },
            select: {
              categoryId: true,
              amountSatang: true,
              bank: true,
              cardName: true,
              cardLast4: true,
              source: true,
            },
          }),
          db.financeCategory.findMany({
            where: { userId },
            select: { id: true, name: true, icon: true, color: true },
          }),
        ]);
        const categoryById = new Map<string, CategoryMeta>(
          categories.map((category: CategoryMeta) => [category.id, category])
        );
        const groups = new Map<string | null, { total: bigint; count: number }>();
        let grandTotal = 0n;
        for (const transaction of transactions) {
          if (!matchesWallet(transaction, input.walletFilter)) continue;
          const group = groups.get(transaction.categoryId) ?? { total: 0n, count: 0 };
          group.total += transaction.amountSatang;
          group.count += 1;
          grandTotal += transaction.amountSatang;
          groups.set(transaction.categoryId, group);
        }
        return [...groups.entries()]
          .sort((a, b) => (a[1].total < b[1].total ? 1 : a[1].total > b[1].total ? -1 : 0))
          .map(([categoryId, group]) => {
            const category = categoryId ? categoryById.get(categoryId) : undefined;
            return {
              categoryId,
              categoryName: category?.name ?? "ไม่มีหมวดหมู่",
              icon: category?.icon ?? "✨",
              color: category?.color ?? "#A9B5C3",
              totalSatang: satangToNumber(group.total),
              transactionCount: group.count,
              percentage: grandTotal ? (satangToNumber(group.total) / satangToNumber(grandTotal)) * 100 : 0,
            };
          });
      });
    }),

    getTagBreakdown: Effect.fn("AnalyticsService.getTagBreakdown")(function* (
      userId: string,
      input: typeof analyticsInputs.getTagBreakdown.Type
    ) {
      return yield* financeOperation("getTagBreakdown", async () => {
        assertPeriod(input.from, input.to);
        const [transactions, tags] = await Promise.all([
          db.financeTransaction.findMany({
            where: {
              userId,
              ...activeTransactionWhere,
              occurredOn: { gte: input.from, lte: input.to },
              kind: input.kind ?? "expense",
            },
            select: {
              tagIds: true,
              amountSatang: true,
              bank: true,
              cardName: true,
              cardLast4: true,
              source: true,
            },
          }),
          db.financeTag.findMany({
            where: { userId },
            select: { id: true, name: true, color: true },
          }),
        ]);
        const tagById = new Map<string, TagMeta>(tags.map((tag: TagMeta) => [tag.id, tag]));
        const groups = new Map<string | null, { total: bigint; count: number }>();
        for (const transaction of transactions) {
          if (!matchesWallet(transaction, input.walletFilter)) continue;
          for (const tagId of transaction.tagIds.length ? transaction.tagIds : [null]) {
            const group = groups.get(tagId) ?? { total: 0n, count: 0 };
            group.total += transaction.amountSatang;
            group.count += 1;
            groups.set(tagId, group);
          }
        }
        return [...groups.entries()]
          .sort((a, b) => (a[1].total < b[1].total ? 1 : a[1].total > b[1].total ? -1 : 0))
          .map(([tagId, group]) => {
            const tag = tagId ? tagById.get(tagId) : undefined;
            return {
              tagId,
              tagName: tag?.name ?? "ไม่มีแท็ก",
              color: tag?.color ?? "#A9B5C3",
              totalSatang: satangToNumber(group.total),
              transactionCount: group.count,
            };
          });
      });
    }),

    listBanks: Effect.fn("AnalyticsService.listBanks")(function* (userId: string) {
      return yield* financeOperation("listBanks", async () => {
        const rows = await db.financeTransaction.findMany({
          where: { userId: userId, ...activeTransactionWhere, bank: { not: null } },
          select: { bank: true },
        });
        return [
          ...new Set(
            rows
              .map((row: { bank: string | null }) => row.bank)
              .filter((bank: string | null): bank is string => Boolean(bank))
          ),
        ].sort();
      });
    }),

    listCards: Effect.fn("AnalyticsService.listCards")(function* (userId: string) {
      return yield* financeOperation("listCards", async () => {
        const rows = await db.financeTransaction.findMany({
          where: {
            userId: userId,
            ...activeTransactionWhere,
            cardName: { not: null },
          },
          select: { cardName: true, cardLast4: true },
        });
        const cards = new Map<string, { cardName: string; cardLast4: string | null }>();
        for (const row of rows) {
          if (!row.cardName) continue;
          cards.set(JSON.stringify([row.cardName, row.cardLast4]), {
            cardName: row.cardName,
            cardLast4: row.cardLast4,
          });
        }
        return [...cards.values()].sort(
          (a, b) => a.cardName.localeCompare(b.cardName) || (a.cardLast4 ?? "").localeCompare(b.cardLast4 ?? "")
        );
      });
    }),

    listWalletFilterOptions: Effect.fn("AnalyticsService.listWalletFilterOptions")(function* (userId: string) {
      return yield* financeOperation("listWalletFilterOptions", async () => {
        const rows = await db.financeTransaction.findMany({
          where: { userId: userId, ...activeTransactionWhere },
          select: { bank: true, cardName: true, cardLast4: true },
        });
        const banks = new Set<string>();
        const cards = new Map<string, { cardName: string; cardLast4: string | null }>();
        for (const row of rows) {
          const bank = row.bank?.trim() ?? "";
          const cardName = row.cardName?.trim() ?? "";
          const cardLast4 = row.cardLast4?.trim() || null;
          if (bank && !cardName && !cardLast4) banks.add(bank);
          if (cardName) cards.set(JSON.stringify([cardName, cardLast4]), { cardName, cardLast4 });
        }
        return {
          banks: [...banks].sort((a, b) => a.localeCompare(b)),
          cards: [...cards.values()].sort(
            (a, b) => a.cardName.localeCompare(b.cardName) || (a.cardLast4 ?? "").localeCompare(b.cardLast4 ?? "")
          ),
          canIdentifyDeletedCards: false,
        };
      });
    }),

    getMonthlyTrend: Effect.fn("AnalyticsService.getMonthlyTrend")(function* (
      userId: string,
      input: typeof analyticsInputs.getMonthlyTrend.Type
    ) {
      const startDay = yield* settings.getMonthStartDay(userId);
      return yield* financeOperation("getMonthlyTrend", async () => {
        const currentKey = getPeriodForDate(input.asOf ?? todayISO(), startDay).periodKey;
        const count = input.count ?? 6;
        const periods = Array.from({ length: count }, (_, index) =>
          getPeriodBounds(shiftPeriodKey(currentKey, index - count + 1), startDay)
        );
        const transactions = await db.financeTransaction.findMany({
          where: {
            userId,
            ...activeTransactionWhere,
            occurredOn: { gte: periods[0]!.from, lte: periods.at(-1)!.to },
          },
          select: {
            occurredOn: true,
            kind: true,
            amountSatang: true,
            bank: true,
            cardName: true,
            cardLast4: true,
            source: true,
          },
        });
        return periods.map((period) => {
          const [year, month] = period.periodKey.split("-").map(Number) as [number, number];
          const label = new Intl.DateTimeFormat("th-TH", {
            month: "short",
            year: "2-digit",
          }).format(new Date(Date.UTC(year, month - 1, 1)));
          return {
            ...summarize(
              period.from,
              period.to,
              transactions.filter(
                (
                  transaction: WalletFields & {
                    occurredOn: string;
                    kind: string;
                    amountSatang: bigint;
                  }
                ) =>
                  transaction.occurredOn >= period.from &&
                  transaction.occurredOn <= period.to &&
                  matchesWallet(transaction, input.walletFilter)
              )
            ),
            periodKey: period.periodKey,
            label,
          };
        });
      });
    }),
  };
}

const makeAnalyticsService = Effect.gen(function* () {
  const { prismaClient } = yield* PrismaProvider;
  const categories = yield* FinanceCategories;
  const settings = yield* FinanceSettings;
  return makeAnalyticsOperations(prismaClient, categories, settings);
});

export class AnalyticsService extends Context.Service<AnalyticsService, Effect.Success<typeof makeAnalyticsService>>()(
  "@moojot/api/AnalyticsService"
) {
  static readonly layer = Layer.effect(AnalyticsService, makeAnalyticsService);
}

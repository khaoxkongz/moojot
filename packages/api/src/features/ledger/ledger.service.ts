import type { Database, Prisma } from "@moojot/db";
import { Context, Effect, Layer } from "effect";
import { mapTransaction } from "./transaction.schema";
import { PrismaProvider } from "../../providers/prisma.provider";
import { FinanceCategories } from "../../shared/finance/category.service";
import { FinanceSettings } from "../../shared/finance/settings.service";
import {
  activeTransactionWhere,
  nullableSlipImageUri,
  nullableText,
  requiredText,
  satangToNumber,
} from "../../shared/finance/common";
import { getPeriodBounds, getPeriodForDate, shiftPeriodKey, todayISO } from "../../shared/finance/dates";
import { ledgerInputs, transactionFiltersSchema } from "./ledger.schema";
import {
  FinanceBadRequestError,
  FinanceConflictError,
  FinanceInternalError,
  FinanceNotFoundError,
  FinanceReadError,
  financeOperation,
} from "../../shared/finance/error";

type CategoryRecord = {
  id: string;
  name: string;
  kind: string;
  icon: string;
  color: string;
  isSystem: boolean;
  sortOrder: number;
};

type TagRecord = { id: string; name: string; color: string };

function mapCategory(row: CategoryRecord) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as "income" | "expense",
    icon: row.icon,
    color: row.color,
    isSystem: row.isSystem,
    sortOrder: row.sortOrder,
  };
}

function mapTag(row: TagRecord) {
  return { id: row.id, name: row.name, color: row.color };
}

function mapDatabaseError(error: unknown): never {
  if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
    throw new FinanceConflictError({ message: "A record with this identity already exists" });
  }
  throw error;
}

async function validateCategory(
  db: Database,
  userId: string,
  categoryId: string | null,
  kind: "income" | "expense" | "transfer"
): Promise<void> {
  if (!categoryId) return;
  if (kind === "transfer") {
    throw new FinanceBadRequestError({
      message: "Transfers cannot have an income or expense category",
    });
  }
  const category = await db.financeCategory.findUnique({
    where: { userId_id: { userId, id: categoryId } },
    select: { kind: true },
  });
  if (!category) throw new FinanceBadRequestError({ message: "Category does not exist" });
  if (category.kind !== kind) {
    throw new FinanceBadRequestError({
      message: "Category kind does not match transaction kind",
    });
  }
}

async function validateTags(db: Database, userId: string, tagIds: string[]): Promise<string[]> {
  const unique = [...new Set(tagIds)];
  if (!unique.length) return unique;
  const found = await db.financeTag.findMany({
    where: { userId, id: { in: unique } },
    select: { id: true },
  });
  if (found.length !== unique.length) {
    throw new FinanceBadRequestError({ message: "Tag does not exist" });
  }
  return unique;
}

type TransactionFilters = typeof transactionFiltersSchema.Type;

export function walletWhere(
  filter: NonNullable<TransactionFilters["walletFilter"]>
): Prisma.FinanceTransactionWhereInput {
  const options: Prisma.FinanceTransactionWhereInput[] = [];
  const banks = [...new Set(filter.banks.map((value) => value.trim()).filter(Boolean))];
  if (banks.length) {
    options.push({
      bank: { in: banks },
      cardName: null,
      cardLast4: null,
    });
  }
  for (const card of filter.cards) {
    const cardName = card.cardName.trim();
    if (!cardName) continue;
    const cardLast4 = nullableText(card.cardLast4);
    options.push({
      cardName,
      cardLast4,
    });
  }
  // “ไม่ระบุ” is an entry with no bank or card chosen, however it was recorded: a manual entry with a bank belongs to
  // that bank. A last four without a card name never matches a bank or card row, so it stays here too.
  if (filter.includeOther) {
    options.push({
      cardName: null,
      OR: [{ bank: null }, { cardLast4: { not: null } }],
    });
  }
  return options.length ? { OR: options } : { id: { in: [] } };
}

export async function transactionWhere(
  db: Database,
  userId: string,
  filters: TransactionFilters
): Promise<Prisma.FinanceTransactionWhereInput> {
  if (filters.from && filters.to && filters.from > filters.to) {
    throw new FinanceBadRequestError({ message: "Start date must not be after end date" });
  }
  const where: Prisma.FinanceTransactionWhereInput = { userId, ...activeTransactionWhere };
  if (filters.from || filters.to) {
    where.occurredOn = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    };
  }
  if (filters.kind) where.kind = filters.kind;
  if (filters.bank) where.bank = filters.bank;
  if (filters.cardName) where.cardName = filters.cardName;
  if (filters.cardLast4) where.cardLast4 = filters.cardLast4;
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.tagId) where.tagIds = { has: filters.tagId };
  if (filters.source) where.source = filters.source;
  if (filters.walletFilter) where.AND = [walletWhere(filters.walletFilter)];
  const search = filters.search?.trim();
  if (search) {
    const [categories, tags] = await Promise.all([
      db.financeCategory.findMany({
        where: { userId, name: { contains: search, mode: "insensitive" } },
        select: { id: true },
      }),
      db.financeTag.findMany({
        where: { userId, name: { contains: search, mode: "insensitive" } },
        select: { id: true },
      }),
    ]);
    const or: Prisma.FinanceTransactionWhereInput[] = [
      { title: { contains: search, mode: "insensitive" } },
      { note: { contains: search, mode: "insensitive" } },
      { bank: { contains: search, mode: "insensitive" } },
      { cardName: { contains: search, mode: "insensitive" } },
      { cardLast4: { contains: search, mode: "insensitive" } },
    ];
    if (categories.length) or.push({ categoryId: { in: categories.map((row) => row.id) } });
    if (tags.length) or.push({ tagIds: { hasSome: tags.map((row) => row.id) } });
    where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), { OR: or }];
  }
  return where;
}

async function listTransactionsFrom(db: Database, userId: string, filters: TransactionFilters, unlimited = false) {
  const where = await transactionWhere(db, userId, filters);
  const rows = await db.financeTransaction.findMany({
    where,
    orderBy:
      filters.sort === "recorded"
        ? [{ createdAt: "desc" }, { id: "desc" }]
        : [{ occurredOn: "desc" }, { createdAt: "desc" }],
    ...(!unlimited ? { take: filters.limit ?? 200, skip: filters.offset ?? 0 } : {}),
  });
  return rows.map(mapTransaction);
}

function csvCell(value: string): string {
  const safe = /^\s*[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

function bahtFromSatang(value: number): string {
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;
}

function makeLedgerOperations(
  db: Database,
  categories: FinanceCategories["Service"],
  settings: FinanceSettings["Service"]
) {
  return {
    initializeDatabase: Effect.fn("LedgerService.initializeDatabase")(function* (userId: string) {
      yield* categories.ensureDefaults(userId);
      return { ready: true };
    }),

    getTransaction: Effect.fn("LedgerService.getTransaction")(function* (userId: string, id: string) {
      const row = yield* Effect.tryPromise({
        try: () =>
          db.financeTransaction.findFirst({
            where: { userId, id, ...activeTransactionWhere },
          }),
        catch: (cause) => new FinanceReadError({ cause }),
      });

      if (row === null) return null;

      return yield* Effect.try({
        try: () => mapTransaction(row),
        catch: (cause) => (cause instanceof FinanceInternalError ? cause : new FinanceReadError({ cause })),
      });
    }),

    // Import identities survive soft deletion and never match another user's row.
    findTransactionIdentity: Effect.fn("LedgerService.findTransactionIdentity")(function* (
      userId: string,
      dedupeKey: string
    ) {
      return yield* Effect.tryPromise({
        try: () =>
          db.financeTransaction.findUnique({
            where: { userId_dedupeIdentity: { userId, dedupeIdentity: `key:${dedupeKey}` } },
            select: { id: true },
          }),
        catch: (cause) => new FinanceReadError({ cause }),
      });
    }),

    listTransactions: Effect.fn("LedgerService.listTransactions")(function* (
      userId: string,
      input: typeof ledgerInputs.listTransactions.Type
    ) {
      return yield* financeOperation("listTransactions", async () => {
        return listTransactionsFrom(db, userId, input ?? {});
      });
    }),

    createTransaction: Effect.fn("LedgerService.createTransaction")(function* (
      userId: string,
      input: typeof ledgerInputs.createTransaction.Type
    ) {
      yield* categories.ensureDefaults(userId);
      return yield* financeOperation("createTransaction", async () => {
        const categoryId = nullableText(input.categoryId);
        await validateCategory(db, userId, categoryId, input.kind);
        const tagIds = await validateTags(db, userId, input.tagIds ?? []);
        const cardLast4 = nullableText(input.cardLast4);
        if (cardLast4 && !/^\d{4}$/.test(cardLast4)) {
          throw new FinanceBadRequestError({
            message: "Card last four digits must be four digits",
          });
        }
        const id = crypto.randomUUID();
        const source = input.source ?? "manual";
        const dedupeKey = nullableText(input.dedupeKey);
        try {
          const row = await db.financeTransaction.create({
            data: {
              id,
              userId,
              kind: input.kind,
              amountSatang: BigInt(input.amountSatang),
              occurredOn: input.occurredOn,
              title: requiredText(input.title, "Title"),
              note: input.note?.trim() ?? "",
              bank: nullableText(input.bank),
              cardName: nullableText(input.cardName),
              cardLast4,
              slipImageUri: source === "slip" ? nullableSlipImageUri(input.slipImageUri) : null,
              source,
              categoryId,
              recurringRuleId: null,
              tagIds,
              dedupeKey,
              dedupeIdentity: dedupeKey ? `key:${dedupeKey}` : `id:${id}`,
              recurringIdentity: `id:${id}`,
              deletedAt: null,
            },
          });
          return mapTransaction(row);
        } catch (error) {
          mapDatabaseError(error);
        }
      });
    }),

    updateTransaction: Effect.fn("LedgerService.updateTransaction")(function* (
      userId: string,
      input: typeof ledgerInputs.updateTransaction.Type
    ) {
      return yield* financeOperation("updateTransaction", async () => {
        const current = await db.financeTransaction.findFirst({
          where: { userId, id: input.id, ...activeTransactionWhere },
        });
        if (!current) throw new FinanceNotFoundError({ message: "Transaction does not exist" });
        const kind = input.patch.kind ?? (current.kind as "income" | "expense" | "transfer");
        const categoryId =
          input.patch.categoryId === undefined ? current.categoryId : nullableText(input.patch.categoryId);
        await validateCategory(db, userId, categoryId, kind);
        const tagIds =
          input.patch.tagIds === undefined ? current.tagIds : await validateTags(db, userId, input.patch.tagIds);
        const cardLast4 = input.patch.cardLast4 === undefined ? current.cardLast4 : nullableText(input.patch.cardLast4);
        if (cardLast4 && !/^\d{4}$/.test(cardLast4)) {
          throw new FinanceBadRequestError({
            message: "Card last four digits must be four digits",
          });
        }
        const source = input.patch.source ?? current.source;
        const dedupeKey = input.patch.dedupeKey === undefined ? current.dedupeKey : nullableText(input.patch.dedupeKey);
        const occurredOn = input.patch.occurredOn ?? current.occurredOn;
        try {
          const row = await db.financeTransaction.update({
            where: { id: current.id },
            data: {
              kind,
              amountSatang: BigInt(input.patch.amountSatang ?? satangToNumber(current.amountSatang)),
              occurredOn,
              title: requiredText(input.patch.title ?? current.title, "Title"),
              note: input.patch.note === undefined ? current.note : (input.patch.note?.trim() ?? ""),
              bank: input.patch.bank === undefined ? current.bank : nullableText(input.patch.bank),
              cardName: input.patch.cardName === undefined ? current.cardName : nullableText(input.patch.cardName),
              cardLast4,
              slipImageUri:
                source === "slip"
                  ? nullableSlipImageUri(
                      input.patch.slipImageUri === undefined ? current.slipImageUri : input.patch.slipImageUri
                    )
                  : null,
              source,
              categoryId,
              tagIds,
              dedupeKey,
              dedupeIdentity: dedupeKey ? `key:${dedupeKey}` : `id:${current.id}`,
              recurringIdentity: current.recurringRuleId
                ? `rule:${current.recurringRuleId}:${occurredOn}`
                : `id:${current.id}`,
            },
          });
          return mapTransaction(row);
        } catch (error) {
          mapDatabaseError(error);
        }
      });
    }),

    deleteTransaction: Effect.fn("LedgerService.deleteTransaction")(function* (
      userId: string,
      input: typeof ledgerInputs.deleteTransaction.Type
    ) {
      return yield* financeOperation("deleteTransaction", async () => {
        const result = await db.financeTransaction.updateMany({
          where: { userId: userId, id: input.id, ...activeTransactionWhere },
          data: { deletedAt: new Date() },
        });
        return result.count > 0;
      });
    }),

    restoreTransaction: Effect.fn("LedgerService.restoreTransaction")(function* (
      userId: string,
      input: typeof ledgerInputs.restoreTransaction.Type
    ) {
      return yield* financeOperation("restoreTransaction", async () => {
        const result = await db.financeTransaction.updateMany({
          where: {
            userId: userId,
            id: input.id,
            deletedAt: { not: null, isSet: true },
          },
          data: { deletedAt: null },
        });
        return result.count > 0;
      });
    }),

    detectDuplicates: Effect.fn("LedgerService.detectDuplicates")(function* (
      userId: string,
      input: typeof ledgerInputs.detectDuplicates.Type
    ) {
      return yield* financeOperation("detectDuplicates", async () => {
        const title = requiredText(input.title, "Title");
        const dedupeKey = nullableText(input.dedupeKey);
        const rows = await db.financeTransaction.findMany({
          where: {
            userId,
            AND: [activeTransactionWhere],
            OR: [
              {
                kind: input.kind,
                amountSatang: BigInt(input.amountSatang),
                occurredOn: input.occurredOn,
                title: { equals: title, mode: "insensitive" },
              },
              ...(dedupeKey ? [{ dedupeKey }] : []),
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        });
        return rows.map(mapTransaction);
      });
    }),

    listCategories: Effect.fn("LedgerService.listCategories")(function* (
      userId: string,
      input: typeof ledgerInputs.listCategories.Type
    ) {
      yield* categories.ensureDefaults(userId);
      return yield* financeOperation("listCategories", async () => {
        const rows = await db.financeCategory.findMany({
          where: { userId, ...(input?.kind ? { kind: input.kind } : {}) },
          orderBy: input?.kind
            ? [{ sortOrder: "asc" }, { name: "asc" }]
            : [{ kind: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
        });
        return rows.map(mapCategory);
      });
    }),

    createCategory: Effect.fn("LedgerService.createCategory")(function* (
      userId: string,
      input: typeof ledgerInputs.createCategory.Type
    ) {
      return yield* financeOperation("createCategory", async () => {
        const row = await db.financeCategory.create({
          data: {
            id: crypto.randomUUID(),
            userId,
            name: requiredText(input.name, "Category name"),
            kind: input.kind,
            icon: requiredText(input.icon ?? "✨", "Category icon"),
            color: requiredText(input.color ?? "#D89E7B", "Category color"),
            isSystem: false,
            sortOrder: input.sortOrder ?? 100,
          },
        });
        return mapCategory(row);
      });
    }),

    updateCategory: Effect.fn("LedgerService.updateCategory")(function* (
      userId: string,
      input: typeof ledgerInputs.updateCategory.Type
    ) {
      return yield* financeOperation("updateCategory", async () => {
        const current = await db.financeCategory.findUnique({
          where: { userId_id: { userId, id: input.id } },
        });
        if (!current) throw new FinanceNotFoundError({ message: "Category does not exist" });
        const kind = input.patch.kind ?? current.kind;
        if (kind !== current.kind) {
          const used = await db.financeTransaction.count({
            where: { userId, categoryId: input.id, ...activeTransactionWhere },
          });
          if (used > 0) {
            throw new FinanceBadRequestError({
              message: "Cannot change the kind of a category with transactions",
            });
          }
        }
        const row = await db.financeCategory.update({
          where: { userId_id: { userId, id: input.id } },
          data: {
            name: requiredText(input.patch.name ?? current.name, "Category name"),
            kind,
            icon: requiredText(input.patch.icon ?? current.icon, "Category icon"),
            color: requiredText(input.patch.color ?? current.color, "Category color"),
            sortOrder: input.patch.sortOrder ?? current.sortOrder,
          },
        });
        return mapCategory(row);
      });
    }),

    deleteCategory: Effect.fn("LedgerService.deleteCategory")(function* (
      userId: string,
      input: typeof ledgerInputs.deleteCategory.Type
    ) {
      return yield* financeOperation("deleteCategory", async () => {
        const category = await db.financeCategory.findUnique({
          where: { userId_id: { userId, id: input.id } },
        });
        if (!category) return false;
        if (category.isSystem) {
          throw new FinanceBadRequestError({ message: "Default categories cannot be deleted" });
        }
        await db.$transaction([
          db.financeTransaction.updateMany({
            where: { userId, categoryId: input.id },
            data: { categoryId: null },
          }),
          db.financeRecurringRule.updateMany({
            where: { userId, categoryId: input.id },
            data: { categoryId: null },
          }),
          db.financeBudget.deleteMany({ where: { userId, categoryId: input.id } }),
          db.financeCategory.delete({ where: { userId_id: { userId, id: input.id } } }),
        ]);
        return true;
      });
    }),

    listTags: Effect.fn("LedgerService.listTags")(function* (userId: string) {
      return yield* financeOperation("listTags", async () => {
        const rows = await db.financeTag.findMany({
          where: { userId: userId },
          orderBy: { name: "asc" },
        });
        return rows.map(mapTag);
      });
    }),

    createTag: Effect.fn("LedgerService.createTag")(function* (
      userId: string,
      input: typeof ledgerInputs.createTag.Type
    ) {
      return yield* financeOperation("createTag", async () => {
        const row = await db.financeTag.create({
          data: {
            id: crypto.randomUUID(),
            userId: userId,
            name: requiredText(input.name, "Tag name"),
            color: requiredText(input.color ?? "#B7A5CE", "Tag color"),
          },
        });
        return mapTag(row);
      });
    }),

    updateTag: Effect.fn("LedgerService.updateTag")(function* (
      userId: string,
      input: typeof ledgerInputs.updateTag.Type
    ) {
      return yield* financeOperation("updateTag", async () => {
        const current = await db.financeTag.findUnique({
          where: { userId_id: { userId, id: input.id } },
        });
        if (!current) throw new FinanceNotFoundError({ message: "Tag does not exist" });
        const row = await db.financeTag.update({
          where: { userId_id: { userId, id: input.id } },
          data: {
            name: requiredText(input.patch.name ?? current.name, "Tag name"),
            color: requiredText(input.patch.color ?? current.color, "Tag color"),
          },
        });
        return mapTag(row);
      });
    }),

    deleteTag: Effect.fn("LedgerService.deleteTag")(function* (
      userId: string,
      input: typeof ledgerInputs.deleteTag.Type
    ) {
      return yield* financeOperation("deleteTag", async () => {
        const tag = await db.financeTag.findUnique({
          where: { userId_id: { userId, id: input.id } },
        });
        if (!tag) return false;
        const [transactions, rules] = await Promise.all([
          db.financeTransaction.findMany({
            where: { userId, tagIds: { has: input.id } },
            select: { id: true, tagIds: true },
          }),
          db.financeRecurringRule.findMany({
            where: { userId, tagIds: { has: input.id } },
            select: { id: true, tagIds: true },
          }),
        ]);
        await db.$transaction([
          ...transactions.map((transaction) =>
            db.financeTransaction.update({
              where: { id: transaction.id },
              data: { tagIds: transaction.tagIds.filter((id) => id !== input.id) },
            })
          ),
          ...rules.map((rule) =>
            db.financeRecurringRule.update({
              where: { id: rule.id },
              data: { tagIds: rule.tagIds.filter((id) => id !== input.id) },
            })
          ),
          db.financeBudget.deleteMany({ where: { userId, tagId: input.id } }),
          db.financeTag.delete({ where: { userId_id: { userId, id: input.id } } }),
        ]);
        return true;
      });
    }),

    exportTransactionsCsv: Effect.fn("LedgerService.exportTransactionsCsv")(function* (
      userId: string,
      input: typeof ledgerInputs.exportTransactionsCsv.Type
    ) {
      return yield* financeOperation("exportTransactionsCsv", async () => {
        const [transactions, categories, tags] = await Promise.all([
          listTransactionsFrom(db, userId, input ?? {}, true),
          db.financeCategory.findMany({
            where: { userId },
            select: { id: true, name: true },
          }),
          db.financeTag.findMany({ where: { userId }, select: { id: true, name: true } }),
        ]);
        const categoryNames = new Map(categories.map((row) => [row.id, row.name]));
        const tagNames = new Map(tags.map((row) => [row.id, row.name]));
        const rows = [
          ["วันที่", "ประเภท", "จำนวนเงิน (บาท)", "รายการ", "หมวดหมู่", "แท็ก", "ธนาคาร", "หมายเหตุ", "ที่มา"],
          ...transactions.map((transaction) => [
            transaction.occurredOn,
            transaction.kind === "income" ? "รายรับ" : transaction.kind === "expense" ? "รายจ่าย" : "ย้ายเงิน",
            bahtFromSatang(transaction.amountSatang),
            transaction.title,
            transaction.categoryId ? (categoryNames.get(transaction.categoryId) ?? "") : "",
            transaction.tagIds
              .map((id) => tagNames.get(id) ?? "")
              .filter(Boolean)
              .join("; "),
            transaction.bank ?? "",
            transaction.note,
            transaction.source,
          ]),
        ];
        return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
      });
    }),

    seedDemoData: Effect.fn("LedgerService.seedDemoData")(function* (
      userId: string,
      input: typeof ledgerInputs.seedDemoData.Type
    ) {
      const startDay = yield* settings.getMonthStartDay(userId);
      yield* categories.ensureDefaults(userId);
      return yield* financeOperation("seedDemoData", async () => {
        const today = input?.asOf ?? todayISO();
        const currentKey = getPeriodForDate(today, startDay).periodKey;
        const addDays = (isoDate: string, days: number) => {
          const date = new Date(`${isoDate}T00:00:00.000Z`);
          date.setUTCDate(date.getUTCDate() + days);
          return date.toISOString().slice(0, 10);
        };
        const examples: {
          offset: number;
          kind: "income" | "expense" | "transfer";
          amount: number;
          title: string;
          categoryId: string | null;
          source: "manual" | "slip" | "statement";
          bank: string | null;
          cardName?: string;
          cardLast4?: string;
        }[] = [
          {
            offset: 0,
            kind: "income",
            amount: 3850000,
            title: "เงินเดือน",
            categoryId: "income-salary",
            source: "manual",
            bank: "KBank",
          },
          {
            offset: 2,
            kind: "expense",
            amount: 27500,
            title: "มื้อกลางวัน",
            categoryId: "expense-food",
            source: "slip",
            bank: "KBank",
          },
          {
            offset: 5,
            kind: "expense",
            amount: 11500,
            title: "กาแฟยามเช้า",
            categoryId: "expense-food",
            source: "slip",
            bank: "SCB",
          },
          {
            offset: 8,
            kind: "expense",
            amount: 6500,
            title: "เดินทางด้วยรถไฟฟ้า",
            categoryId: "expense-transport",
            source: "manual",
            bank: null,
          },
          {
            offset: 12,
            kind: "expense",
            amount: 199000,
            title: "ค่าอินเทอร์เน็ตและโทรศัพท์",
            categoryId: "expense-bills",
            source: "statement",
            bank: "KTC",
            cardName: "KTC VISA",
            cardLast4: "1234",
          },
          {
            offset: 16,
            kind: "expense",
            amount: 199000,
            title: "ของใช้ในบ้าน",
            categoryId: "expense-shopping",
            source: "statement",
            bank: "KTC",
            cardName: "KTC VISA",
            cardLast4: "1234",
          },
          {
            offset: 20,
            kind: "transfer",
            amount: 500000,
            title: "ย้ายเงินเข้าบัญชีออม",
            categoryId: null,
            source: "manual",
            bank: "KBank",
          },
        ];
        return db.$transaction(async (db) => {
          const existing = await db.financeTransaction.count({ where: { userId } });
          if (existing > 0) return false;
          const tagId = "demo-sample-data";
          await db.financeTag.upsert({
            where: { userId_id: { userId, id: tagId } },
            create: { userId, id: tagId, name: "ข้อมูลตัวอย่าง", color: "#9B79BD" },
            update: {},
          });
          const now = new Date();
          for (let monthOffset = -2; monthOffset <= 0; monthOffset += 1) {
            const periodKey = shiftPeriodKey(currentKey, monthOffset);
            const period = getPeriodBounds(periodKey, startDay);
            for (const [index, example] of examples.entries()) {
              const plannedDate = addDays(period.from, example.offset);
              const occurredOn = monthOffset === 0 && plannedDate > today ? today : plannedDate;
              const id = crypto.randomUUID();
              const dedupeKey = `demo:${periodKey}:${index}`;
              await db.financeTransaction.create({
                data: {
                  id,
                  userId,
                  kind: example.kind,
                  amountSatang: BigInt(example.amount),
                  occurredOn,
                  title: example.title,
                  note: "",
                  bank: example.bank,
                  cardName: example.cardName ?? null,
                  cardLast4: example.cardLast4 ?? null,
                  slipImageUri: null,
                  source: example.source,
                  categoryId: example.categoryId,
                  recurringRuleId: null,
                  tagIds: [tagId],
                  dedupeKey,
                  dedupeIdentity: `key:${dedupeKey}`,
                  recurringIdentity: `id:${id}`,
                  deletedAt: null,
                  createdAt: now,
                  updatedAt: now,
                },
              });
            }
          }
          await db.financeBudget.upsert({
            where: {
              userId_periodKey_scopeKey: {
                userId,
                periodKey: currentKey,
                scopeKey: "category:expense-food",
              },
            },
            create: {
              userId,
              periodKey: currentKey,
              scopeKey: "category:expense-food",
              categoryId: "expense-food",
              tagId: null,
              limitSatang: 50000n,
              warningThresholdPercent: 75,
              createdAt: now,
              updatedAt: now,
            },
            update: {},
          });
          await db.financeRecurringRule.create({
            data: {
              userId,
              kind: "expense",
              amountSatang: 850000n,
              title: "ตัวอย่าง: ค่าเช่าห้อง",
              note: "",
              bank: null,
              categoryId: "expense-home",
              tagIds: [],
              dayOfMonth: 5,
              startsOn: today,
              endsOn: null,
              isActive: false,
              createdAt: now,
              updatedAt: now,
            },
          });
          return true;
        });
      });
    }),
  };
}

const makeLedgerService = Effect.gen(function* () {
  const { prismaClient } = yield* PrismaProvider;
  const categories = yield* FinanceCategories;
  const settings = yield* FinanceSettings;
  return makeLedgerOperations(prismaClient, categories, settings);
});

export class LedgerService extends Context.Service<LedgerService, Effect.Success<typeof makeLedgerService>>()(
  "@moojot/api/LedgerService"
) {
  static readonly layer = Layer.effect(LedgerService, makeLedgerService);
}

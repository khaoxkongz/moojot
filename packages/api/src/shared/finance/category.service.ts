import { Context, Effect, Layer } from "effect";

import { PrismaProvider } from "../../providers/prisma.provider";
import { financeOperation } from "./error";

const DEFAULT_CATEGORIES: [string, string, "income" | "expense", string, string, number][] = [
  ["expense-food", "อาหาร", "expense", "🍜", "#FF9E15", 10],
  ["expense-transport", "เดินทาง, รถ", "expense", "🚙", "#2BBED0", 20],
  ["expense-essentials", "ของใช้จำเป็น", "expense", "🧴", "#F4DC30", 25],
  ["expense-shopping", "ช้อปปิ้ง", "expense", "🛍️", "#D499D9", 30],
  ["expense-fun", "บันเทิง", "expense", "🎬", "#F95D28", 40],
  ["expense-home", "บ้าน, สาธารณูปโภค", "expense", "🏠", "#2178E8", 50],
  ["expense-health", "สุขภาพ, ดูแลตัวเอง", "expense", "💚", "#19CFAB", 60],
  ["expense-family", "ครอบครัว, สัตว์เลี้ยง", "expense", "👨‍👩‍👧", "#EE67C8", 70],
  ["expense-gifts", "ให้คนอื่น, บริจาค", "expense", "🎁", "#9938EB", 80],
  ["expense-travel", "ท่องเที่ยว", "expense", "🏖️", "#2B9BF3", 90],
  ["expense-education", "การศึกษา", "expense", "📚", "#7957E5", 100],
  ["expense-work", "งาน, ธุรกิจ", "expense", "💼", "#D7971C", 110],
  ["expense-savings", "ออมเงิน, ลงทุน", "expense", "📈", "#A9DB18", 120],
  ["expense-bills", "สินเชื่อ, บัตรเครดิต", "expense", "💳", "#6D56BE", 130],
  ["expense-other", "อื่นๆ", "expense", "•••", "#8997A8", 140],
  ["income-salary", "เงินเดือน", "income", "✉️", "#1FC956", 10],
  ["income-extra", "ค่าจ้าง", "income", "💵", "#1FC956", 20],
  ["income-gift", "มีคนให้", "income", "🎁", "#80E025", 30],
  ["income-business", "ค้าขาย, ธุรกิจ", "income", "🏢", "#22A6A7", 40],
  ["income-refund", "เงินคืน", "income", "💸", "#16C934", 50],
  ["income-other", "อื่นๆ", "income", "•••", "#1B9345", 60],
];

const makeFinanceCategories = Effect.gen(function* () {
  const { prismaClient } = yield* PrismaProvider;

  const ensureDefaults = Effect.fn("FinanceCategories.ensureDefaults")(function* (userId: string) {
    return yield* financeOperation("ensureDefaultCategories", async () => {
      await Promise.all(
        DEFAULT_CATEGORIES.map(async ([id, name, kind, icon, color, sortOrder]) => {
          await prismaClient.financeCategory.upsert({
            where: { userId_id: { userId, id } },
            create: {
              id,
              userId,
              systemKey: id,
              name,
              kind,
              icon,
              color,
              isSystem: true,
              sortOrder,
            },
            update: { name, icon, color, sortOrder },
          });
        })
      );
    });
  });

  return { ensureDefaults };
});

export class FinanceCategories extends Context.Service<
  FinanceCategories,
  Effect.Success<typeof makeFinanceCategories>
>()("@moojot/api/FinanceCategories") {
  static readonly layer = Layer.effect(FinanceCategories, makeFinanceCategories);
}

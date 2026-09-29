import type { Database } from "@moojot/db";
import { Context, Effect, Layer } from "effect";

import { PrismaProvider } from "../../providers/prisma.provider";
import { financeOperation } from "./error";

export async function getSettingRaw(db: Database, userId: string, key: string): Promise<string | null> {
  const setting = await db.financeSetting.findUnique({
    where: { userId_key: { userId, key } },
    select: { value: true },
  });
  return setting?.value ?? null;
}

export async function setSettingRaw(db: Database, userId: string, key: string, value: string): Promise<void> {
  await db.financeSetting.upsert({
    where: { userId_key: { userId, key } },
    create: { userId, key, value },
    update: { value },
  });
}

async function getMonthStartDayRaw(db: Database, userId: string): Promise<number> {
  const value = await getSettingRaw(db, userId, "month_start_day");
  const day = value ? Number(value) : 1;
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : 1;
}

const makeFinanceSettings = Effect.gen(function* () {
  const { prismaClient } = yield* PrismaProvider;

  const getMonthStartDay = Effect.fn("FinanceSettings.getMonthStartDay")(function* (userId: string) {
    return yield* financeOperation("getMonthStartDay", () => getMonthStartDayRaw(prismaClient, userId));
  });

  return { getMonthStartDay };
});

export class FinanceSettings extends Context.Service<FinanceSettings, Effect.Success<typeof makeFinanceSettings>>()(
  "@moojot/api/FinanceSettings"
) {
  static readonly layer = Layer.effect(FinanceSettings, makeFinanceSettings);
}

import type { Database } from "@moojot/db";
import { Context, Effect, Layer } from "effect";
import { getPeriodForDate, previousDate, todayISO } from "../../shared/finance/dates";
import { PrismaProvider } from "../../providers/prisma.provider";
import { FinanceSettings, getSettingRaw, setSettingRaw } from "../../shared/finance/settings.service";
import { preferencesInputs } from "./preferences.schema";
import { financeOperation } from "../../shared/finance/error";
import { SETUP_SETTING_KEYS } from "../../shared/finance/setup-keys";

const RECENT_SEARCHES_KEY = "recent_search_terms";
const MAX_RECENT_SEARCHES = 8;

async function getStreakSettingsRaw(db: Database, userId: string) {
  const settings = await db.financeSetting.findMany({
    where: { userId, key: { in: ["streak_count_mode", "streak_enabled", "streak_reset_after"] } },
    select: { key: true, value: true },
  });
  const byKey = new Map<string, string>(
    settings.map((setting: { key: string; value: string }) => [setting.key, setting.value])
  );
  const resetAfter = byKey.get("streak_reset_after") ?? "";
  return {
    mode: byKey.get("streak_count_mode") === "categorized" ? ("categorized" as const) : ("recorded" as const),
    enabled: byKey.get("streak_enabled") !== "false",
    resetAfter: /^\d{4}-\d{2}-\d{2}$/.test(resetAfter) ? resetAfter : "",
  };
}

function parseRecentSearches(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => {
        const key = item.toLocaleLowerCase();
        if (!item || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

function makePreferencesOperations(db: Database, settings: FinanceSettings["Service"]) {
  return {
    hasCompletedOnboarding: Effect.fn("FinancePreferencesService.hasCompletedOnboarding")(function* (userId: string) {
      return yield* financeOperation("hasCompletedOnboarding", async () => {
        const value = await getSettingRaw(db, userId, SETUP_SETTING_KEYS.complete);
        return value === "true" || value === "1";
      });
    }),

    getSetting: Effect.fn("FinancePreferencesService.getSetting")(function* (
      userId: string,
      input: typeof preferencesInputs.getSetting.Type
    ) {
      return yield* financeOperation("getSetting", async () => {
        return getSettingRaw(db, userId, input.key);
      });
    }),

    setSetting: Effect.fn("FinancePreferencesService.setSetting")(function* (
      userId: string,
      input: typeof preferencesInputs.setSetting.Type
    ) {
      return yield* financeOperation("setSetting", async () => {
        await setSettingRaw(db, userId, input.key, input.value);
      });
    }),

    getRecentSearches: Effect.fn("FinancePreferencesService.getRecentSearches")(function* (userId: string) {
      return yield* financeOperation("getRecentSearches", async () => {
        return parseRecentSearches(await getSettingRaw(db, userId, RECENT_SEARCHES_KEY));
      });
    }),

    addRecentSearch: Effect.fn("FinancePreferencesService.addRecentSearch")(function* (
      userId: string,
      input: typeof preferencesInputs.addRecentSearch.Type
    ) {
      return yield* financeOperation("addRecentSearch", async () => {
        const trimmed = input.term.trim();
        const previous = parseRecentSearches(await getSettingRaw(db, userId, RECENT_SEARCHES_KEY));
        if (!trimmed) return previous;
        const next = [
          trimmed,
          ...previous.filter((item) => item.toLocaleLowerCase() !== trimmed.toLocaleLowerCase()),
        ].slice(0, MAX_RECENT_SEARCHES);
        await setSettingRaw(db, userId, RECENT_SEARCHES_KEY, JSON.stringify(next));
        return next;
      });
    }),

    removeRecentSearch: Effect.fn("FinancePreferencesService.removeRecentSearch")(function* (
      userId: string,
      input: typeof preferencesInputs.removeRecentSearch.Type
    ) {
      return yield* financeOperation("removeRecentSearch", async () => {
        const target = input.term.trim().toLocaleLowerCase();
        const previous = parseRecentSearches(await getSettingRaw(db, userId, RECENT_SEARCHES_KEY));
        if (!target) return previous;
        const next = previous.filter((item) => item.toLocaleLowerCase() !== target);
        await setSettingRaw(db, userId, RECENT_SEARCHES_KEY, JSON.stringify(next));
        return next;
      });
    }),

    getStreakSettings: Effect.fn("FinancePreferencesService.getStreakSettings")(function* (userId: string) {
      return yield* financeOperation("getStreakSettings", async () => {
        return getStreakSettingsRaw(db, userId);
      });
    }),

    setStreakCountMode: Effect.fn("FinancePreferencesService.setStreakCountMode")(function* (
      userId: string,
      input: typeof preferencesInputs.setStreakCountMode.Type
    ) {
      return yield* financeOperation("setStreakCountMode", async () => {
        await setSettingRaw(db, userId, "streak_count_mode", input.mode);
      });
    }),

    setStreakEnabled: Effect.fn("FinancePreferencesService.setStreakEnabled")(function* (
      userId: string,
      input: typeof preferencesInputs.setStreakEnabled.Type
    ) {
      return yield* financeOperation("setStreakEnabled", async () => {
        await setSettingRaw(db, userId, "streak_enabled", input.enabled ? "true" : "false");
      });
    }),

    resetStreakProgress: Effect.fn("FinancePreferencesService.resetStreakProgress")(function* (
      userId: string,
      input: typeof preferencesInputs.resetStreakProgress.Type
    ) {
      return yield* financeOperation("resetStreakProgress", async () => {
        await setSettingRaw(db, userId, "streak_reset_after", previousDate(input?.asOf ?? todayISO()));
      });
    }),

    getMonthStartDay: Effect.fn("FinancePreferencesService.getMonthStartDay")(function* (userId: string) {
      return yield* settings.getMonthStartDay(userId);
    }),

    setMonthStartDay: Effect.fn("FinancePreferencesService.setMonthStartDay")(function* (
      userId: string,
      input: typeof preferencesInputs.setMonthStartDay.Type
    ) {
      return yield* financeOperation("setMonthStartDay", async () => {
        await setSettingRaw(db, userId, "month_start_day", String(input.day));
      });
    }),

    getCurrentPeriod: Effect.fn("FinancePreferencesService.getCurrentPeriod")(function* (
      userId: string,
      input: typeof preferencesInputs.getCurrentPeriod.Type
    ) {
      const startDay = yield* settings.getMonthStartDay(userId);
      return yield* financeOperation("getCurrentPeriod", async () => {
        return getPeriodForDate(input?.asOf ?? todayISO(), startDay);
      });
    }),

    resetUserData: Effect.fn("FinancePreferencesService.resetUserData")(function* (userId: string) {
      return yield* financeOperation("resetUserData", async () => {
        await db.$transaction([
          db.financeTransaction.deleteMany({ where: { userId } }),
          db.financeRecurringRule.deleteMany({ where: { userId } }),
          db.financeBudget.deleteMany({ where: { userId } }),
          db.financeTag.deleteMany({ where: { userId } }),
          db.financeCategory.deleteMany({ where: { userId, isSystem: false } }),
          db.financeSetting.deleteMany({ where: { userId } }),
        ]);
      });
    }),
  };
}

const makeFinancePreferencesService = Effect.gen(function* () {
  const { prismaClient } = yield* PrismaProvider;
  const settings = yield* FinanceSettings;
  return makePreferencesOperations(prismaClient, settings);
});

export class FinancePreferencesService extends Context.Service<
  FinancePreferencesService,
  Effect.Success<typeof makeFinancePreferencesService>
>()("@moojot/api/FinancePreferencesService") {
  static readonly layer = Layer.effect(FinancePreferencesService, makeFinancePreferencesService);
}

import { todayISO } from "@/utils/dates";
import { orpc } from "@/utils/orpc";

export const streakQueryOptions = {
  dailyActivity: (asOf = todayISO()) => orpc.analytics.getDailyActivity.queryOptions({ input: { asOf } }),
  settings: () => orpc.financePreferences.getStreakSettings.queryOptions(),
};

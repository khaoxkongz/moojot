import { previousDate } from "@/utils/dates";
import type { DailyActivity, StreakCountMode, StreakSettings } from "@/features/streak/types";

export interface StreakStats {
  current: number;
  longest: number;
  recordedDays: number;
  today: DailyActivity | null;
  recentDates: string[];
  byDate: Map<string, DailyActivity>;
}

export function isRecordedDay(day: DailyActivity | null | undefined, mode: StreakCountMode = "recorded"): boolean {
  if (!day || day.transactionCount <= 0) return false;
  return mode === "recorded" || day.pendingCategoryCount === 0;
}

export function isCategorizedDay(day: DailyActivity | null | undefined): boolean {
  return isRecordedDay(day, "categorized");
}

export function computeStreakStats(
  activity: DailyActivity[],
  today: string,
  options: Partial<StreakSettings> = {}
): StreakStats {
  const byDate = new Map(activity.filter((day) => day.date <= today).map((day) => [day.date, day]));
  const mode = options.mode ?? "recorded";
  const enabled = options.enabled ?? true;
  const resetAfter = options.resetAfter ?? "";
  const qualifies = (date: string) => enabled && date > resetAfter && isRecordedDay(byDate.get(date), mode);
  const recorded = [...byDate.values()]
    .filter((day) => qualifies(day.date))
    .map((day) => day.date)
    .sort();

  let longest = 0;
  let run = 0;
  let prior = "";
  for (const date of recorded) {
    run = prior && previousDate(date) === prior ? run + 1 : 1;
    longest = Math.max(longest, run);
    prior = date;
  }

  let current = 0;
  let cursor = qualifies(today) ? today : previousDate(today);
  while (qualifies(cursor)) {
    current += 1;
    cursor = previousDate(cursor);
  }

  const recentDates = [today];
  for (let index = 1; index < 7; index += 1) {
    recentDates.unshift(previousDate(recentDates[0]));
  }

  return {
    current,
    longest,
    recordedDays: recorded.length,
    today: byDate.get(today) ?? null,
    recentDates,
    byDate,
  };
}

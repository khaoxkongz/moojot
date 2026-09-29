import { previousDate } from "@/utils/dates";
import type { DailyActivity } from "@/features/streak/types";

export type StreakHighlightMode = "recorded" | "categorized";

export interface StreakRun {
  days: number;
  startDate: string;
  endDate: string;
}

export interface StreakHighlight {
  current: number;
  longest: StreakRun | null;
}

export interface StreakHighlights {
  recorded: StreakHighlight;
  categorized: StreakHighlight;
}

/** A mode's longest run and its dates. Ties favor the most recent completed run. */
export function computeStreakHighlight(
  activity: DailyActivity[],
  today: string,
  mode: StreakHighlightMode
): StreakHighlight {
  const byDate = new Map(activity.filter((day) => day.date <= today).map((day) => [day.date, day]));
  const qualifies = (day: DailyActivity | undefined) =>
    !!day && day.transactionCount > 0 && (mode === "recorded" || day.pendingCategoryCount === 0);

  let runDays = 0;
  let runStart = "";
  let runEnd = "";
  let longest: StreakRun | null = null;
  for (const date of [...byDate.keys()].sort()) {
    if (!qualifies(byDate.get(date))) continue;
    const continues = runDays > 0 && previousDate(date) === runEnd;
    runDays = continues ? runDays + 1 : 1;
    runStart = continues ? runStart : date;
    runEnd = date;
    if (longest === null || runDays >= longest.days) {
      longest = { days: runDays, startDate: runStart, endDate: runEnd };
    }
  }

  let current = 0;
  let cursor = qualifies(byDate.get(today)) ? today : previousDate(today);
  while (qualifies(byDate.get(cursor))) {
    current += 1;
    cursor = previousDate(cursor);
  }

  return { current, longest };
}

export function computeStreakHighlights(activity: DailyActivity[], today: string): StreakHighlights {
  return {
    recorded: computeStreakHighlight(activity, today, "recorded"),
    categorized: computeStreakHighlight(activity, today, "categorized"),
  };
}

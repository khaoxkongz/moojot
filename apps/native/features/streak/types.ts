export interface DailyActivity {
  date: string;
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
  pendingCategoryCount: number;
}

export type StreakCountMode = "recorded" | "categorized";

export interface StreakSettings {
  mode: StreakCountMode;
  enabled: boolean;
  resetAfter: string;
}

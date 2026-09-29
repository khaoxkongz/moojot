import type { WalletFilterSelection } from "@/types/finance";
import { todayISO } from "@/utils/dates";
import { orpc } from "@/utils/orpc";

export const homeQueryOptions = {
  periodSummary: (from: string, to: string, walletFilter?: WalletFilterSelection) =>
    orpc.analytics.getPeriodSummary.queryOptions({ input: { from, to, walletFilter } }),
  categoryBreakdown: (
    from: string,
    to: string,
    kind: "income" | "expense" = "expense",
    walletFilter?: WalletFilterSelection
  ) => orpc.analytics.getCategoryBreakdown.queryOptions({ input: { from, to, kind, walletFilter } }),
  tagBreakdown: (
    from: string,
    to: string,
    kind: "income" | "expense" = "expense",
    walletFilter?: WalletFilterSelection
  ) => orpc.analytics.getTagBreakdown.queryOptions({ input: { from, to, kind, walletFilter } }),
  monthlyTrend: (count = 6, asOf = todayISO(), walletFilter?: WalletFilterSelection) =>
    orpc.analytics.getMonthlyTrend.queryOptions({ input: { count, asOf, walletFilter } }),
};

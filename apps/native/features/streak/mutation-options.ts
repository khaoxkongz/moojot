import { orpc, queryClient } from "@/utils/orpc";

export const streakMutationOptions = {
  feedCarrot: () =>
    orpc.analytics.feedCarrotForDate.mutationOptions({
      onSuccess: async (result) => {
        queryClient.setQueryData(
          orpc.financePreferences.getSetting.queryKey({ input: { key: "carrot_count" } }),
          String(result.carrots)
        );
        queryClient.setQueryData(
          orpc.financePreferences.getSetting.queryKey({ input: { key: "last_fed_on" } }),
          result.lastFedOn
        );
        await queryClient.invalidateQueries({ queryKey: orpc.ledger.listTransactions.queryKey() });
      },
    }),
  setCountMode: () =>
    orpc.financePreferences.setStreakCountMode.mutationOptions({
      onSuccess: async () => {
        // queryClient.setQueryData(orpc.financePreferences.getStreakSettings.queryKey(), (current) =>
        //   current ? { ...current, mode } : current
        // );
        await queryClient.invalidateQueries({ queryKey: orpc.financePreferences.getStreakSettings.queryKey() });
        await queryClient.invalidateQueries({ queryKey: orpc.ledger.listTransactions.queryKey() });
      },
    }),
  setEnabled: () =>
    orpc.financePreferences.setStreakEnabled.mutationOptions({
      onSuccess: async () => {
        // queryClient.setQueryData(orpc.financePreferences.getStreakSettings.queryKey(), (current) =>
        //   current ? { ...current, enabled } : current
        // );
        await queryClient.invalidateQueries({ queryKey: orpc.financePreferences.getStreakSettings.queryKey() });
        await queryClient.invalidateQueries({ queryKey: orpc.ledger.listTransactions.queryKey() });
      },
    }),
  resetProgress: () =>
    orpc.financePreferences.resetStreakProgress.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.ledger.listTransactions.queryKey() }),
    }),
};

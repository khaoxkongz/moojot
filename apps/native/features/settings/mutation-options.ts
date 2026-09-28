import { orpc, queryClient } from "@/utils/orpc";

export const settingsMutationOptions = {
  setSetting: () =>
    orpc.financePreferences.setSetting.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.ledger.listTransactions.queryKey() }),
    }),
  resetUserData: () =>
    orpc.financePreferences.resetUserData.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.ledger.listTransactions.queryKey() }),
    }),
  seedDemoData: () =>
    orpc.ledger.seedDemoData.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.ledger.listTransactions.queryKey() }),
    }),
};

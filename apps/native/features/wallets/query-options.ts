import { orpc } from "@/utils/orpc";

export const walletsQueryOptions = {
  banks: () => orpc.analytics.listBanks.queryOptions(),
  cards: () => orpc.analytics.listCards.queryOptions(),
  filterOptions: () => orpc.analytics.listWalletFilterOptions.queryOptions(),
};

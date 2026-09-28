import { orpc } from "@/utils/orpc";

export const settingsQueryOptions = {
  value: (key: string) => orpc.financePreferences.getSetting.queryOptions({ input: { key } }),
};

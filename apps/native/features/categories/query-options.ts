import { orpc } from "@/utils/orpc";

export const categoriesQueryOptions = {
  list: (kind?: "income" | "expense") => orpc.ledger.listCategories.queryOptions({ input: { kind } }),
  tags: () => orpc.ledger.listTags.queryOptions(),
};

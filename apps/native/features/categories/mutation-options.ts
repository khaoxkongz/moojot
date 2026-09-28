import { orpc } from "@/utils/orpc";

export const categoriesMutationOptions = {
  createCategory: () => orpc.ledger.createCategory.mutationOptions(),
  updateCategory: () => orpc.ledger.updateCategory.mutationOptions(),
  deleteCategory: () => orpc.ledger.deleteCategory.mutationOptions(),
  createTag: () => orpc.ledger.createTag.mutationOptions(),
  updateTag: () => orpc.ledger.updateTag.mutationOptions(),
  deleteTag: () => orpc.ledger.deleteTag.mutationOptions(),
};

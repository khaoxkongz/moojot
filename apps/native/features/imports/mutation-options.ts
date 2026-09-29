import { mutationOptions } from "@tanstack/react-query";

import { requestImport, type FileForImport } from "@/features/imports/client";
import { orpc, queryClient } from "@/utils/orpc";

type ImportRequest = {
  source: "slip" | "statement";
  file: FileForImport;
  password?: string;
};

export const importsMutationOptions = {
  analyzeDocument: () =>
    mutationOptions({
      mutationKey: ["imports", "analyze-document"],
      mutationFn: ({ source, file, password }: ImportRequest) => requestImport(source, file, password),
    }),
  saveReviewedTransactions: () =>
    orpc.ledger.createTransaction.mutationOptions({
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.ledger.listTransactions.queryKey() }).catch(() => {});
      },
    }),
};

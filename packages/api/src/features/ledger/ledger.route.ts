import { protectedProcedure } from "../../shared/orpc/base";
import { runFinance } from "../../shared/finance/handler";
import { LedgerService } from "./ledger.service";
import { ledgerInputs } from "./ledger.schema";
import { GetTransactionInputSchemaStd, GetTransactionOutputSchemaStd } from "./transaction.schema";

export const ledgerRoutes = {
  getTransaction: protectedProcedure
    .route({
      description: "Get a finance transaction by ID",
      method: "GET",
      path: "/transactions/{id}",
      tags: ["Ledger"],
    })
    .input(GetTransactionInputSchemaStd)
    .output(GetTransactionOutputSchemaStd)
    .handler(({ input, context }) =>
      runFinance(context, LedgerService, (service) => service.getTransaction(context.session.user.id, input.id))
    ),

  initializeDatabase: protectedProcedure
    .route({ method: "POST", path: "/initializeDatabase", tags: ["Ledger"] })
    .handler(({ context }) =>
      runFinance(context, LedgerService, (service) => service.initializeDatabase(context.session.user.id))
    ),

  listTransactions: protectedProcedure
    .route({ method: "POST", path: "/listTransactions", tags: ["Ledger"] })
    .input(ledgerInputs.listTransactions)
    .handler(({ input, context }) =>
      runFinance(context, LedgerService, (service) => service.listTransactions(context.session.user.id, input))
    ),

  createTransaction: protectedProcedure
    .route({ method: "POST", path: "/createTransaction", tags: ["Ledger"] })
    .input(ledgerInputs.createTransaction)
    .handler(({ input, context }) =>
      runFinance(context, LedgerService, (service) => service.createTransaction(context.session.user.id, input))
    ),

  updateTransaction: protectedProcedure
    .route({ method: "POST", path: "/updateTransaction", tags: ["Ledger"] })
    .input(ledgerInputs.updateTransaction)
    .handler(({ input, context }) =>
      runFinance(context, LedgerService, (service) => service.updateTransaction(context.session.user.id, input))
    ),

  deleteTransaction: protectedProcedure
    .route({ method: "POST", path: "/deleteTransaction", tags: ["Ledger"] })
    .input(ledgerInputs.deleteTransaction)
    .handler(({ input, context }) =>
      runFinance(context, LedgerService, (service) => service.deleteTransaction(context.session.user.id, input))
    ),

  restoreTransaction: protectedProcedure
    .route({ method: "POST", path: "/restoreTransaction", tags: ["Ledger"] })
    .input(ledgerInputs.restoreTransaction)
    .handler(({ input, context }) =>
      runFinance(context, LedgerService, (service) => service.restoreTransaction(context.session.user.id, input))
    ),

  detectDuplicates: protectedProcedure
    .route({ method: "POST", path: "/detectDuplicates", tags: ["Ledger"] })
    .input(ledgerInputs.detectDuplicates)
    .handler(({ input, context }) =>
      runFinance(context, LedgerService, (service) => service.detectDuplicates(context.session.user.id, input))
    ),

  listCategories: protectedProcedure
    .route({ method: "POST", path: "/listCategories", tags: ["Ledger"] })
    .input(ledgerInputs.listCategories)
    .handler(({ input, context }) =>
      runFinance(context, LedgerService, (service) => service.listCategories(context.session.user.id, input))
    ),

  createCategory: protectedProcedure
    .route({ method: "POST", path: "/createCategory", tags: ["Ledger"] })
    .input(ledgerInputs.createCategory)
    .handler(({ input, context }) =>
      runFinance(context, LedgerService, (service) => service.createCategory(context.session.user.id, input))
    ),

  updateCategory: protectedProcedure
    .route({ method: "POST", path: "/updateCategory", tags: ["Ledger"] })
    .input(ledgerInputs.updateCategory)
    .handler(({ input, context }) =>
      runFinance(context, LedgerService, (service) => service.updateCategory(context.session.user.id, input))
    ),

  deleteCategory: protectedProcedure
    .route({ method: "POST", path: "/deleteCategory", tags: ["Ledger"] })
    .input(ledgerInputs.deleteCategory)
    .handler(({ input, context }) =>
      runFinance(context, LedgerService, (service) => service.deleteCategory(context.session.user.id, input))
    ),

  listTags: protectedProcedure
    .route({ method: "POST", path: "/listTags", tags: ["Ledger"] })
    .handler(({ context }) =>
      runFinance(context, LedgerService, (service) => service.listTags(context.session.user.id))
    ),

  createTag: protectedProcedure
    .route({ method: "POST", path: "/createTag", tags: ["Ledger"] })
    .input(ledgerInputs.createTag)
    .handler(({ input, context }) =>
      runFinance(context, LedgerService, (service) => service.createTag(context.session.user.id, input))
    ),

  updateTag: protectedProcedure
    .route({ method: "POST", path: "/updateTag", tags: ["Ledger"] })
    .input(ledgerInputs.updateTag)
    .handler(({ input, context }) =>
      runFinance(context, LedgerService, (service) => service.updateTag(context.session.user.id, input))
    ),

  deleteTag: protectedProcedure
    .route({ method: "POST", path: "/deleteTag", tags: ["Ledger"] })
    .input(ledgerInputs.deleteTag)
    .handler(({ input, context }) =>
      runFinance(context, LedgerService, (service) => service.deleteTag(context.session.user.id, input))
    ),

  exportTransactionsCsv: protectedProcedure
    .route({ method: "POST", path: "/exportTransactionsCsv", tags: ["Ledger"] })
    .input(ledgerInputs.exportTransactionsCsv)
    .handler(({ input, context }) =>
      runFinance(context, LedgerService, (service) => service.exportTransactionsCsv(context.session.user.id, input))
    ),

  seedDemoData: protectedProcedure
    .route({ method: "POST", path: "/seedDemoData", tags: ["Ledger"] })
    .input(ledgerInputs.seedDemoData)
    .handler(({ input, context }) =>
      runFinance(context, LedgerService, (service) => service.seedDemoData(context.session.user.id, input))
    ),
};

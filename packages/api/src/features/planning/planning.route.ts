import { protectedProcedure } from "../../shared/orpc/base";
import { runFinance } from "../../shared/finance/handler";
import { PlanningService } from "./planning.service";
import { planningInputs } from "./planning.schema";

export const planningRoutes = {
  listBudgets: protectedProcedure
    .route({ method: "POST", path: "/listBudgets", tags: ["Planning"] })
    .input(planningInputs.listBudgets)
    .handler(({ input, context }) =>
      runFinance(context, PlanningService, (service) => service.listBudgets(context.session.user.id, input))
    ),

  upsertBudget: protectedProcedure
    .route({ method: "POST", path: "/upsertBudget", tags: ["Planning"] })
    .input(planningInputs.upsertBudget)
    .handler(({ input, context }) =>
      runFinance(context, PlanningService, (service) => service.upsertBudget(context.session.user.id, input))
    ),

  deleteBudget: protectedProcedure
    .route({ method: "POST", path: "/deleteBudget", tags: ["Planning"] })
    .input(planningInputs.deleteBudget)
    .handler(({ input, context }) =>
      runFinance(context, PlanningService, (service) => service.deleteBudget(context.session.user.id, input))
    ),

  getBudgetStatuses: protectedProcedure
    .route({ method: "POST", path: "/getBudgetStatuses", tags: ["Planning"] })
    .input(planningInputs.getBudgetStatuses)
    .handler(({ input, context }) =>
      runFinance(context, PlanningService, (service) => service.getBudgetStatuses(context.session.user.id, input))
    ),

  listRecurringRules: protectedProcedure
    .route({ method: "POST", path: "/listRecurringRules", tags: ["Planning"] })
    .handler(({ context }) =>
      runFinance(context, PlanningService, (service) => service.listRecurringRules(context.session.user.id))
    ),

  createRecurringRule: protectedProcedure
    .route({ method: "POST", path: "/createRecurringRule", tags: ["Planning"] })
    .input(planningInputs.createRecurringRule)
    .handler(({ input, context }) =>
      runFinance(context, PlanningService, (service) => service.createRecurringRule(context.session.user.id, input))
    ),

  updateRecurringRule: protectedProcedure
    .route({ method: "POST", path: "/updateRecurringRule", tags: ["Planning"] })
    .input(planningInputs.updateRecurringRule)
    .handler(({ input, context }) =>
      runFinance(context, PlanningService, (service) => service.updateRecurringRule(context.session.user.id, input))
    ),

  deleteRecurringRule: protectedProcedure
    .route({ method: "POST", path: "/deleteRecurringRule", tags: ["Planning"] })
    .input(planningInputs.deleteRecurringRule)
    .handler(({ input, context }) =>
      runFinance(context, PlanningService, (service) => service.deleteRecurringRule(context.session.user.id, input))
    ),

  generateDueRecurringTransactions: protectedProcedure
    .route({ method: "POST", path: "/generateDueRecurringTransactions", tags: ["Planning"] })
    .input(planningInputs.generateDueRecurringTransactions)
    .handler(({ input, context }) =>
      runFinance(context, PlanningService, (service) =>
        service.generateDueRecurringTransactions(context.session.user.id, input)
      )
    ),
};

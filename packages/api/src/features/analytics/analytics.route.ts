import { protectedProcedure } from "../../shared/orpc/base";
import { runFinance } from "../../shared/finance/handler";
import { AnalyticsService } from "./analytics.service";
import { analyticsInputs } from "./analytics.schema";

export const analyticsRoutes = {
  getDailyActivity: protectedProcedure
    .route({ method: "POST", path: "/getDailyActivity", tags: ["Analytics"] })
    .handler(({ context }) =>
      runFinance(context, AnalyticsService, (service) => service.getDailyActivity(context.session.user.id))
    ),

  feedCarrotForDate: protectedProcedure
    .route({ method: "POST", path: "/feedCarrotForDate", tags: ["Analytics"] })
    .input(analyticsInputs.feedCarrotForDate)
    .handler(({ input, context }) =>
      runFinance(context, AnalyticsService, (service) => service.feedCarrotForDate(context.session.user.id, input))
    ),

  getPeriodSummary: protectedProcedure
    .route({ method: "POST", path: "/getPeriodSummary", tags: ["Analytics"] })
    .input(analyticsInputs.getPeriodSummary)
    .handler(({ input, context }) =>
      runFinance(context, AnalyticsService, (service) => service.getPeriodSummary(context.session.user.id, input))
    ),

  getCategoryBreakdown: protectedProcedure
    .route({ method: "POST", path: "/getCategoryBreakdown", tags: ["Analytics"] })
    .input(analyticsInputs.getCategoryBreakdown)
    .handler(({ input, context }) =>
      runFinance(context, AnalyticsService, (service) => service.getCategoryBreakdown(context.session.user.id, input))
    ),

  getTagBreakdown: protectedProcedure
    .route({ method: "POST", path: "/getTagBreakdown", tags: ["Analytics"] })
    .input(analyticsInputs.getTagBreakdown)
    .handler(({ input, context }) =>
      runFinance(context, AnalyticsService, (service) => service.getTagBreakdown(context.session.user.id, input))
    ),

  listBanks: protectedProcedure
    .route({ method: "POST", path: "/listBanks", tags: ["Analytics"] })
    .handler(({ context }) =>
      runFinance(context, AnalyticsService, (service) => service.listBanks(context.session.user.id))
    ),

  listCards: protectedProcedure
    .route({ method: "POST", path: "/listCards", tags: ["Analytics"] })
    .handler(({ context }) =>
      runFinance(context, AnalyticsService, (service) => service.listCards(context.session.user.id))
    ),

  listWalletFilterOptions: protectedProcedure
    .route({ method: "POST", path: "/listWalletFilterOptions", tags: ["Analytics"] })
    .handler(({ context }) =>
      runFinance(context, AnalyticsService, (service) => service.listWalletFilterOptions(context.session.user.id))
    ),

  getMonthlyTrend: protectedProcedure
    .route({ method: "POST", path: "/getMonthlyTrend", tags: ["Analytics"] })
    .input(analyticsInputs.getMonthlyTrend)
    .handler(({ input, context }) =>
      runFinance(context, AnalyticsService, (service) => service.getMonthlyTrend(context.session.user.id, input))
    ),
};

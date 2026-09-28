import type { RouterClient } from "@orpc/server";

import { importRoutes } from "./import/import.route";
import { orpcBase, protectedProcedure, publicProcedure } from "../shared/orpc/base";
import { analyticsRoutes } from "./analytics/analytics.route";
import { preferencesRoutes } from "./finance-preferences/preferences.route";
import { ledgerRoutes } from "./ledger/ledger.route";
import { planningRoutes } from "./planning/planning.route";

export const appRouter = {
  import: importRoutes,
  ledger: orpcBase.prefix("/ledger").router(ledgerRoutes),
  planning: orpcBase.prefix("/planning").router(planningRoutes),
  analytics: orpcBase.prefix("/analytics").router(analyticsRoutes),
  financePreferences: orpcBase.prefix("/finance-preferences").router(preferencesRoutes),
  healthCheck: publicProcedure.handler(() => "OK"),
  privateData: protectedProcedure.handler(({ context }) => ({
    message: "This is private",
    user: context.session.user,
  })),
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<AppRouter>;

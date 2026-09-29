import { protectedProcedure } from "../../shared/orpc/base";
import { runFinance } from "../../shared/finance/handler";
import { FinancePreferencesService } from "./preferences.service";
import { preferencesInputs } from "./preferences.schema";

export const preferencesRoutes = {
  hasCompletedOnboarding: protectedProcedure
    .route({ method: "POST", path: "/hasCompletedOnboarding", tags: ["Finance Preferences"] })
    .handler(({ context }) =>
      runFinance(context, FinancePreferencesService, (service) =>
        service.hasCompletedOnboarding(context.session.user.id)
      )
    ),

  getSetting: protectedProcedure
    .route({ method: "POST", path: "/getSetting", tags: ["Finance Preferences"] })
    .input(preferencesInputs.getSetting)
    .handler(({ input, context }) =>
      runFinance(context, FinancePreferencesService, (service) => service.getSetting(context.session.user.id, input))
    ),

  setSetting: protectedProcedure
    .route({ method: "POST", path: "/setSetting", tags: ["Finance Preferences"] })
    .input(preferencesInputs.setSetting)
    .handler(({ input, context }) =>
      runFinance(context, FinancePreferencesService, (service) => service.setSetting(context.session.user.id, input))
    ),

  getRecentSearches: protectedProcedure
    .route({ method: "POST", path: "/getRecentSearches", tags: ["Finance Preferences"] })
    .handler(({ context }) =>
      runFinance(context, FinancePreferencesService, (service) => service.getRecentSearches(context.session.user.id))
    ),

  addRecentSearch: protectedProcedure
    .route({ method: "POST", path: "/addRecentSearch", tags: ["Finance Preferences"] })
    .input(preferencesInputs.addRecentSearch)
    .handler(({ input, context }) =>
      runFinance(context, FinancePreferencesService, (service) =>
        service.addRecentSearch(context.session.user.id, input)
      )
    ),

  removeRecentSearch: protectedProcedure
    .route({ method: "POST", path: "/removeRecentSearch", tags: ["Finance Preferences"] })
    .input(preferencesInputs.removeRecentSearch)
    .handler(({ input, context }) =>
      runFinance(context, FinancePreferencesService, (service) =>
        service.removeRecentSearch(context.session.user.id, input)
      )
    ),

  getStreakSettings: protectedProcedure
    .route({ method: "POST", path: "/getStreakSettings", tags: ["Finance Preferences"] })
    .handler(({ context }) =>
      runFinance(context, FinancePreferencesService, (service) => service.getStreakSettings(context.session.user.id))
    ),

  setStreakCountMode: protectedProcedure
    .route({ method: "POST", path: "/setStreakCountMode", tags: ["Finance Preferences"] })
    .input(preferencesInputs.setStreakCountMode)
    .handler(({ input, context }) =>
      runFinance(context, FinancePreferencesService, (service) =>
        service.setStreakCountMode(context.session.user.id, input)
      )
    ),

  setStreakEnabled: protectedProcedure
    .route({ method: "POST", path: "/setStreakEnabled", tags: ["Finance Preferences"] })
    .input(preferencesInputs.setStreakEnabled)
    .handler(({ input, context }) =>
      runFinance(context, FinancePreferencesService, (service) =>
        service.setStreakEnabled(context.session.user.id, input)
      )
    ),

  resetStreakProgress: protectedProcedure
    .route({ method: "POST", path: "/resetStreakProgress", tags: ["Finance Preferences"] })
    .input(preferencesInputs.resetStreakProgress)
    .handler(({ input, context }) =>
      runFinance(context, FinancePreferencesService, (service) =>
        service.resetStreakProgress(context.session.user.id, input)
      )
    ),

  getMonthStartDay: protectedProcedure
    .route({ method: "POST", path: "/getMonthStartDay", tags: ["Finance Preferences"] })
    .handler(({ context }) =>
      runFinance(context, FinancePreferencesService, (service) => service.getMonthStartDay(context.session.user.id))
    ),

  setMonthStartDay: protectedProcedure
    .route({ method: "POST", path: "/setMonthStartDay", tags: ["Finance Preferences"] })
    .input(preferencesInputs.setMonthStartDay)
    .handler(({ input, context }) =>
      runFinance(context, FinancePreferencesService, (service) =>
        service.setMonthStartDay(context.session.user.id, input)
      )
    ),

  getCurrentPeriod: protectedProcedure
    .route({ method: "POST", path: "/getCurrentPeriod", tags: ["Finance Preferences"] })
    .input(preferencesInputs.getCurrentPeriod)
    .handler(({ input, context }) =>
      runFinance(context, FinancePreferencesService, (service) =>
        service.getCurrentPeriod(context.session.user.id, input)
      )
    ),

  resetUserData: protectedProcedure
    .route({ method: "POST", path: "/resetUserData", tags: ["Finance Preferences"] })
    .handler(({ context }) =>
      runFinance(context, FinancePreferencesService, (service) => service.resetUserData(context.session.user.id))
    ),
};

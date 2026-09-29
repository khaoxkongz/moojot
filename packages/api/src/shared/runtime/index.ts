import type { Database } from "@moojot/db";
import { Layer, ManagedRuntime } from "effect";
import { AnalyticsService } from "../../features/analytics/analytics.service";
import { FinancePreferencesService } from "../../features/finance-preferences/preferences.service";
import { LedgerService } from "../../features/ledger/ledger.service";
import { PlanningService } from "../../features/planning/planning.service";
import { PrismaProvider } from "../../providers/prisma.provider";
import { FinanceCategories } from "../finance/category.service";
import { FinanceSettings } from "../finance/settings.service";
import { ImportService } from "../../features/import/import.service";
import { GeminiProvider, type GeminiConfigurationError } from "../../features/import/gemini.provider";

export function createAppRuntime(
  prismaClient: Database,
  geminiLayer: Layer.Layer<GeminiProvider, GeminiConfigurationError>
) {
  const prismaLayer = PrismaProvider.layer(prismaClient);
  const financeSharedLayer = Layer.merge(FinanceCategories.layer, FinanceSettings.layer).pipe(
    Layer.provide(prismaLayer)
  );
  const featureDependencies = Layer.merge(prismaLayer, financeSharedLayer);
  const featureLayer = Layer.mergeAll(
    LedgerService.layer,
    PlanningService.layer,
    AnalyticsService.layer,
    FinancePreferencesService.layer
  ).pipe(Layer.provide(featureDependencies));
  const imports = ImportService.layer.pipe(Layer.provide(Layer.merge(featureLayer, geminiLayer)));
  return ManagedRuntime.make(Layer.mergeAll(featureDependencies, featureLayer, imports));
}

export type AppRuntime = ReturnType<typeof createAppRuntime>;

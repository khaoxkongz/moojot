import { createAuth } from "@moojot/auth";
import { createAppRuntime } from "@moojot/api/runtime";
import { createPrismaClient } from "@moojot/db";
import { GeminiProvider } from "@moojot/api/features/import/gemini.provider";
import { Effect } from "effect";

import { ENV } from "./env.server";

export const db = createPrismaClient(ENV);
export const apiRuntime = createAppRuntime(
  db,
  GeminiProvider.layer({ apiKey: ENV.GEMINI_API_KEY, model: ENV.GEMINI_MODEL })
);
await apiRuntime.runPromise(Effect.void);
export const auth = createAuth(ENV, db);

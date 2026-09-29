import type { Session } from "@moojot/auth";
import type { Database } from "@moojot/db";
import type { AppRuntime } from "./shared/runtime";

export type Context = {
  session: Session | null;
  db: Database;
  runtime: AppRuntime;
  geminiApiKey: string;
};

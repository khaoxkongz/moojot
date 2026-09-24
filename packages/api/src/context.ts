import type { Session } from "@moojot/auth";
import type { Database } from "@moojot/db";

export type Context = {
  session: Session | null;
  db: Database;
};

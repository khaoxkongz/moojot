import type { Context as ApiContext } from "@moojot/api/context";
import type { Context as HonoContext } from "hono";

import type { createAuth } from "@moojot/auth";

export type CreateContextOptions = {
  context: HonoContext;
  auth: ReturnType<typeof createAuth>;
  db: ApiContext["db"];
  runtime: ApiContext["runtime"];
};

export async function createContext({ context, auth, db, runtime }: CreateContextOptions): Promise<ApiContext> {
  const session = await auth.api.getSession({ headers: context.req.raw.headers });
  return {
    db,
    runtime,
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

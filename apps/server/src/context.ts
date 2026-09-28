import type { Context as ApiContext } from "@moojot/api/context";
import type { Context as HonoContext } from "hono";

import { ENV } from "./env.server";
import { apiRuntime, auth, db } from "./services";

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions): Promise<ApiContext> {
  const publicImportRequest = context.req.path === "/rpc/import/slip" || context.req.path === "/rpc/import/statement";
  const session = publicImportRequest ? null : await auth.api.getSession({ headers: context.req.raw.headers });
  return {
    db,
    runtime: apiRuntime,
    session,
    geminiApiKey: ENV.GEMINI_API_KEY,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

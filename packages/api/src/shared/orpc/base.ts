import { ORPCError, os } from "@orpc/server";

import type { Context } from "../../context";

export const orpcBase = os.$context<Context>();
export const publicProcedure = orpcBase;

const requireAuth = orpcBase.middleware(async ({ context, next }) => {
  if (!context.session?.user) throw new ORPCError("UNAUTHORIZED");
  return next({ context: { session: context.session } });
});

export const protectedProcedure = publicProcedure.use(requireAuth);

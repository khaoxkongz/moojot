import type { Database } from "@moojot/db";
import { Context, Layer } from "effect";

export class PrismaProvider extends Context.Service<PrismaProvider, { readonly prismaClient: Database }>()(
  "@moojot/api/PrismaProvider"
) {
  static layer(prismaClient: Database) {
    return Layer.succeed(PrismaProvider, { prismaClient });
  }
}

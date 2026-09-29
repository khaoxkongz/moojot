import { createAuth } from "@moojot/auth";
import { createAppRuntime } from "@moojot/api/runtime";
import { createPrismaClient } from "@moojot/db";

import { ENV } from "./env.server";

export const db = createPrismaClient(ENV);
export const apiRuntime = createAppRuntime(db);
export const auth = createAuth(ENV, db);

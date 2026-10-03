import { expo } from "@better-auth/expo";
import type { Database } from "@moojot/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { signInFacts } from "./sign-in-facts";

export type AuthConfig = {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  CORS_ORIGIN: string;
};

export function createAuth(env: AuthConfig, database: Database, desktopOrigins: readonly string[] = []) {
  return betterAuth({
    database: prismaAdapter(database, {
      provider: "mongodb",
    }),
    trustedOrigins: [
      env.CORS_ORIGIN,
      ...desktopOrigins,
      "moojot://",
      "moojot://*",
      ...(process.env.NODE_ENV === "development"
        ? [
            "exp://",
            "exp://**",
            "http://localhost:8081",
            "http://127.0.0.1:8081",
            "http://localhost:19006",
            "http://127.0.0.1:19006",
            "http://172.16.97.79:8081",
            "http://172.16.97.79:3000",
          ]
        : []),
    ],
    emailAndPassword: { enabled: true },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
    plugins: [expo(), signInFacts()],
  });
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];

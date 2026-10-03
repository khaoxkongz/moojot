import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";

/**
 * Better Auth answers every failed email sign-in with one code, `INVALID_EMAIL_OR_PASSWORD`, so the app could not
 * tell the user whether to sign up or retype the password. After that failure this plugin looks the email up and
 * replaces the code with the fact: `EMAIL_NOT_REGISTERED` or `WRONG_PASSWORD`. An account without a password
 * keeps the original code. Duplicate signup already has its own code, `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`.
 *
 * This tells anyone whether an email has an account. Signup already told them, so the design accepts it.
 */
export const SIGN_IN_FACTS = {
  EMAIL_NOT_REGISTERED: { code: "EMAIL_NOT_REGISTERED", message: "No account uses this email" },
  WRONG_PASSWORD: { code: "WRONG_PASSWORD", message: "Wrong password" },
} as const;

export function signInFacts() {
  return {
    id: "sign-in-facts",
    hooks: {
      after: [
        {
          matcher: (context) => context.path === "/sign-in/email",
          handler: createAuthMiddleware(async (ctx) => {
            const returned = ctx.context.returned;
            if (!isAPIError(returned) || returned.body?.code !== "INVALID_EMAIL_OR_PASSWORD") return;
            const email = typeof ctx.body?.email === "string" ? ctx.body.email.toLowerCase() : "";
            const record = email
              ? await ctx.context.internalAdapter.findUserByEmail(email, { includeAccounts: true })
              : null;
            if (!record) throw APIError.from("UNAUTHORIZED", SIGN_IN_FACTS.EMAIL_NOT_REGISTERED);
            const hasPassword = record.accounts.some(
              (account) => account.providerId === "credential" && Boolean(account.password)
            );
            if (hasPassword) throw APIError.from("UNAUTHORIZED", SIGN_IN_FACTS.WRONG_PASSWORD);
          }),
        },
      ],
    },
    $ERROR_CODES: SIGN_IN_FACTS,
  } satisfies BetterAuthPlugin;
}

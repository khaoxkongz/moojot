import { SimpleCsrfProtectionHandlerPlugin } from "@orpc/server/plugins";

/**
 * CSRF protection plugin that helps prevent Cross-Site Request Forgery attacks
 * by validating tokens in requests
 */
export const csrfProtection = new SimpleCsrfProtectionHandlerPlugin();

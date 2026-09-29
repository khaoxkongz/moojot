import { ResponseHeadersPlugin } from "@orpc/server/plugins";

/**
 * Plugin that allows adding custom headers to the response
 * This enables modifying response headers for each request
 */
export const allowToAddResponseHeaders = new ResponseHeadersPlugin();

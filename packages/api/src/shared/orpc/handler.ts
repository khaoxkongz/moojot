import { OpenAPIHandler } from "@orpc/openapi/fetch";
import type { Context, Router } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { allowToAddResponseHeaders, cors, csrfProtection, openapiReference } from "./plugins";

export function createRpcHandler<T extends Context>(routers: Router<any, T>) {
  return new RPCHandler(routers, {
    plugins: [cors(), Bun.env.NODE_ENV === "production" ? csrfProtection : undefined, allowToAddResponseHeaders].filter(
      (d) => !!d
    ),
  });
}

export function createOpenApiHandler<T extends Context>(routers: Router<any, T>) {
  return new OpenAPIHandler(routers, {
    plugins: [
      cors(),
      Bun.env.NODE_ENV === "production" ? csrfProtection : undefined,
      openapiReference,
      allowToAddResponseHeaders,
    ].filter((d) => !!d),
  });
}

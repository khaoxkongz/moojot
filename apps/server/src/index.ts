import { appRouter } from "@moojot/api/features/index";
import { EffectSchemaToJsonSchema } from "@moojot/api/shared/orpc/json-schema";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { SimpleCsrfProtectionHandlerPlugin } from "@orpc/server/plugins";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { initLogger } from "evlog";
import { createAuthMiddleware, type BetterAuthInstance } from "evlog/better-auth";
import { createFsDrain } from "evlog/fs";
import { evlog, type EvlogVariables } from "evlog/hono";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";

import { createContext } from "./context";
import { ENV } from "./env.server";
import { auth } from "./services";

initLogger({
  env: { service: "moojot-server" },
});

const identifyUser = createAuthMiddleware(auth as BetterAuthInstance, {
  exclude: ["/api/auth/**", "/rpc/import/**", "/rpc/finance/**"],
  maskEmail: true,
});

const app = new Hono<EvlogVariables>();
const localNativeWebOrigins = new Set([
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:19006",
  "http://127.0.0.1:19006",
  "http://172.16.97.79:8081",
]);

app.use(evlog({ drain: process.env.NODE_ENV === "production" ? undefined : createFsDrain() }));
app.use("*", async (c, next) => {
  await identifyUser(c.get("log"), c.req.raw.headers, c.req.path);
  await next();
});

app.use(
  "/*",
  cors({
    origin: (origin, c) => {
      if (origin === ENV.CORS_ORIGIN) return origin;
      return ENV.NODE_ENV === "development" &&
        (c.req.path.startsWith("/rpc/import/") ||
          c.req.path.startsWith("/rpc/finance/") ||
          c.req.path.startsWith("/api/auth/")) &&
        localNativeWebOrigins.has(origin)
        ? origin
        : "";
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
    credentials: true,
  })
);

app.on(["POST", "GET"], "/api/auth/*", async (c) => auth.handler(c.req.raw));

app.use("/rpc/import/*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  c.header("X-Content-Type-Options", "nosniff");
  await next();
});

const importRequestLimit = (maxSize: number) =>
  bodyLimit({
    maxSize,
    onError: (c) =>
      c.json(
        {
          json: {
            defined: false,
            code: "PAYLOAD_TOO_LARGE",
            status: 413,
            message: "ไฟล์มีขนาดเกินที่กำหนด",
          },
        },
        413
      ),
  });

// JSON base64 is roughly one third larger than the decoded image or PDF.
app.use("/rpc/import/slip", importRequestLimit(14 * 1024 * 1024));
app.use("/rpc/import/statement", importRequestLimit(28 * 1024 * 1024));

const exposeInOpenApi = ({ path }: { path: readonly string[] }) => path[0] !== "import";

export const apiHandler = new OpenAPIHandler(appRouter, {
  filter: exposeInOpenApi,
  plugins: [
    new SimpleCsrfProtectionHandlerPlugin(),
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter(), new EffectSchemaToJsonSchema()],
      specGenerateOptions: { filter: exposeInOpenApi },
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

export const rpcHandler = new RPCHandler(appRouter, {
  plugins: [new SimpleCsrfProtectionHandlerPlugin()],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

app.use("/*", async (c, next) => {
  const context = await createContext({ context: c });

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context: context,
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  const apiResult = await apiHandler.handle(c.req.raw, {
    prefix: "/api-reference",
    context: context,
  });

  if (apiResult.matched) {
    return c.newResponse(apiResult.response.body, apiResult.response);
  }

  await next();
});

app.get("/", (c) => {
  return c.text("OK");
});

export default app;

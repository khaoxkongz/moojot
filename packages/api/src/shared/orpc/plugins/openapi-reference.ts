import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { EffectSchemaToJsonSchema } from "../json-schema";

export const openapiReference = new OpenAPIReferencePlugin({
  docsPath: "/docs",
  specPath: "/openapi.json",
  schemaConverters: [new EffectSchemaToJsonSchema()],
  specGenerateOptions: {
    info: {
      title: "Task management API",
      version: "1.0.0",
    },
    security: [],
    servers: [
      {
        description: `${Bun.env.NODE_ENV} server`,
        url: `${Bun.env.SELF_URL}/api`,
      },
    ],
  },
});

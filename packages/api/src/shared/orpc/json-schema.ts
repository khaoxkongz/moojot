import type { AnySchema } from "@orpc/contract";
import type { ConditionalSchemaConverter, JSONSchema, SchemaConvertOptions } from "@orpc/openapi";
import * as S from "effect/Schema";

export class EffectSchemaToJsonSchema implements ConditionalSchemaConverter {
  condition(schema: AnySchema | undefined): boolean {
    return schema !== undefined && schema["~standard"]?.vendor === "effect";
  }

  convert(
    schema: AnySchema | undefined,
    _options: SchemaConvertOptions
  ): [required: boolean, jsonSchema: Exclude<JSONSchema, boolean>] {
    const doc = S.toJsonSchemaDocument(schema as any);
    const jsonSchema = {
      ...doc.schema,
      ...(Object.keys(doc.definitions).length > 0 ? { $defs: doc.definitions } : {}),
    } as Exclude<JSONSchema, boolean>;
    return [true, jsonSchema];
  }
}

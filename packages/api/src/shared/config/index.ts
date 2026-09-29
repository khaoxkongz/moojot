import { Effect, Match, SchemaGetter } from "effect";
import * as S from "effect/Schema";

const BooleanFromString = S.Literals(["true", "false"]).pipe(
  S.decodeTo(S.Boolean, {
    decode: SchemaGetter.transform((s: "true" | "false") => s === "true"),
    encode: SchemaGetter.transform((b: boolean) => (b ? "true" : "false")),
  })
);

const EnvSchema = S.Struct({
  CORS_ORIGIN: S.String.pipe(
    S.decodeTo(S.Array(S.String), {
      decode: SchemaGetter.transform((a: string) => a.split(",").map((url) => url.trim())),
      encode: SchemaGetter.transform((i: readonly string[]) => i.join(",")),
    })
  ),
  DATABASE_URL: S.String,
  MINIO_ACCESS_KEY: S.NonEmptyString,
  MINIO_ENDPOINT: S.NonEmptyString,
  MINIO_PORT: S.NumberFromString.pipe(S.withDecodingDefault(Effect.succeed("9000"))),
  MINIO_SECRET_KEY: S.NonEmptyString,
  MINIO_USE_SSL: BooleanFromString.pipe(S.withDecodingDefault(Effect.succeed("false"))),
  NODE_ENV: S.Literals(["development", "production", "test", "uat"]).pipe(
    S.withDecodingDefault(Effect.succeed("development"))
  ),
  PORT: S.NumberFromString.pipe(S.withDecodingDefault(Effect.succeed("3333"))),
  REDIS_URL: S.NonEmptyString,
  SELF_URL: S.NonEmptyString,
});

export type EnvEncoded = typeof EnvSchema.Encoded;

export function getEnvs() {
  const config = S.decodeUnknownSync(EnvSchema)(Bun.env);
  return {
    ...config,
    MINIO_SERVER_URL: Match.value(config.MINIO_USE_SSL).pipe(
      Match.when(true, () => `https://${config.MINIO_ENDPOINT}:${config.MINIO_PORT}`),
      Match.when(false, () => `http://${config.MINIO_ENDPOINT}:${config.MINIO_PORT}`),
      Match.exhaustive
    ),
  };
}

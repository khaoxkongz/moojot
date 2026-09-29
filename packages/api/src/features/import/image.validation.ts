import { Effect, Schema } from "effect";
import sharp from "sharp";
import { ImportError } from "./import.error";
import { AssetId, AutoImportInput, InputFields } from "./import.schema";

const maxBytes = 10 * 1024 * 1024;
const Base64 = Schema.String.check(
  Schema.makeFilter((value) => value.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(value))
);

export const validateImage = Effect.fn("validateImage")(function* (raw: unknown) {
  const fields = yield* Schema.decodeUnknownEffect(InputFields)(raw, { onExcessProperty: "error" }).pipe(
    Effect.mapError(() => new ImportError({ code: "INVALID_REQUEST" }))
  );
  const assetId = yield* Schema.decodeUnknownEffect(AssetId)(fields.assetId).pipe(
    Effect.mapError(() => new ImportError({ code: "INVALID_ASSET_ID" }))
  );
  if (fields.fileBase64 === undefined || fields.fileBase64 === "" || fields.fileBase64 === null) {
    return yield* new ImportError({ code: "FILE_REQUIRED" });
  }
  const fileBase64 = yield* Schema.decodeUnknownEffect(Schema.String)(fields.fileBase64).pipe(
    Effect.mapError(() => new ImportError({ code: "INVALID_FILE" }))
  );
  if (fileBase64.length > Math.ceil(maxBytes / 3) * 4) return yield* new ImportError({ code: "FILE_TOO_LARGE" });
  yield* Schema.decodeUnknownEffect(Base64)(fileBase64).pipe(
    Effect.mapError(() => new ImportError({ code: "INVALID_FILE" }))
  );
  const bytes = yield* Effect.sync(() => Buffer.from(fileBase64, "base64"));
  if (bytes.byteLength > maxBytes) return yield* new ImportError({ code: "FILE_TOO_LARGE" });
  if (bytes.toString("base64") !== fileBase64) return yield* new ImportError({ code: "INVALID_FILE" });
  const mimeType = yield* Schema.decodeUnknownEffect(AutoImportInput.fields.mimeType)(fields.mimeType).pipe(
    Effect.mapError(() => new ImportError({ code: "UNSUPPORTED_IMAGE" }))
  );
  const detected = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ? "image/png"
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      ? "image/jpeg"
      : undefined;
  if (!detected) return yield* new ImportError({ code: "UNSUPPORTED_IMAGE" });
  // Recognized but truncated images are corrupt, even if the caller also supplied the wrong MIME.
  yield* Effect.tryPromise({
    try: (signal) => {
      const image = sharp(bytes, { failOn: "warning" });
      const abort = () => image.destroy();
      signal.addEventListener("abort", abort, { once: true });
      return image.stats().finally(() => signal.removeEventListener("abort", abort));
    },
    catch: () => new ImportError({ code: "INVALID_FILE" }),
  });
  if (detected !== mimeType) return yield* new ImportError({ code: "UNSUPPORTED_FILE" });
  return { assetId, fileBase64, mimeType } satisfies AutoImportInput;
});

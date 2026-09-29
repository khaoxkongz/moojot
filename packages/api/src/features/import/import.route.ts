import { ORPCError } from "@orpc/server";
import { Cause, Exit, Result, Schema } from "effect";
import { protectedProcedure } from "../../shared/orpc/base";
import { ImportError, importErrors } from "./import.error";
import { AutoImportInput, ImportOutcome } from "./import.schema";
import { ImportService } from "./import.service";

// Validation runs inside ImportService so field-specific failures share one error adapter.
const transportInput = {
  "~standard": {
    version: 1 as const,
    vendor: "import-transport",
    validate: (value: unknown) => ({ value: value as AutoImportInput }),
  },
};

export const importRoutes = {
  autoImportSlip: protectedProcedure
    .route({ method: "POST", path: "/import/slip/auto-import", tags: ["Import"] })
    .errors(importErrors)
    .input(transportInput)
    .output(Schema.toStandardSchemaV1(ImportOutcome))
    .handler(async ({ context, input, signal }) => {
      const exit = await context.runtime.runPromiseExit(
        ImportService.use((service) => service.autoImportSlip(context.session.user.id, input, signal))
      );
      if (Exit.isSuccess(exit)) return exit.value;
      const failure = Cause.findError(exit.cause);
      const error =
        Result.isSuccess(failure) && failure.success instanceof ImportError
          ? failure.success
          : new ImportError({ code: "IMPORT_FAILED" });
      if (importErrors[error.code].status === 429)
        context.resHeaders?.set("Retry-After", String(error.retryAfter ?? 30));
      throw new ORPCError(error.code, { ...importErrors[error.code], defined: true });
    }),
};

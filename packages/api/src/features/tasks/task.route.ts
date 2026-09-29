import { ExitHelpers } from "@/shared/effect";
import { orpcBase } from "@/shared/orpc/base";
import { cacheMiddleware } from "@/shared/orpc/middlewares/cache.middleware";
import { AppRuntime } from "@/shared/runtime";
import { Duration, Effect, pipe } from "effect";
import * as S from "effect/Schema";
import { TaskArraySchemaStd, TaskCreateSchema, TaskSchemaStd } from "./task.schema";
import { TaskService } from "./task.service";

const tags = ["Task"] as const;

const createTaskRoute = orpcBase
  .route({
    description: "create task",
    inputStructure: "detailed",
    method: "POST",
    path: "/",
    tags,
  })
  .input(
    pipe(
      S.Struct({
        body: TaskCreateSchema,
      }),
      S.toStandardSchemaV1
    )
  )
  .output(TaskSchemaStd)
  .errors({
    BAD_REQUEST: {
      data: pipe(S.Unknown, S.toStandardSchemaV1),
    },
    INTERNAL_SERVER_ERROR: {
      data: S.Unknown.pipe(S.toStandardSchemaV1),
    },
  })
  .handler(async ({ context: _ctx, errors, input }) => {
    const exit = await AppRuntime.runPromiseExit(
      Effect.gen(function* () {
        const svc = yield* TaskService;
        return yield* svc.create(input.body);
      }).pipe(Effect.catch((error) => Effect.fail(errors.INTERNAL_SERVER_ERROR({ data: error }))))
    );
    return ExitHelpers.getDataOrThrowRawError(exit);
  });

const getTaskByIdRoute = orpcBase
  .route({
    description: "get example template",
    inputStructure: "detailed",
    method: "GET",
    path: "/:taskId",
    successStatus: 200,
    tags,
  })
  .input(
    pipe(
      S.Struct({
        params: S.Struct({
          taskId: S.NumberFromString.pipe(S.brand("TaskId")),
        }),
      }),
      S.toStandardSchemaV1
    )
  )
  .output(TaskSchemaStd)
  .errors({
    BAD_REQUEST: {
      data: pipe(S.Unknown, S.toStandardSchemaV1),
    },
    INTERNAL_SERVER_ERROR: {
      data: S.Unknown.pipe(S.toStandardSchemaV1),
    },
    NOT_FOUND: {
      data: pipe(S.Unknown, S.toStandardSchemaV1),
    },
  })
  .handler(async ({ context: _ctx, errors, input }) => {
    const exit = await AppRuntime.runPromiseExit(
      Effect.gen(function* () {
        const svc = yield* TaskService;
        return yield* svc.getById(input.params.taskId);
      }).pipe(
        Effect.catchTags({
          NoSuchElementException: (error) => Effect.fail(errors.NOT_FOUND({ data: error })),
          SchemaError: (error) => Effect.fail(errors.INTERNAL_SERVER_ERROR({ data: error })),
          "Task/GetById/Error": (error) => Effect.fail(errors.INTERNAL_SERVER_ERROR({ data: error })),
        })
      )
    );
    return ExitHelpers.getDataOrThrowRawError(exit);
  });

const updateTaskRoute = orpcBase
  .route({
    description: "update task",
    inputStructure: "detailed",
    method: "PUT",
    path: "/:taskId",
    tags,
  })
  .input(
    S.Struct({
      body: TaskCreateSchema,
      params: S.Struct({
        taskId: S.NumberFromString.pipe(S.brand("TaskId")),
      }),
    }).pipe(S.toStandardSchemaV1)
  )
  .output(TaskSchemaStd)
  .errors({
    BAD_REQUEST: {
      data: pipe(S.Unknown, S.toStandardSchemaV1),
    },
    INTERNAL_SERVER_ERROR: {
      data: S.Unknown.pipe(S.toStandardSchemaV1),
    },
    NOT_FOUND: {
      data: S.Unknown.pipe(S.toStandardSchemaV1),
    },
  })
  .handler(async ({ errors, input }) => {
    const exit = await AppRuntime.runPromiseExit(
      Effect.gen(function* () {
        const svc = yield* TaskService;
        return yield* svc.update(input.params.taskId, input.body);
      }).pipe(Effect.catch((error) => Effect.fail(errors.INTERNAL_SERVER_ERROR({ data: error }))))
    );
    return ExitHelpers.getDataOrThrowRawError(exit);
  });

const deleteTaskRoute = orpcBase
  .route({
    description: "delete task",
    inputStructure: "detailed",
    method: "DELETE",
    path: "/:taskId",
    successStatus: 200,
    tags,
  })
  .input(
    S.Struct({
      params: S.Struct({
        taskId: S.NumberFromString.pipe(S.brand("TaskId")),
      }),
    }).pipe(S.toStandardSchemaV1)
  )
  .output(TaskSchemaStd)
  .errors({
    INTERNAL_SERVER_ERROR: {
      data: S.Unknown.pipe(S.toStandardSchemaV1),
    },
    NOT_FOUND: {
      data: S.Unknown.pipe(S.toStandardSchemaV1),
    },
  })
  .handler(async ({ errors, input }) => {
    const exit = await AppRuntime.runPromiseExit(
      Effect.gen(function* () {
        const svc = yield* TaskService;
        return yield* svc.deleteById(input.params.taskId);
      }).pipe(
        Effect.catchTags({
          NoSuchElementException: (error) => Effect.fail(errors.NOT_FOUND({ data: error })),
          SchemaError: (error) => Effect.fail(errors.INTERNAL_SERVER_ERROR({ data: error })),
          "Task/Delete/Error": (error) => Effect.fail(errors.INTERNAL_SERVER_ERROR({ data: error })),
        })
      )
    );
    return ExitHelpers.getDataOrThrowRawError(exit);
  });

const getTasksRoute = orpcBase
  .route({
    description: "get tasks",
    inputStructure: "detailed",
    method: "GET",
    path: "/",
    successStatus: 200,
    tags,
  })
  .input(
    pipe(
      S.Struct({
        query: S.Struct({
          itemsPerPage: S.NumberFromString.pipe(S.withDecodingDefault(Effect.succeed("10"))),
          page: S.NumberFromString.pipe(S.withDecodingDefault(Effect.succeed("1"))),
        }),
      }),
      S.toStandardSchemaV1
    )
  )
  .output(TaskArraySchemaStd)
  .errors({
    INTERNAL_SERVER_ERROR: {
      data: S.Unknown.pipe(S.toStandardSchemaV1),
    },
  })
  .use(cacheMiddleware(Duration.minutes(1)))
  .handler(async ({ context, errors, input }) => {
    const exit = await AppRuntime.runPromiseExit(
      Effect.gen(function* () {
        const svc = yield* TaskService;
        const data = yield* svc.getAll(input.query);
        context.resHeaders?.set("x-data-page", input.query.page.toString());
        return data;
      }).pipe(
        Effect.catchTags({
          SchemaError: (error) => Effect.fail(errors.INTERNAL_SERVER_ERROR({ data: error })),
          "Task/GetAll/Error": (error) => Effect.fail(errors.INTERNAL_SERVER_ERROR({ data: error })),
        })
      )
    );
    return ExitHelpers.getDataOrThrowRawError(exit);
  });

export const taskRoutes = {
  createTaskRoute,
  deleteTaskRoute,
  getTaskByIdRoute,
  getTasksRoute,
  updateTaskRoute,
};

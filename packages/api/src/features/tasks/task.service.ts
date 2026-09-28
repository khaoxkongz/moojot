import { PrismaProvider } from "@/providers/prisma/prisma.provider";
import { Context, Data, Effect, Layer } from "effect";
import { TaskCreateError, TaskDeleteError, TaskGetAllError, TaskGetByIdError, TaskUpdateError } from "./task.errors";
import type { TaskCreateSchema, TaskId } from "./task.schema";
import { taskSchemaArrayConvertor, taskSchemaConvertor } from "./task.schema";

export class NoSuchElementException extends Data.TaggedError("NoSuchElementException") {}

const makeTaskService = Effect.gen(function* () {
  const { prismaClient: pc } = yield* PrismaProvider;

  const create = (data: TaskCreateSchema) =>
    Effect.tryPromise({
      catch: TaskCreateError.new(),
      try: () =>
        pc.task.create({
          data,
        }),
    }).pipe(Effect.andThen(taskSchemaConvertor.fromObjectToSchemaEffect));

  const getById = (id: TaskId) =>
    Effect.gen(function* () {
      const task = yield* Effect.tryPromise({
        catch: TaskGetByIdError.new(),
        try: () =>
          pc.task.findUnique({
            where: {
              id,
            },
          }),
      });

      if (task === null) {
        return yield* new NoSuchElementException();
      }

      return yield* taskSchemaConvertor.fromObjectToSchemaEffect(task);
    });

  const getAll = (config: { itemsPerPage: number; page: number }) =>
    Effect.tryPromise({
      catch: TaskGetAllError.new(),
      try: () =>
        pc.task.findMany({
          skip: (config.page - 1) * config.itemsPerPage,
          take: config.itemsPerPage,
        }),
    }).pipe(Effect.andThen(taskSchemaArrayConvertor.fromObjectToSchemaEffect));

  const update = (id: TaskId, data: TaskCreateSchema) =>
    Effect.tryPromise({
      catch: TaskUpdateError.new(),
      try: () =>
        pc.task.update({
          data,
          where: {
            id,
          },
        }),
    }).pipe(Effect.andThen(taskSchemaConvertor.fromObjectToSchemaEffect));

  const deleteById = (id: TaskId) =>
    Effect.tryPromise({
      catch: (e) => {
        if (typeof e === "object" && e !== null && "code" in e && (e as { code?: unknown }).code === "P2025") {
          return new NoSuchElementException();
        }
        return TaskDeleteError.new()(e);
      },
      try: () =>
        pc.task.delete({
          where: {
            id,
          },
        }),
    }).pipe(Effect.andThen(taskSchemaConvertor.fromObjectToSchemaEffect));

  return {
    create,
    deleteById,
    getAll,
    getById,
    update,
  };
});

export type TaskServiceShape = Effect.Success<typeof makeTaskService>;

export class TaskService extends Context.Service<TaskService, TaskServiceShape>()("Service/Task") {
  static readonly layer = Layer.effect(TaskService, makeTaskService).pipe(Layer.provide(PrismaProvider.Default));
  static readonly Default = TaskService.layer;
}

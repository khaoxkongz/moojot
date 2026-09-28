import { EffectHelpers } from "@/shared/effect";
import * as S from "effect/Schema";

export const TaskId = S.Number.pipe(S.brand("TaskId"));
export type TaskId = typeof TaskId.Type;

export const TaskSchema = S.Struct({ desc: S.String, id: TaskId, title: S.String });
export const TaskSchemaStd = S.toStandardSchemaV1(TaskSchema);
export type TaskSchema = typeof TaskSchema.Type;
export type TaskEncoded = typeof TaskSchema.Encoded;
export const taskSchemaConvertor = EffectHelpers.convertFrom(TaskSchema);

/**
 * Schema definition for an array of Tasks
 */
export const TaskArraySchema = S.Array(TaskSchema);
export const TaskArraySchemaStd = S.toStandardSchemaV1(TaskArraySchema);
export type TaskArraySchema = typeof TaskArraySchema.Type;
export type TaskArrayEncoded = typeof TaskArraySchema.Encoded;
export const taskSchemaArrayConvertor = EffectHelpers.convertFrom(TaskArraySchema);

/**
 * Schema definition for creating a new Task
 * Omits the 'id' field since it will be generated on creation
 */
export const TaskCreateSchema = S.Struct({ desc: S.String, title: S.String });
export const TaskCreateSchemaStd = S.toStandardSchemaV1(TaskCreateSchema);
export type TaskCreateSchema = typeof TaskCreateSchema.Type;
export type TaskCreateEncoded = typeof TaskCreateSchema.Encoded;
export const taskSChemaCreateConvertor = EffectHelpers.convertFrom(TaskCreateSchema);

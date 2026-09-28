import { EffectHelpers } from "@/shared/effect";
import { Data } from "effect";

export class TaskCreateError extends Data.TaggedError("Task/Create/Error")<EffectHelpers.ErrorMsg> {
  static new = EffectHelpers.createErrorFactory(this);
}

export class TaskGetByIdError extends Data.TaggedError("Task/GetById/Error")<EffectHelpers.ErrorMsg> {
  static new = EffectHelpers.createErrorFactory(this);
}

export class TaskGetAllError extends Data.TaggedError("Task/GetAll/Error")<EffectHelpers.ErrorMsg> {
  static new = EffectHelpers.createErrorFactory(this);
}

export class TaskUpdateError extends Data.TaggedError("Task/Update/Error")<EffectHelpers.ErrorMsg> {
  static new = EffectHelpers.createErrorFactory(this);
}

export class TaskDeleteError extends Data.TaggedError("Task/Delete/Error")<EffectHelpers.ErrorMsg> {
  static new = EffectHelpers.createErrorFactory(this);
}

import { Cause, Exit } from "effect";

export function getDataOrThrowRawError<A, E = never>(exit: Exit.Exit<A, E>) {
  return Exit.match(exit, {
    onFailure: (error) => {
      const err = Cause.squash(error);
      throw err;
    },
    onSuccess: (data) => data,
  });
}

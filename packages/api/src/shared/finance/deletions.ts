import type { Database, Prisma } from "@moojot/db";
import { Effect, Predicate } from "effect";

import { FinanceConflictError, FinanceNotFoundError, financeOperation } from "./error";

/**
 * Delete with undo. The server keeps what a delete removed in a FinanceDeletion record, so “เอากลับคืน” brings back the
 * same IDs and fields, never a copy made from the name. Each kind supplies two steps that run in one transaction:
 * `remove` deletes and returns the snapshot its `restore` needs, and `restore` puts that snapshot back or throws a
 * FinanceConflictError when it cannot be put back whole. Budgets use it; rules, categories and tags reuse it.
 */
export type DeletionKind = "budget";

type Tx = Prisma.TransactionClient;

/** How long a finished delete can still be found again by a repeated request or undone. */
const KEEP_DELETIONS_MS = 7 * 24 * 60 * 60 * 1000;

/** Tries of a delete that lost a write conflict: the next try sees the other request's delete and answers with it. */
const DELETE_TRIES = 3;

const isWriteConflict = (error: unknown) =>
  Predicate.isObject(error) && "code" in error && (error.code === "P2034" || error.code === "P2002");

async function inTransaction<A>(db: Database, run: (tx: Tx) => Promise<A>, tries = 1): Promise<A> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await db.$transaction(run);
    } catch (error) {
      if (!isWriteConflict(error)) throw error;
      if (attempt < tries) continue;
      // Two requests changed the same records at once, or a unique target is taken: nothing was written.
      throw new FinanceConflictError({ message: "The record changed while it was being deleted or restored" });
    }
  }
}

/**
 * Keeps what a removal took, inside the caller's transaction, and returns the deletion's ID. `deleteWithUndo` uses it,
 * and so does any step that removes a record on the way to something else (an edited budget replacing the budget of
 * its new target), so every removal can be undone the same way.
 */
export async function keepDeletion(
  tx: Tx,
  input: { userId: string; kind: DeletionKind; targetId: string; snapshot: Prisma.InputJsonObject }
): Promise<string> {
  // restoredAt is written as null: on MongoDB a `restoredAt: null` filter does not match an unset field.
  const record = await tx.financeDeletion.create({ data: { ...input, restoredAt: null } });
  return record.id;
}

/** Drops deletions too old to undo. Best effort: the delete has already happened, so a failure here is only logged. */
function pruneOldDeletions(db: Database, userId: string) {
  return Effect.tryPromise(() =>
    db.financeDeletion.deleteMany({ where: { userId, createdAt: { lt: new Date(Date.now() - KEEP_DELETIONS_MS) } } })
  ).pipe(
    Effect.asVoid,
    Effect.catchCause((cause) => Effect.logWarning("Pruning old deletions failed; the delete itself succeeded", cause))
  );
}

/**
 * Deletes one record and keeps what it removed. Repeating the delete of a record that is already gone returns the
 * same deletion, so a retried request never fails or leaves two undo records. Two deletes of the same record at once
 * get the same answer too: the one that loses the write conflict tries again and finds the other's deletion.
 */
export function deleteWithUndo(
  db: Database,
  input: {
    userId: string;
    kind: DeletionKind;
    targetId: string;
    remove: (tx: Tx) => Promise<Prisma.InputJsonObject | null>;
  }
) {
  const { userId, kind, targetId } = input;
  return financeOperation(`delete ${kind}`, () =>
    inTransaction(
      db,
      async (tx) => {
        const snapshot = await input.remove(tx);
        if (snapshot) return keepDeletion(tx, { userId, kind, targetId, snapshot });
        const earlier = await tx.financeDeletion.findFirst({
          where: { userId, kind, targetId, restoredAt: null },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });
        if (!earlier) throw new FinanceNotFoundError({ message: `This ${kind} does not exist` });
        return earlier.id;
      },
      DELETE_TRIES
    )
  ).pipe(
    Effect.tap(() => pruneOldDeletions(db, userId)),
    Effect.map((deletionId) => ({ deletionId }))
  );
}

/**
 * Restores what one deletion removed, once. Another user's deletion, or one of another kind, is not found. Repeating a
 * restore that already happened returns `current` (the record as it is now) instead of making a copy.
 */
export async function restoreDeletion<A>(
  db: Database,
  input: {
    userId: string;
    kind: DeletionKind;
    deletionId: string;
    restore: (tx: Tx, snapshot: unknown) => Promise<A>;
    current: (tx: Tx, targetId: string) => Promise<A | null>;
  }
): Promise<A> {
  const { userId, kind, deletionId } = input;
  return inTransaction(db, async (tx) => {
    const deletion = await tx.financeDeletion.findFirst({ where: { id: deletionId, userId, kind } });
    if (!deletion) throw new FinanceNotFoundError({ message: "This delete cannot be undone" });
    if (deletion.restoredAt) {
      const current = await input.current(tx, deletion.targetId);
      if (current === null) {
        throw new FinanceConflictError({ message: `This ${kind} was restored and deleted again` });
      }
      return current;
    }
    // Claiming the record first makes a second restore running at the same time conflict instead of copying.
    await tx.financeDeletion.update({ where: { id: deletion.id }, data: { restoredAt: new Date() } });
    return input.restore(tx, deletion.snapshot);
  });
}

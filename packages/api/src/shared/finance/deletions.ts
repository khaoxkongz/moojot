import type { Database, Prisma } from "@moojot/db";
import { Predicate } from "effect";

import { FinanceConflictError, FinanceNotFoundError } from "./error";

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

const isWriteConflict = (error: unknown) =>
  Predicate.isObject(error) && "code" in error && (error.code === "P2034" || error.code === "P2002");

async function inTransaction<A>(db: Database, run: (tx: Tx) => Promise<A>): Promise<A> {
  try {
    return await db.$transaction(run);
  } catch (error) {
    // Two requests changed the same records at once, or a unique target is taken: nothing was written.
    if (isWriteConflict(error)) {
      throw new FinanceConflictError({ message: "The record changed while it was being deleted or restored" });
    }
    throw error;
  }
}

/**
 * Deletes one record and keeps what it removed. Repeating the delete of a record that is already gone returns the
 * same deletion, so a retried request never fails or leaves two undo records.
 */
export async function deleteWithUndo(
  db: Database,
  input: {
    userId: string;
    kind: DeletionKind;
    targetId: string;
    remove: (tx: Tx) => Promise<Prisma.InputJsonObject | null>;
  }
): Promise<{ deletionId: string }> {
  const { userId, kind, targetId } = input;
  const deletionId = await inTransaction(db, async (tx) => {
    const snapshot = await input.remove(tx);
    if (!snapshot) {
      const earlier = await tx.financeDeletion.findFirst({
        where: { userId, kind, targetId, restoredAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (!earlier) throw new FinanceNotFoundError({ message: `This ${kind} does not exist` });
      return earlier.id;
    }
    // restoredAt is written as null: on MongoDB a `restoredAt: null` filter does not match an unset field.
    const record = await tx.financeDeletion.create({ data: { userId, kind, targetId, snapshot, restoredAt: null } });
    return record.id;
  });
  await db.financeDeletion.deleteMany({
    where: { userId, createdAt: { lt: new Date(Date.now() - KEEP_DELETIONS_MS) } },
  });
  return { deletionId };
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

import type { FinanceTransaction } from "../../types/finance";
import { needsCategory, sourceLabel } from "../home/home-days";
import { shortThaiDate } from "../home/period";
import { bankDisplayName } from "../wallets/banks";
import { walletCardLabel } from "../wallets/cards";

/**
 * The pending-category queue: the entries of one scope (today's pending link, one row, a Summary group) that wait for
 * a category, shown one at a time. Picking saves and moves on; skipping moves on and leaves the entry pending.
 */
export type CategoryQueue = { ids: string[]; index: number };

/** A queue of the given entries that still wait for a category, in the order given; null when none do. */
export function openCategoryQueue(entries: Pick<FinanceTransaction, "id" | "kind" | "categoryId">[]) {
  const ids = entries.filter(needsCategory).map((entry) => entry.id);
  return ids.length ? ({ ids, index: 0 } satisfies CategoryQueue) : null;
}

/** "2 จาก 3" while there is more than one entry. */
export function queueProgress(queue: CategoryQueue) {
  return queue.ids.length > 1 ? `${queue.index + 1} จาก ${queue.ids.length}` : null;
}

/** “ข้ามไปก่อน” only shows while there is a later entry to skip to. */
export const canSkipInQueue = (queue: CategoryQueue) => queue.index + 1 < queue.ids.length;

/** The queue after the current entry, by a pick or a skip; null when it was the last. */
export function nextInQueue(queue: CategoryQueue): CategoryQueue | null {
  return canSkipInQueue(queue) ? { ...queue, index: queue.index + 1 } : null;
}

/**
 * The entry to show now. Entries that got a category or were deleted elsewhere meanwhile (the editor opened from the
 * queue) are passed over; null when nothing in the rest of the queue still waits.
 */
export function currentInQueue(queue: CategoryQueue, isPending: (id: string) => boolean) {
  for (let index = queue.index; index < queue.ids.length; index++) {
    const id = queue.ids[index]!;
    if (isPending(id)) return { queue: { ...queue, index }, id };
  }
  return null;
}

/** The toast after the last pick: whether anything anywhere still waits for a category. */
export const queueDoneMessage = (stillPending: number) => (stillPending > 0 ? "บันทึกหมวดแล้ว" : "เลือกหมวดครบแล้ว");

/** The queue card's second line: "กสิกรไทย · สลิป · วันนี้". The entry's time of day is not recorded, so none is shown. */
export function queueEntryMeta(
  entry: Pick<FinanceTransaction, "bank" | "cardName" | "cardLast4" | "source" | "occurredOn">,
  today: string
) {
  const wallet = entry.cardName?.trim()
    ? walletCardLabel({ cardName: entry.cardName, cardLast4: entry.cardLast4 })
    : entry.bank?.trim()
      ? bankDisplayName(entry.bank)
      : "ไม่ระบุบัญชี";
  const day = entry.occurredOn === today ? "วันนี้" : shortThaiDate(entry.occurredOn);
  return `${wallet} · ${sourceLabel(entry.source)} · ${day}`;
}

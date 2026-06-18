import { getClientDb } from "./db";
import type { PendingOp } from "./types";

type ReviewOpInput = Omit<Extract<PendingOp, { kind: "review" }>, "kind">;
type ReviewPendingOp = Extract<PendingOp, { kind: "review" }>;

export async function enqueueOp(op: PendingOp): Promise<number> {
  const db = getClientDb();
  const localId = (await db.pendingOps.add(op)) as number;
  // Lazy import avoids a module cycle with sync.ts.
  const { syncEngine } = await import("./sync");
  syncEngine.scheduleFlush();
  return localId;
}

/**
 * Coalesce repeated offline ratings of the same card into one pending review
 * op, keeping the MOST RECENT rating (last-write-wins).
 *
 * Rationale: the local IndexedDB progress already reflects each rating applied
 * in sequence, and the server applies SM-2 once per flushed op before the next
 * snapshot reconciles local progress back to the server's result. Keeping the
 * latest rating means the user's most recent self-assessment wins; the prior
 * "keep the strongest rating" behavior could hide a fresh lapse (you forgot a
 * card you'd earlier marked easy), which is the wrong spaced-repetition signal.
 * Cross-device additivity is preserved: each device still flushes its own
 * latest rating, and the server applies them in order.
 */
export async function enqueueReviewOp(op: ReviewOpInput): Promise<number> {
  const db = getClientDb();
  const reviews = (await db.pendingOps
    .where("kind")
    .equals("review")
    .toArray()) as ReviewPendingOp[];
  const [keeper, ...duplicates] = reviews
    .filter((pending) => pending.cardId === op.cardId)
    .sort((a, b) => (a.localId ?? 0) - (b.localId ?? 0));

  if (!keeper) {
    return enqueueOp({ kind: "review", ...op });
  }

  const duplicateIds = duplicates
    .map((pending) => pending.localId)
    .filter((localId): localId is number => localId != null);

  await db.transaction("rw", db.pendingOps, async () => {
    if (keeper.localId != null) {
      await db.pendingOps.update(keeper.localId, {
        quality: op.quality,
        createdAt: op.createdAt,
        attempts: 0,
        lastError: undefined,
      } as Partial<PendingOp>);
    }
    if (duplicateIds.length) {
      await db.pendingOps.bulkDelete(duplicateIds);
    }
  });

  const { syncEngine } = await import("./sync");
  syncEngine.scheduleFlush();
  return keeper.localId!;
}

export async function pendingOpCount(): Promise<number> {
  const db = getClientDb();
  return db.pendingOps.count();
}

export async function listPendingOps(): Promise<PendingOp[]> {
  const db = getClientDb();
  return db.pendingOps.orderBy("localId").toArray();
}

export async function removeOp(localId: number): Promise<void> {
  const db = getClientDb();
  await db.pendingOps.delete(localId);
}

export async function updateOp(
  localId: number,
  patch: Partial<PendingOp>
): Promise<void> {
  const db = getClientDb();
  await db.pendingOps.update(localId, patch as { [key: string]: unknown });
}

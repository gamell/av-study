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
 * Review ops represent a card's sync-period scheduling result. When multiple
 * offline ratings exist for one card, keep the strongest pending rating.
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

  const strongestQuality = Math.max(keeper.quality, op.quality);
  const duplicateIds = duplicates
    .map((pending) => pending.localId)
    .filter((localId): localId is number => localId != null);

  await db.transaction("rw", db.pendingOps, async () => {
    if (keeper.localId != null && strongestQuality !== keeper.quality) {
      await db.pendingOps.update(keeper.localId, {
        quality: strongestQuality,
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

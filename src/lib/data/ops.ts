import { getClientDb } from "./db";
import type { PendingOp } from "./types";

export async function enqueueOp(op: PendingOp): Promise<number> {
  const db = getClientDb();
  const localId = (await db.pendingOps.add(op)) as number;
  // Lazy import avoids a module cycle with sync.ts.
  const { syncEngine } = await import("./sync");
  syncEngine.scheduleFlush();
  return localId;
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

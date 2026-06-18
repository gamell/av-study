import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, test } from "bun:test";

beforeEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: globalThis,
  });
});

afterEach(async () => {
  const { getClientDb } = await import("../db");
  const db = getClientDb();
  await db.pendingOps.clear();
});

test("coalesces repeated ratings for a card, keeping the most recent (ascending)", async () => {
  const { enqueueReviewOp, listPendingOps } = await import("../ops");

  await enqueueReviewOp({
    cardId: 42,
    quality: 2,
    createdAt: "2026-05-02T10:00:00.000Z",
    attempts: 0,
  });
  await enqueueReviewOp({
    cardId: 42,
    quality: 5,
    createdAt: "2026-05-02T10:01:00.000Z",
    attempts: 0,
  });

  const ops = await listPendingOps();
  expect(ops).toHaveLength(1);
  expect(ops[0]).toMatchObject({
    kind: "review",
    cardId: 42,
    quality: 5,
    createdAt: "2026-05-02T10:01:00.000Z",
  });
});

test("keeps the most recent rating even when it is weaker (last-write-wins)", async () => {
  const { enqueueReviewOp, listPendingOps } = await import("../ops");

  await enqueueReviewOp({
    cardId: 42,
    quality: 5,
    createdAt: "2026-05-02T10:00:00.000Z",
    attempts: 0,
  });
  await enqueueReviewOp({
    cardId: 42,
    quality: 2,
    createdAt: "2026-05-02T10:01:00.000Z",
    attempts: 0,
  });

  const ops = await listPendingOps();
  expect(ops).toHaveLength(1);
  expect(ops[0]).toMatchObject({
    kind: "review",
    cardId: 42,
    quality: 2,
    createdAt: "2026-05-02T10:01:00.000Z",
  });
});

test("does not coalesce review ops for different cards", async () => {
  const { enqueueReviewOp, listPendingOps } = await import("../ops");

  await enqueueReviewOp({
    cardId: 42,
    quality: 5,
    createdAt: "2026-05-02T10:00:00.000Z",
    attempts: 0,
  });
  await enqueueReviewOp({
    cardId: 43,
    quality: 2,
    createdAt: "2026-05-02T10:01:00.000Z",
    attempts: 0,
  });

  const ops = await listPendingOps();
  expect(ops).toHaveLength(2);
  expect(ops.map((op) => op.kind === "review" && op.cardId)).toEqual([42, 43]);
});

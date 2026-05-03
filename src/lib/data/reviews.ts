import { getClientDb } from "./db";
import { enqueueReviewOp } from "./ops";
import { sm2, type Quality } from "@/lib/sm2";

export interface ReviewResult {
  repetitions: number;
  easeFactor: number;
  interval: number;
  nextReviewAt: string;
}

/**
 * Applies SM-2 locally against the current IDB state, persists the new
 * progress row, and enqueues a POST /api/review op for eventual server sync.
 */
export async function recordReview(
  cardId: number,
  quality: Quality
): Promise<ReviewResult> {
  const db = getClientDb();
  const progress = await db.cardProgress.where("cardId").equals(cardId).first();
  if (!progress) {
    throw new Error(`No progress row for card ${cardId}`);
  }

  const result = sm2(
    {
      repetitions: progress.repetitions,
      easeFactor: progress.easeFactor,
      interval: progress.interval,
    },
    quality
  );

  const now = new Date().toISOString();
  await db.cardProgress.update(progress.id, {
    repetitions: result.repetitions,
    easeFactor: result.easeFactor,
    interval: result.interval,
    nextReviewAt: result.nextReviewAt,
    lastReviewedAt: now,
    updatedAt: now,
  });

  await enqueueReviewOp({
    cardId,
    quality,
    createdAt: now,
    attempts: 0,
  });

  return result;
}

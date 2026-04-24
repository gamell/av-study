import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cardProgress, studySessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sm2, type Quality } from "@/lib/sm2";
import { ensureDatabase } from "@/lib/db/ensure-seeded";

export async function POST(request: NextRequest) {
  await ensureDatabase();

  const { cardId, quality } = (await request.json()) as {
    cardId: number;
    quality: Quality;
  };

  if (cardId == null || quality == null) {
    return NextResponse.json(
      { error: "cardId and quality are required" },
      { status: 400 }
    );
  }

  const [progress] = await db
    .select()
    .from(cardProgress)
    .where(eq(cardProgress.cardId, cardId));

  if (!progress) {
    return NextResponse.json(
      { error: "Card progress not found" },
      { status: 404 }
    );
  }

  const result = sm2(
    {
      repetitions: progress.repetitions,
      easeFactor: progress.easeFactor,
      interval: progress.interval,
    },
    quality
  );

  await db
    .update(cardProgress)
    .set({
      repetitions: result.repetitions,
      easeFactor: result.easeFactor,
      interval: result.interval,
      nextReviewAt: result.nextReviewAt,
      lastReviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(cardProgress.cardId, cardId));

  return NextResponse.json(result);
}

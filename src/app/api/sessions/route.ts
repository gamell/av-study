import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { studySessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ensureDatabase } from "@/lib/db/ensure-seeded";

export async function POST(request: NextRequest) {
  await ensureDatabase();

  const { deckType } = await request.json();

  const [session] = await db
    .insert(studySessions)
    .values({
      deckType,
      startedAt: new Date().toISOString(),
      cardsReviewed: 0,
      cardsCorrect: 0,
    })
    .returning();

  return NextResponse.json(session);
}

export async function PATCH(request: NextRequest) {
  await ensureDatabase();

  const { sessionId, cardsReviewed, cardsCorrect, ended } =
    await request.json();

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (cardsReviewed != null) updates.cardsReviewed = cardsReviewed;
  if (cardsCorrect != null) updates.cardsCorrect = cardsCorrect;
  if (ended) updates.endedAt = new Date().toISOString();

  const [session] = await db
    .update(studySessions)
    .set(updates)
    .where(eq(studySessions.id, sessionId))
    .returning();

  return NextResponse.json(session);
}

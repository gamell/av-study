import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cards, cardProgress, categories } from "@/lib/db/schema";
import { eq, and, lte, sql, asc } from "drizzle-orm";
import { ensureDatabase } from "@/lib/db/ensure-seeded";

export async function GET(request: NextRequest) {
  await ensureDatabase();

  const { searchParams } = request.nextUrl;
  const deckType = searchParams.get("deckType") as "knowledge" | "oral";
  const mode = searchParams.get("mode"); // "due" | "all"

  if (!deckType) {
    return NextResponse.json(
      { error: "deckType parameter required" },
      { status: 400 }
    );
  }

  if (mode === "due") {
    const now = new Date().toISOString();
    const dueCards = await db
      .select({
        id: cards.id,
        question: cards.question,
        answer: cards.answer,
        acsCode: cards.acsCode,
        references: cards.references,
        deckType: cards.deckType,
        categoryName: categories.name,
        repetitions: cardProgress.repetitions,
        easeFactor: cardProgress.easeFactor,
        interval: cardProgress.interval,
        nextReviewAt: cardProgress.nextReviewAt,
      })
      .from(cards)
      .innerJoin(cardProgress, eq(cards.id, cardProgress.cardId))
      .innerJoin(categories, eq(cards.categoryId, categories.id))
      .where(
        and(eq(cards.deckType, deckType), lte(cardProgress.nextReviewAt, now))
      )
      .orderBy(asc(cardProgress.nextReviewAt));

    return NextResponse.json(dueCards);
  }

  const allCards = await db
    .select({
      id: cards.id,
      question: cards.question,
      answer: cards.answer,
      acsCode: cards.acsCode,
      references: cards.references,
      deckType: cards.deckType,
      categoryName: categories.name,
      isGenerated: cards.isGenerated,
      repetitions: cardProgress.repetitions,
      easeFactor: cardProgress.easeFactor,
      interval: cardProgress.interval,
      nextReviewAt: cardProgress.nextReviewAt,
    })
    .from(cards)
    .innerJoin(cardProgress, eq(cards.id, cardProgress.cardId))
    .innerJoin(categories, eq(cards.categoryId, categories.id))
    .where(eq(cards.deckType, deckType));

  return NextResponse.json(allCards);
}

export async function DELETE(request: NextRequest) {
  await ensureDatabase();

  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await db.delete(cardProgress).where(eq(cardProgress.cardId, id));
  await db.delete(cards).where(eq(cards.id, id));

  return NextResponse.json({ success: true });
}

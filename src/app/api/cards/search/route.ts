import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cards, cardProgress, categories, cardNotes } from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { ensureDatabase } from "@/lib/db/ensure-seeded";

export async function GET(request: NextRequest) {
  await ensureDatabase();

  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q")?.trim() || "";
  const deckType = searchParams.get("deckType") as
    | "knowledge"
    | "oral"
    | null;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 50;
  const offset = (page - 1) * limit;

  if (!query) {
    const conditions = deckType ? and(eq(cards.deckType, deckType)) : undefined;

    const results = await db
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
        noteCount: sql<number>`(
          SELECT COUNT(*) FROM card_notes
          WHERE card_notes.card_id = ${cards.id}
        )`.as("note_count"),
      })
      .from(cards)
      .innerJoin(cardProgress, eq(cards.id, cardProgress.cardId))
      .innerJoin(categories, eq(cards.categoryId, categories.id))
      .where(conditions)
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);
  }

  // Split query into tokens, each must match somewhere
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);

  // Build a WHERE clause: for each token, it must appear in at least one field
  const tokenConditions = tokens.map(
    (token) =>
      sql`(
        LOWER(${cards.question}) LIKE ${"%" + token + "%"}
        OR LOWER(${cards.answer}) LIKE ${"%" + token + "%"}
        OR LOWER(COALESCE(${cards.acsCode}, '')) LIKE ${"%" + token + "%"}
        OR LOWER(COALESCE(${cards.references}, '')) LIKE ${"%" + token + "%"}
        OR LOWER(${categories.name}) LIKE ${"%" + token + "%"}
        OR EXISTS (
          SELECT 1 FROM card_notes
          WHERE card_notes.card_id = ${cards.id}
          AND LOWER(card_notes.content) LIKE ${"%" + token + "%"}
        )
      )`
  );

  const allTokensMatch = sql.join(tokenConditions, sql` AND `);
  const deckCondition = deckType ? sql` AND ${cards.deckType} = ${deckType}` : sql``;

  const results = await db
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
      noteCount: sql<number>`(
        SELECT COUNT(*) FROM card_notes
        WHERE card_notes.card_id = ${cards.id}
      )`.as("note_count"),
    })
    .from(cards)
    .innerJoin(cardProgress, eq(cards.id, cardProgress.cardId))
    .innerJoin(categories, eq(cards.categoryId, categories.id))
    .where(sql`${allTokensMatch}${deckCondition}`)
    .limit(limit)
    .offset(offset);

  return NextResponse.json(results);
}

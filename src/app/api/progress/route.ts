import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  cards,
  cardProgress,
  categories,
  studySessions,
} from "@/lib/db/schema";
import { eq, and, gt, gte, lt, count, avg, sql, desc } from "drizzle-orm";
import { ensureDatabase } from "@/lib/db/ensure-seeded";

export async function GET(request: NextRequest) {
  await ensureDatabase();

  // Total cards per deck
  const totalByDeck = await db
    .select({ deckType: cards.deckType, total: count() })
    .from(cards)
    .groupBy(cards.deckType);

  // Mastered: ease_factor > 2.5 AND interval > 21
  const masteredByDeck = await db
    .select({ deckType: cards.deckType, n: count() })
    .from(cards)
    .innerJoin(cardProgress, eq(cards.id, cardProgress.cardId))
    .where(and(gt(cardProgress.easeFactor, 2.5), gt(cardProgress.interval, 21)))
    .groupBy(cards.deckType);

  // Learning Easy: reviewed at least once, NOT mastered, ease >= 2.0
  const learningEasyByDeck = await db
    .select({ deckType: cards.deckType, n: count() })
    .from(cards)
    .innerJoin(cardProgress, eq(cards.id, cardProgress.cardId))
    .where(
      and(
        gt(cardProgress.repetitions, 0),
        gte(cardProgress.easeFactor, 2.0),
        sql`NOT (${cardProgress.easeFactor} > 2.5 AND ${cardProgress.interval} > 21)`
      )
    )
    .groupBy(cards.deckType);

  // Learning Hard: reviewed at least once, NOT mastered, ease < 2.0
  const learningHardByDeck = await db
    .select({ deckType: cards.deckType, n: count() })
    .from(cards)
    .innerJoin(cardProgress, eq(cards.id, cardProgress.cardId))
    .where(
      and(
        gt(cardProgress.repetitions, 0),
        lt(cardProgress.easeFactor, 2.0),
        sql`NOT (${cardProgress.easeFactor} > 2.5 AND ${cardProgress.interval} > 21)`
      )
    )
    .groupBy(cards.deckType);

  // Per-category breakdown with all buckets
  const categoryStats = await db
    .select({
      categoryId: categories.id,
      categoryName: categories.name,
      deckType: categories.deckType,
      acsArea: categories.acsArea,
      totalCards: count(cards.id),
      avgEaseFactor: avg(cardProgress.easeFactor),
      avgInterval: avg(cardProgress.interval),
    })
    .from(categories)
    .innerJoin(cards, eq(categories.id, cards.categoryId))
    .innerJoin(cardProgress, eq(cards.id, cardProgress.cardId))
    .groupBy(categories.id);

  // Mastered per category
  const masteredByCat = await db
    .select({ categoryId: categories.id, n: count() })
    .from(categories)
    .innerJoin(cards, eq(categories.id, cards.categoryId))
    .innerJoin(cardProgress, eq(cards.id, cardProgress.cardId))
    .where(and(gt(cardProgress.easeFactor, 2.5), gt(cardProgress.interval, 21)))
    .groupBy(categories.id);

  // Learning Easy per category
  const learningEasyByCat = await db
    .select({ categoryId: categories.id, n: count() })
    .from(categories)
    .innerJoin(cards, eq(categories.id, cards.categoryId))
    .innerJoin(cardProgress, eq(cards.id, cardProgress.cardId))
    .where(
      and(
        gt(cardProgress.repetitions, 0),
        gte(cardProgress.easeFactor, 2.0),
        sql`NOT (${cardProgress.easeFactor} > 2.5 AND ${cardProgress.interval} > 21)`
      )
    )
    .groupBy(categories.id);

  // Learning Hard per category
  const learningHardByCat = await db
    .select({ categoryId: categories.id, n: count() })
    .from(categories)
    .innerJoin(cards, eq(categories.id, cards.categoryId))
    .innerJoin(cardProgress, eq(cards.id, cardProgress.cardId))
    .where(
      and(
        gt(cardProgress.repetitions, 0),
        lt(cardProgress.easeFactor, 2.0),
        sql`NOT (${cardProgress.easeFactor} > 2.5 AND ${cardProgress.interval} > 21)`
      )
    )
    .groupBy(categories.id);

  const masteredMap = new Map(masteredByCat.map((m) => [m.categoryId, m.n]));
  const easyMap = new Map(learningEasyByCat.map((m) => [m.categoryId, m.n]));
  const hardMap = new Map(learningHardByCat.map((m) => [m.categoryId, m.n]));

  // Recent sessions
  const recentSessions = await db
    .select()
    .from(studySessions)
    .orderBy(desc(studySessions.startedAt))
    .limit(10);

  // Cards due now
  const now = new Date().toISOString();
  const dueByDeck = await db
    .select({ deckType: cards.deckType, due: count() })
    .from(cards)
    .innerJoin(cardProgress, eq(cards.id, cardProgress.cardId))
    .where(sql`${cardProgress.nextReviewAt} <= ${now}`)
    .groupBy(cards.deckType);

  const toMap = (rows: { deckType: string; n: number }[]) =>
    Object.fromEntries(rows.map((r) => [r.deckType, r.n]));

  return NextResponse.json({
    totalByDeck: Object.fromEntries(totalByDeck.map((r) => [r.deckType, r.total])),
    masteredByDeck: toMap(masteredByDeck),
    learningEasyByDeck: toMap(learningEasyByDeck),
    learningHardByDeck: toMap(learningHardByDeck),
    dueByDeck: Object.fromEntries(dueByDeck.map((r) => [r.deckType, r.due])),
    categoryStats: categoryStats.map((c) => ({
      ...c,
      mastered: masteredMap.get(c.categoryId) || 0,
      learningEasy: easyMap.get(c.categoryId) || 0,
      learningHard: hardMap.get(c.categoryId) || 0,
      avgEaseFactor: Number(c.avgEaseFactor) || 2.5,
      avgInterval: Number(c.avgInterval) || 0,
    })),
    recentSessions,
  });
}

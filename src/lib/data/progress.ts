import { getClientDb } from "./db";
import type { DeckType, StudySession } from "./types";

export interface CategoryStatsDTO {
  categoryId: number;
  categoryName: string;
  deckType: DeckType;
  acsArea: string;
  totalCards: number;
  avgEaseFactor: number;
  avgInterval: number;
  mastered: number;
  learningEasy: number;
  learningHard: number;
}

export interface ProgressSummary {
  totalByDeck: Record<string, number>;
  masteredByDeck: Record<string, number>;
  learningEasyByDeck: Record<string, number>;
  learningHardByDeck: Record<string, number>;
  dueByDeck: Record<string, number>;
  categoryStats: CategoryStatsDTO[];
  recentSessions: StudySession[];
}

const RECENT_SESSIONS_LIMIT = 10;

/**
 * Pure-IDB reimplementation of /api/progress. Bucket semantics match the
 * server query exactly (mastered = ease>2.5 AND interval>21; learning easy/hard
 * split at ease>=2.0 with reps>0).
 */
export async function getProgressSummary(): Promise<ProgressSummary> {
  const db = getClientDb();
  const [cards, progress, categories, sessions] = await Promise.all([
    db.cards.toArray(),
    db.cardProgress.toArray(),
    db.categories.toArray(),
    db.studySessions.toArray(),
  ]);

  const progressByCardId = new Map(progress.map((p) => [p.cardId, p]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const nowIso = new Date().toISOString();

  const totalByDeck: Record<string, number> = {};
  const masteredByDeck: Record<string, number> = {};
  const learningEasyByDeck: Record<string, number> = {};
  const learningHardByDeck: Record<string, number> = {};
  const dueByDeck: Record<string, number> = {};

  const perCategory = new Map<
    number,
    {
      totalCards: number;
      sumEase: number;
      sumInterval: number;
      mastered: number;
      learningEasy: number;
      learningHard: number;
    }
  >();

  for (const card of cards) {
    const prog = progressByCardId.get(card.id);
    if (!prog) continue;
    const cat = categoryById.get(card.categoryId);

    totalByDeck[card.deckType] = (totalByDeck[card.deckType] ?? 0) + 1;

    const isMastered = prog.easeFactor > 2.5 && prog.interval > 21;
    const isLearningEasy =
      !isMastered && prog.repetitions > 0 && prog.easeFactor >= 2.0;
    const isLearningHard =
      !isMastered && prog.repetitions > 0 && prog.easeFactor < 2.0;
    const isDue = prog.nextReviewAt <= nowIso;

    if (isMastered)
      masteredByDeck[card.deckType] = (masteredByDeck[card.deckType] ?? 0) + 1;
    if (isLearningEasy)
      learningEasyByDeck[card.deckType] =
        (learningEasyByDeck[card.deckType] ?? 0) + 1;
    if (isLearningHard)
      learningHardByDeck[card.deckType] =
        (learningHardByDeck[card.deckType] ?? 0) + 1;
    if (isDue) dueByDeck[card.deckType] = (dueByDeck[card.deckType] ?? 0) + 1;

    if (cat) {
      const bucket = perCategory.get(cat.id) ?? {
        totalCards: 0,
        sumEase: 0,
        sumInterval: 0,
        mastered: 0,
        learningEasy: 0,
        learningHard: 0,
      };
      bucket.totalCards += 1;
      bucket.sumEase += prog.easeFactor;
      bucket.sumInterval += prog.interval;
      if (isMastered) bucket.mastered += 1;
      if (isLearningEasy) bucket.learningEasy += 1;
      if (isLearningHard) bucket.learningHard += 1;
      perCategory.set(cat.id, bucket);
    }
  }

  const categoryStats: CategoryStatsDTO[] = [];
  for (const cat of categories) {
    const bucket = perCategory.get(cat.id);
    if (!bucket || bucket.totalCards === 0) continue;
    categoryStats.push({
      categoryId: cat.id,
      categoryName: cat.name,
      deckType: cat.deckType,
      acsArea: cat.acsArea,
      totalCards: bucket.totalCards,
      avgEaseFactor: bucket.sumEase / bucket.totalCards || 2.5,
      avgInterval: bucket.sumInterval / bucket.totalCards || 0,
      mastered: bucket.mastered,
      learningEasy: bucket.learningEasy,
      learningHard: bucket.learningHard,
    });
  }

  const recentSessions = sessions
    .slice()
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
    .slice(0, RECENT_SESSIONS_LIMIT);

  return {
    totalByDeck,
    masteredByDeck,
    learningEasyByDeck,
    learningHardByDeck,
    dueByDeck,
    categoryStats,
    recentSessions,
  };
}

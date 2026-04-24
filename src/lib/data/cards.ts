import { getClientDb } from "./db";
import { enqueueOp } from "./ops";
import type { Card, DeckType } from "./types";

export interface StudyCardDTO {
  id: number;
  question: string;
  answer: string;
  acsCode: string | null;
  references: string | null;
  deckType: DeckType;
  categoryName: string;
  isGenerated?: boolean;
  repetitions: number;
  easeFactor: number;
  interval: number;
  nextReviewAt: string;
}

async function joinCards(cards: Card[]): Promise<StudyCardDTO[]> {
  const db = getClientDb();
  const [allProgress, allCategories] = await Promise.all([
    db.cardProgress.toArray(),
    db.categories.toArray(),
  ]);
  const progressByCardId = new Map(allProgress.map((p) => [p.cardId, p]));
  const categoryById = new Map(allCategories.map((c) => [c.id, c]));

  return cards.flatMap((c) => {
    const prog = progressByCardId.get(c.id);
    const cat = categoryById.get(c.categoryId);
    if (!prog || !cat) return [];
    return [
      {
        id: c.id,
        question: c.question,
        answer: c.answer,
        acsCode: c.acsCode,
        references: c.references,
        deckType: c.deckType,
        categoryName: cat.name,
        isGenerated: c.isGenerated,
        repetitions: prog.repetitions,
        easeFactor: prog.easeFactor,
        interval: prog.interval,
        nextReviewAt: prog.nextReviewAt,
      },
    ];
  });
}

export async function getDueCards(deckType: DeckType): Promise<StudyCardDTO[]> {
  const db = getClientDb();
  const now = new Date().toISOString();
  const deckCards = await db.cards.where("deckType").equals(deckType).toArray();
  const joined = await joinCards(deckCards);
  return joined
    .filter((c) => c.nextReviewAt <= now)
    .sort((a, b) => (a.nextReviewAt < b.nextReviewAt ? -1 : 1));
}

export async function getAllCards(deckType: DeckType): Promise<StudyCardDTO[]> {
  const db = getClientDb();
  const deckCards = await db.cards.where("deckType").equals(deckType).toArray();
  return joinCards(deckCards);
}

export async function updateCard(
  cardId: number,
  patch: Partial<Pick<Card, "question" | "answer" | "acsCode" | "references">>
): Promise<void> {
  const db = getClientDb();
  const now = new Date().toISOString();
  await db.cards.update(cardId, { ...patch, updatedAt: now });
  await enqueueOp({
    kind: "card.update",
    cardId,
    patch,
    createdAt: now,
    attempts: 0,
  });
}

export async function deleteCard(cardId: number): Promise<void> {
  const db = getClientDb();
  const now = new Date().toISOString();
  await db.transaction(
    "rw",
    db.cards,
    db.cardProgress,
    db.cardNotes,
    async () => {
      await db.cardNotes.where("cardId").equals(cardId).delete();
      await db.cardProgress.where("cardId").equals(cardId).delete();
      await db.cards.delete(cardId);
    }
  );
  await enqueueOp({
    kind: "card.delete",
    cardId,
    createdAt: now,
    attempts: 0,
  });
}

import { getClientDb } from "./db";
import type { DeckType } from "./types";

export interface DatabaseCardDTO {
  id: number;
  question: string;
  answer: string;
  acsCode: string | null;
  references: string | null;
  deckType: DeckType;
  categoryName: string;
  isGenerated: boolean;
  repetitions: number;
  easeFactor: number;
  interval: number;
  nextReviewAt: string;
  noteCount: number;
}

export interface SearchOptions {
  query?: string;
  deckType?: DeckType | null;
  page?: number;
  limit?: number;
}

const DEFAULT_LIMIT = 50;

/**
 * Client mirror of /api/cards/search. Token-AND matching over
 * question/answer/acsCode/references/categoryName/notes. Runs fully in IDB.
 */
export async function searchCards(
  opts: SearchOptions = {}
): Promise<DatabaseCardDTO[]> {
  const db = getClientDb();
  const page = opts.page ?? 1;
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const offset = (page - 1) * limit;
  const rawQuery = opts.query?.trim() ?? "";
  const tokens = rawQuery
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  const [allCards, allCategories, allProgress, allNotes] = await Promise.all([
    opts.deckType
      ? db.cards.where("deckType").equals(opts.deckType).toArray()
      : db.cards.toArray(),
    db.categories.toArray(),
    db.cardProgress.toArray(),
    db.cardNotes.toArray(),
  ]);

  const categoryById = new Map(allCategories.map((c) => [c.id, c]));
  const progressByCardId = new Map(allProgress.map((p) => [p.cardId, p]));
  const notesByCardId = new Map<number, string[]>();
  for (const n of allNotes) {
    const list = notesByCardId.get(n.cardId);
    if (list) list.push(n.content);
    else notesByCardId.set(n.cardId, [n.content]);
  }

  const results: DatabaseCardDTO[] = [];
  for (const card of allCards) {
    const cat = categoryById.get(card.categoryId);
    const prog = progressByCardId.get(card.id);
    if (!cat || !prog) continue;

    if (tokens.length > 0) {
      const haystack = [
        card.question,
        card.answer,
        card.acsCode ?? "",
        card.references ?? "",
        cat.name,
        ...(notesByCardId.get(card.id) ?? []),
      ]
        .join("\n")
        .toLowerCase();
      const allMatch = tokens.every((t) => haystack.includes(t));
      if (!allMatch) continue;
    }

    results.push({
      id: card.id,
      question: card.question,
      answer: card.answer,
      acsCode: card.acsCode,
      references: card.references,
      deckType: card.deckType,
      categoryName: cat.name,
      isGenerated: card.isGenerated,
      repetitions: prog.repetitions,
      easeFactor: prog.easeFactor,
      interval: prog.interval,
      nextReviewAt: prog.nextReviewAt,
      noteCount: notesByCardId.get(card.id)?.length ?? 0,
    });
  }

  results.sort((a, b) => a.id - b.id);

  return results.slice(offset, offset + limit);
}

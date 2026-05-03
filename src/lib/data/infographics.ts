import { getClientDb } from "./db";
import type { CardInfographic } from "./types";

export async function getInfographicForCard(
  cardId: number
): Promise<CardInfographic | null> {
  const db = getClientDb();
  const row = await db.cardInfographics.where("cardId").equals(cardId).first();
  return row ?? null;
}

/**
 * Store a server-created infographic without enqueueing a local mutation.
 * Replacements are keyed by card id so each card keeps only its latest image.
 */
export async function insertInfographicFromServer(
  row: CardInfographic
): Promise<void> {
  const db = getClientDb();
  await db.transaction("rw", db.cardInfographics, async () => {
    await db.cardInfographics.where("cardId").equals(row.cardId).delete();
    await db.cardInfographics.put(row);
  });
}

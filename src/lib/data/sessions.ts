import { getClientDb } from "./db";
import { enqueueOp } from "./ops";
import type { DeckType, StudySession } from "./types";

let _nextTempId = -1;

/**
 * Generates a monotonic negative temp id that won't collide with server ids.
 * Used for rows created offline until the sync engine remaps to the real id.
 */
function nextTempId(): number {
  const id = _nextTempId;
  _nextTempId -= 1;
  return id;
}

export async function createSession(deckType: DeckType): Promise<StudySession> {
  const db = getClientDb();
  const now = new Date().toISOString();
  const tempId = nextTempId();
  const session: StudySession = {
    id: tempId,
    deckType,
    startedAt: now,
    endedAt: null,
    cardsReviewed: 0,
    cardsCorrect: 0,
    updatedAt: now,
  };
  await db.studySessions.add(session);
  await enqueueOp({
    kind: "session.create",
    tempId,
    deckType,
    createdAt: now,
    attempts: 0,
  });
  return session;
}

export async function updateSession(
  sessionId: number,
  patch: { cardsReviewed?: number; cardsCorrect?: number; ended?: boolean }
): Promise<void> {
  const db = getClientDb();
  const now = new Date().toISOString();
  const updates: Partial<StudySession> = { updatedAt: now };
  if (patch.cardsReviewed != null) updates.cardsReviewed = patch.cardsReviewed;
  if (patch.cardsCorrect != null) updates.cardsCorrect = patch.cardsCorrect;
  if (patch.ended) updates.endedAt = now;
  await db.studySessions.update(sessionId, updates);
  await enqueueOp({
    kind: "session.update",
    sessionId,
    cardsReviewed: patch.cardsReviewed,
    cardsCorrect: patch.cardsCorrect,
    ended: patch.ended,
    createdAt: now,
    attempts: 0,
  });
}

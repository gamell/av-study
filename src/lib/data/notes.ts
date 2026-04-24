import { getClientDb } from "./db";
import { enqueueOp } from "./ops";
import type { CardNote } from "./types";

let _nextTempId = -1_000_000;

function nextTempId(): number {
  const id = _nextTempId;
  _nextTempId -= 1;
  return id;
}

export async function listNotes(cardId: number): Promise<CardNote[]> {
  const db = getClientDb();
  const rows = await db.cardNotes.where("cardId").equals(cardId).toArray();
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

export async function addNote(
  cardId: number,
  content: string,
  type: "note" | "ai_user" | "ai_assistant" = "note"
): Promise<CardNote> {
  const db = getClientDb();
  const now = new Date().toISOString();
  const tempId = nextTempId();
  const note: CardNote = {
    id: tempId,
    cardId,
    type,
    content: content.trim(),
    createdAt: now,
    updatedAt: now,
  };
  await db.cardNotes.add(note);
  await enqueueOp({
    kind: "note.create",
    tempId,
    cardId,
    type,
    content: note.content,
    createdAt: now,
    attempts: 0,
  });
  return note;
}

/**
 * Insert a note directly into IDB without enqueueing (used for notes that
 * the server created for us, e.g. LLM chat responses we already have the
 * server id for).
 */
export async function insertNoteFromServer(note: CardNote): Promise<void> {
  const db = getClientDb();
  await db.cardNotes.put(note);
}

import { getClientDb } from "./db";
import type { StudyText } from "./types";

export async function listStudyTexts(): Promise<StudyText[]> {
  const db = getClientDb();
  const rows = await db.studyTexts.toArray();
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

/**
 * Store a study text returned by the LLM route. These are generated online
 * only; the server already persisted its own copy and returned the server id.
 */
export async function insertStudyTextFromServer(text: StudyText): Promise<void> {
  const db = getClientDb();
  await db.studyTexts.put(text);
}

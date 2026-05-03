import Dexie, { type Table } from "dexie";
import type {
  Category,
  Card,
  CardProgress,
  StudySession,
  StudyText,
  CardNote,
  CardInfographic,
  PendingOp,
  MetaRow,
} from "./types";

/**
 * Client-side mirror of the server SQLite schema, plus a durable ops queue.
 *
 * Row `id` is the server id. For rows created offline (sessions, notes), we
 * assign a negative temp id locally; once the sync engine flushes and the
 * server returns the real id we remap across IDB + queue.
 */
export class AppDexie extends Dexie {
  categories!: Table<Category, number>;
  cards!: Table<Card, number>;
  cardProgress!: Table<CardProgress, number>;
  studySessions!: Table<StudySession, number>;
  studyTexts!: Table<StudyText, number>;
  cardNotes!: Table<CardNote, number>;
  cardInfographics!: Table<CardInfographic, number>;
  pendingOps!: Table<PendingOp, number>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("pilot-study");

    this.version(1).stores({
      categories: "id, deckType",
      cards: "id, deckType, categoryId",
      cardProgress: "id, &cardId, nextReviewAt",
      studySessions: "id, deckType, startedAt",
      studyTexts: "id, createdAt",
      cardNotes: "id, cardId, type, createdAt",
      pendingOps: "++localId, kind, createdAt",
      meta: "&key",
    });

    this.version(2).stores({
      cardInfographics: "id, &cardId, updatedAt",
    });
  }
}

let _db: AppDexie | null = null;

/**
 * Returns a singleton Dexie instance. Safe to call on the server — it returns
 * a lazy proxy; real DB is only opened in the browser.
 */
export function getClientDb(): AppDexie {
  if (typeof window === "undefined") {
    throw new Error("getClientDb() called on the server");
  }
  if (!_db) {
    _db = new AppDexie();
  }
  return _db;
}

export const META_KEYS = {
  lastSnapshotAt: "lastSnapshotAt",
  seeded: "seeded",
} as const;

export async function readMeta(key: string): Promise<string | null> {
  const row = await getClientDb().meta.get(key);
  return row?.value ?? null;
}

export async function writeMeta(key: string, value: string): Promise<void> {
  await getClientDb().meta.put({ key, value });
}

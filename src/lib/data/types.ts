import type {
  Category as ServerCategory,
  Card as ServerCard,
  CardProgress as ServerCardProgress,
  StudySession as ServerStudySession,
  StudyText as ServerStudyText,
  CardNote as ServerCardNote,
} from "@/lib/db/schema";

export type DeckType = "knowledge" | "oral";

export type Category = ServerCategory;
export type Card = ServerCard;
export type CardProgress = ServerCardProgress;
export type StudySession = ServerStudySession;
export type StudyText = ServerStudyText;
export type CardNote = ServerCardNote;

export interface SnapshotPayload {
  serverTime: string;
  categories: Category[];
  cards: Card[];
  cardProgress: CardProgress[];
  studySessions: StudySession[];
  studyTexts: StudyText[];
  cardNotes: CardNote[];
}

/**
 * Pending op durable queue entry.
 * All user-initiated mutations are persisted here before (and during) network flush.
 */
export type PendingOp =
  | {
      localId?: number;
      kind: "review";
      cardId: number;
      quality: number;
      createdAt: string;
      attempts: number;
      lastError?: string;
    }
  | {
      localId?: number;
      kind: "session.create";
      /** Negative temp id used in IDB until server returns the real one. */
      tempId: number;
      deckType: DeckType;
      createdAt: string;
      attempts: number;
      lastError?: string;
    }
  | {
      localId?: number;
      kind: "session.update";
      /** May be a temp id (negative) at enqueue time; resolved during flush. */
      sessionId: number;
      cardsReviewed?: number;
      cardsCorrect?: number;
      ended?: boolean;
      createdAt: string;
      attempts: number;
      lastError?: string;
    }
  | {
      localId?: number;
      kind: "card.update";
      cardId: number;
      patch: Partial<Pick<Card, "question" | "answer" | "acsCode" | "references">>;
      createdAt: string;
      attempts: number;
      lastError?: string;
    }
  | {
      localId?: number;
      kind: "card.delete";
      cardId: number;
      createdAt: string;
      attempts: number;
      lastError?: string;
    }
  | {
      localId?: number;
      kind: "note.create";
      tempId: number;
      cardId: number;
      type: "note" | "ai_user" | "ai_assistant";
      content: string;
      createdAt: string;
      attempts: number;
      lastError?: string;
    };

export type PendingOpKind = PendingOp["kind"];

export interface MetaRow {
  key: string;
  value: string;
}

export type SyncState =
  | { status: "idle"; lastSyncAt: string | null; pending: number; online: boolean }
  | { status: "initializing"; lastSyncAt: string | null; pending: number; online: boolean }
  | { status: "pulling"; lastSyncAt: string | null; pending: number; online: boolean }
  | { status: "flushing"; lastSyncAt: string | null; pending: number; online: boolean }
  | { status: "offline"; lastSyncAt: string | null; pending: number; online: false }
  | { status: "error"; lastSyncAt: string | null; pending: number; online: boolean; message: string };

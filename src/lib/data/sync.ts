import { getClientDb, writeMeta, META_KEYS } from "./db";
import { listPendingOps, pendingOpCount, removeOp, updateOp } from "./ops";
import type {
  CardNote,
  PendingOp,
  SnapshotPayload,
  StudySession,
  SyncState,
} from "./types";

type SyncListener = (state: SyncState) => void;

const INITIAL_SYNC_TIMEOUT_MS = 4000;
const BACKOFF_LADDER_MS = [1_000, 5_000, 15_000, 60_000, 300_000];
const PERIODIC_PULL_MS = 60_000;

class SyncEngine {
  private listeners = new Set<SyncListener>();
  private state: SyncState = {
    status: "idle",
    lastSyncAt: null,
    pending: 0,
    // Optimistic default. iOS Safari is known to report `navigator.onLine`
    // incorrectly (often `false`) at module-load time, which would falsely
    // pin the offline banner on. Trust only the explicit online/offline
    // events emitted by the browser, plus successful network ops.
    online: true,
  };
  private initialized = false;
  private flushing = false;
  private pulling = false;
  private backoffAttempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private periodicTimer: ReturnType<typeof setInterval> | null = null;
  /**
   * In-memory mapping of client temp ids (negative) to the real server id
   * returned by a successful insert. React state captured a temp id before
   * the flush completed, so writes that reference the temp id later are
   * translated via this map at dispatch time.
   */
  private sessionTempToReal = new Map<number, number>();
  private noteTempToReal = new Map<number, number>();

  get current(): SyncState {
    return this.state;
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(next: Partial<SyncState>): void {
    this.state = { ...this.state, ...next } as SyncState;
    for (const l of this.listeners) l(this.state);
  }

  private async refreshPendingCount(): Promise<void> {
    const pending = await pendingOpCount();
    this.emit({ pending });
  }

  /**
   * One-shot bootstrap: attempt an initial snapshot pull (bounded by a short
   * timeout so offline boots don't block the UI) then flush any queued ops.
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    this.emit({ status: "initializing" });

    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
      window.addEventListener("focus", this.handleVisibility);
      document.addEventListener("visibilitychange", this.handleVisibility);
      this.periodicTimer = setInterval(
        () => this.opportunisticPullFlush(),
        PERIODIC_PULL_MS
      );
    }

    await this.refreshPendingCount();

    // Always attempt the initial pull regardless of `navigator.onLine` — Safari
    // can lie about it. The pull's own catch will surface a real failure.
    await Promise.race([
      this.pullSnapshot().catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, INITIAL_SYNC_TIMEOUT_MS)),
    ]);
    await this.flush().catch(() => undefined);

    if (this.state.status === "initializing" || this.state.status === "pulling") {
      this.emit({ status: "idle" });
    }
  }

  dispose(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
      window.removeEventListener("focus", this.handleVisibility);
      document.removeEventListener("visibilitychange", this.handleVisibility);
    }
    if (this.periodicTimer) clearInterval(this.periodicTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.initialized = false;
  }

  private handleOnline = () => {
    this.emit({ online: true, status: "idle" });
    this.opportunisticPullFlush();
  };

  private handleOffline = () => {
    this.emit({ online: false, status: "offline" });
  };

  private handleVisibility = () => {
    if (document.visibilityState === "visible") {
      this.opportunisticPullFlush();
    }
  };

  private async opportunisticPullFlush(): Promise<void> {
    if (this.pulling || this.flushing) return;
    try {
      await this.pullSnapshot();
    } catch {
      // swallow; backoff handled in flush/pull
    }
    try {
      await this.flush();
    } catch {
      // swallow
    }
  }

  /**
   * Pulls the full server snapshot and reconciles with IDB. Rows locked by
   * a pending op are preserved (local wins); everything else is upserted to
   * mirror the server. Missing rows server-side are deleted locally except
   * for client-created rows that haven't been flushed yet (negative temp ids).
   */
  async pullSnapshot(): Promise<void> {
    if (this.pulling) return;
    this.pulling = true;
    this.emit({ status: "pulling" });
    try {
      const res = await fetch("/api/sync/snapshot", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`snapshot HTTP ${res.status}`);
      }
      const snapshot = (await res.json()) as SnapshotPayload;
      const pendingOps = await listPendingOps();
      const lockedCardIds = new Set<number>();
      const lockedNoteIds = new Set<number>();
      const lockedSessionIds = new Set<number>();
      const lockedCardsForUpdateOrDelete = new Set<number>();

      for (const op of pendingOps) {
        switch (op.kind) {
          case "review":
            lockedCardIds.add(op.cardId);
            break;
          case "session.create":
            lockedSessionIds.add(op.tempId);
            break;
          case "session.update":
            lockedSessionIds.add(op.sessionId);
            break;
          case "card.update":
          case "card.delete":
            lockedCardsForUpdateOrDelete.add(op.cardId);
            break;
          case "note.create":
            lockedNoteIds.add(op.tempId);
            break;
        }
      }

      const db = getClientDb();
      await db.transaction(
        "rw",
        [
          db.categories,
          db.cards,
          db.cardProgress,
          db.studySessions,
          db.studyTexts,
          db.cardNotes,
        ],
        async () => {
          await this.reconcileTable(
            db.categories,
            snapshot.categories,
            () => false
          );
          await this.reconcileTable(db.cards, snapshot.cards, (local) =>
            lockedCardsForUpdateOrDelete.has(local.id)
          );
          await this.reconcileTable(
            db.cardProgress,
            snapshot.cardProgress,
            (local) => lockedCardIds.has(local.cardId)
          );
          await this.reconcileTable(
            db.studySessions,
            snapshot.studySessions,
            (local) => lockedSessionIds.has(local.id) || local.id < 0
          );
          await this.reconcileTable(
            db.studyTexts,
            snapshot.studyTexts,
            () => false
          );
          await this.reconcileTable(db.cardNotes, snapshot.cardNotes, (local) =>
            lockedNoteIds.has(local.id) || local.id < 0
          );
        }
      );

      await writeMeta(META_KEYS.lastSnapshotAt, snapshot.serverTime);
      // A successful round-trip is authoritative proof we're online,
      // regardless of what navigator.onLine claims.
      this.emit({
        status: "idle",
        lastSyncAt: snapshot.serverTime,
        online: true,
      });
      this.backoffAttempt = 0;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.emit({
        status: "error",
        message,
      });
      this.scheduleRetry();
    } finally {
      this.pulling = false;
      await this.refreshPendingCount();
    }
  }

  private async reconcileTable<T extends { id: number }>(
    table: {
      toArray: () => Promise<T[]>;
      bulkPut: (rows: T[]) => Promise<unknown>;
      bulkDelete: (keys: number[]) => Promise<unknown>;
    },
    serverRows: T[],
    isLocked: (local: T) => boolean
  ): Promise<void> {
    const serverById = new Map<number, T>();
    for (const r of serverRows) serverById.set(r.id, r);
    const localRows = await table.toArray();

    const toPut: T[] = [];
    const toDelete: number[] = [];

    for (const serverRow of serverRows) {
      const local = localRows.find((r) => r.id === serverRow.id);
      if (local && isLocked(local)) continue;
      toPut.push(serverRow);
    }

    for (const local of localRows) {
      if (serverById.has(local.id)) continue;
      if (isLocked(local)) continue;
      toDelete.push(local.id);
    }

    if (toPut.length) await table.bulkPut(toPut);
    if (toDelete.length) await table.bulkDelete(toDelete);
  }

  /**
   * Drains the pending-ops queue in insertion order against the real API
   * endpoints. Successfully flushed inserts remap their temp id to the real
   * server id across IDB rows and any subsequent queued ops.
   */
  async flush(): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;
    this.emit({ status: "flushing" });
    try {
      let ops = await listPendingOps();
      while (ops.length > 0) {
        const op = ops[0];
        try {
          await this.applyOp(op);
          await removeOp(op.localId!);
          this.backoffAttempt = 0;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          const status = (err as { status?: number }).status;
          if (status && status >= 400 && status < 500) {
            await this.discardOpAndDependents(op, message);
          } else {
            await updateOp(op.localId!, {
              attempts: (op.attempts ?? 0) + 1,
              lastError: message,
            });
            this.scheduleRetry();
            break;
          }
        }
        ops = await listPendingOps();
      }
      if (this.state.status === "flushing") {
        this.emit({ status: "idle" });
      }
    } finally {
      this.flushing = false;
      await this.refreshPendingCount();
      if (this.flushAgainAfterCurrent) {
        this.flushAgainAfterCurrent = false;
        this.scheduleFlush();
      }
    }
  }

  private async applyOp(op: PendingOp): Promise<void> {
    const db = getClientDb();
    switch (op.kind) {
      case "review": {
        await this.postJson("/api/review", {
          cardId: op.cardId,
          quality: op.quality,
        });
        return;
      }
      case "session.create": {
        const res = await this.postJson<StudySession>("/api/sessions", {
          deckType: op.deckType,
        });
        this.sessionTempToReal.set(op.tempId, res.id);
        await db.transaction("rw", [db.studySessions, db.pendingOps], async () => {
          const tempRow = await db.studySessions.get(op.tempId);
          if (tempRow) {
            await db.studySessions.delete(op.tempId);
            await db.studySessions.put({ ...tempRow, ...res, id: res.id });
          } else {
            await db.studySessions.put(res);
          }
          const all = await db.pendingOps.toArray();
          for (const other of all) {
            if (
              other.kind === "session.update" &&
              other.sessionId === op.tempId &&
              other.localId != null
            ) {
              await db.pendingOps.update(other.localId, {
                sessionId: res.id,
              } as Partial<PendingOp>);
            }
          }
        });
        return;
      }
      case "session.update": {
        const realId = op.sessionId < 0
          ? this.sessionTempToReal.get(op.sessionId) ?? op.sessionId
          : op.sessionId;
        await this.fetchJson("/api/sessions", {
          method: "PATCH",
          body: JSON.stringify({
            sessionId: realId,
            cardsReviewed: op.cardsReviewed,
            cardsCorrect: op.cardsCorrect,
            ended: op.ended,
          }),
          headers: { "Content-Type": "application/json" },
        });
        return;
      }
      case "card.update": {
        await this.fetchJson(`/api/cards/${op.cardId}`, {
          method: "PATCH",
          body: JSON.stringify(op.patch),
          headers: { "Content-Type": "application/json" },
        });
        return;
      }
      case "card.delete": {
        await this.fetchJson(`/api/cards/${op.cardId}`, {
          method: "DELETE",
        });
        return;
      }
      case "note.create": {
        const res = await this.postJson<CardNote>(
          `/api/cards/${op.cardId}/notes`,
          { content: op.content, type: op.type }
        );
        this.noteTempToReal.set(op.tempId, res.id);
        await db.transaction("rw", [db.cardNotes], async () => {
          const tempRow = await db.cardNotes.get(op.tempId);
          if (tempRow) {
            await db.cardNotes.delete(op.tempId);
            await db.cardNotes.put({ ...tempRow, ...res, id: res.id });
          } else {
            await db.cardNotes.put(res);
          }
        });
        return;
      }
    }
  }

  /**
   * If a create op fails with a permanent error, any queued dependent ops
   * that reference its temp id can never be applied; drop them too.
   */
  private async discardOpAndDependents(
    op: PendingOp,
    message: string
  ): Promise<void> {
    const db = getClientDb();
    await removeOp(op.localId!);
    console.warn(
      `[sync] dropping op after permanent failure: ${op.kind} — ${message}`
    );
    if (op.kind === "session.create") {
      const all = await db.pendingOps.toArray();
      for (const other of all) {
        if (
          other.kind === "session.update" &&
          other.sessionId === op.tempId &&
          other.localId != null
        ) {
          await db.pendingOps.delete(other.localId);
        }
      }
      await db.studySessions.delete(op.tempId);
    }
    if (op.kind === "note.create") {
      await db.cardNotes.delete(op.tempId);
    }
  }

  private async postJson<T = unknown>(url: string, body: unknown): Promise<T> {
    return this.fetchJson<T>(url, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
  }

  private async fetchJson<T = unknown>(
    url: string,
    init: RequestInit
  ): Promise<T> {
    const res = await fetch(url, { cache: "no-store", ...init });
    if (!res.ok) {
      const err = new Error(`${init.method ?? "GET"} ${url} -> ${res.status}`);
      (err as { status?: number }).status = res.status;
      throw err;
    }
    if (res.status === 204) return undefined as T;
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) return res.json();
    return undefined as T;
  }

  private scheduleRetry(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    const delay =
      BACKOFF_LADDER_MS[
        Math.min(this.backoffAttempt, BACKOFF_LADDER_MS.length - 1)
      ];
    this.backoffAttempt += 1;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.opportunisticPullFlush();
    }, delay);
  }

  /** Force an immediate pull + flush (used for pull-to-refresh / manual sync). */
  async syncNow(): Promise<void> {
    await this.opportunisticPullFlush();
  }

  /**
   * Debounced nudge to flush the queue soon. Write helpers call this right
   * after enqueueing so the UI sees its own writes reflected on the server
   * within ~100 ms instead of waiting for the 60 s periodic timer.
   *
   * If a flush is already in-flight we set a pending flag so another flush
   * runs immediately after the current one completes (ops enqueued during
   * flush would otherwise sit until the next trigger).
   */
  private flushSoonHandle: ReturnType<typeof setTimeout> | null = null;
  private flushAgainAfterCurrent = false;
  scheduleFlush(): void {
    if (!this.initialized) return;
    if (this.flushing) {
      this.flushAgainAfterCurrent = true;
      return;
    }
    if (this.flushSoonHandle) return;
    this.flushSoonHandle = setTimeout(() => {
      this.flushSoonHandle = null;
      void this.flush().catch((err) =>
        console.error("[sync] flush failed:", err)
      );
    }, 75);
  }
}

export const syncEngine = new SyncEngine();

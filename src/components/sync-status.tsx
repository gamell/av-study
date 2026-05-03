"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import {
  Check,
  Cloud,
  CloudOff,
  Loader2,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { useDb } from "@/components/db-provider";
import { listPendingOps } from "@/lib/data/ops";
import type { PendingOp, SyncState } from "@/lib/data/types";
import { cn } from "@/lib/utils";

interface SyncDisplay {
  label: string;
  Icon: ComponentType<{ className?: string }>;
  tone: string;
  spinning: boolean;
}

const MUTED_TONE = "text-muted-foreground";
const WARNING_TONE = "text-orange-500";
const SUCCESS_TONE = "text-green-500";

const QUALITY_LABELS: Record<number, string> = {
  0: "Again",
  1: "Again",
  2: "Hard",
  3: "Good",
  4: "Good",
  5: "Easy",
};

function formatSyncTime(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function describeOp(op: PendingOp): string {
  switch (op.kind) {
    case "review":
      return `Review card ${op.cardId}: ${QUALITY_LABELS[op.quality] ?? op.quality}`;
    case "session.create":
      return `Start ${op.deckType} session`;
    case "session.update":
      return `Update session ${op.sessionId}`;
    case "card.update":
      return `Edit card ${op.cardId}`;
    case "card.delete":
      return `Delete card ${op.cardId}`;
    case "note.create":
      return `Add ${op.type === "note" ? "note" : "chat message"} to card ${op.cardId}`;
  }
}

function summarizeOps(ops: PendingOp[]): string {
  if (ops.length === 0) return "No pending changes";
  const counts = new Map<string, number>();
  for (const op of ops) counts.set(op.kind, (counts.get(op.kind) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([kind, count]) => `${count} ${kind}`)
    .join(", ");
}

function syncDisplay(
  label: string,
  Icon: ComponentType<{ className?: string }>,
  tone = MUTED_TONE,
  spinning = false
): SyncDisplay {
  return { label, Icon, tone, spinning };
}

function getSyncDisplay(state: SyncState): SyncDisplay {
  switch (state.status) {
    case "initializing":
    case "pulling":
      return syncDisplay("Syncing", Loader2, MUTED_TONE, true);
    case "flushing":
      return syncDisplay(
        state.pending > 0 ? `Syncing (${state.pending})` : "Syncing",
        Loader2,
        MUTED_TONE,
        true
      );
    case "offline":
      return syncDisplay(
        state.pending > 0 ? `Offline · ${state.pending}` : "Offline",
        WifiOff,
        WARNING_TONE
      );
    case "error":
      return syncDisplay(
        state.pending > 0 ? `Retry · ${state.pending}` : "Retry",
        CloudOff,
        WARNING_TONE
      );
    case "idle":
    default:
      if (state.pending > 0) {
        return syncDisplay(`${state.pending} pending`, Cloud);
      }
      if (state.lastSyncAt) {
        return syncDisplay("Synced", Check, SUCCESS_TONE);
      }
      return syncDisplay("Not synced", RefreshCw);
  }
}

/**
 * Compact badge reflecting the sync engine state. Click to force a sync.
 * Hidden on tiny viewports (label only), icon always visible.
 */
export function SyncStatus({ className }: { className?: string }) {
  const { state, syncNow } = useDb();
  const [open, setOpen] = useState(false);
  const [pendingOps, setPendingOps] = useState<PendingOp[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const { label, Icon, tone, spinning } = getSyncDisplay(state);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listPendingOps().then((ops) => {
      if (!cancelled) setPendingOps(ops);
    });
    return () => {
      cancelled = true;
    };
  }, [open, state.pending, state.status]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const pendingSummary = useMemo(() => summarizeOps(pendingOps), [pendingOps]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((next) => !next)}
        aria-expanded={open}
        title={
          state.status === "error" && "message" in state
            ? state.message
            : label
        }
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors hover:bg-accent",
          tone
        )}
      >
        <Icon className={cn("h-3.5 w-3.5", spinning && "animate-spin")} />
        <span className="hidden sm:inline">{label}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Sync status</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
            <button
              type="button"
              onClick={() => void syncNow()}
              className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
            >
              Sync now
            </button>
          </div>

          <dl className="space-y-2 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Last sync</dt>
              <dd className="text-right">{formatSyncTime(state.lastSyncAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Pending</dt>
              <dd className="text-right">{state.pending}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Pending changes</dt>
              <dd className="mt-1 text-xs">{pendingSummary}</dd>
            </div>
            {state.status === "error" && "message" in state && (
              <div>
                <dt className="text-muted-foreground">Last error</dt>
                <dd className="mt-1 break-words text-orange-500">
                  {state.message}
                </dd>
              </div>
            )}
          </dl>

          {pendingOps.length > 0 && (
            <div className="mt-3 max-h-44 space-y-1 overflow-y-auto border-t pt-3">
              {pendingOps.slice(0, 8).map((op) => (
                <div
                  key={op.localId ?? `${op.kind}-${op.createdAt}`}
                  className="rounded-md bg-muted/50 px-2 py-1.5 text-xs"
                >
                  <div>{describeOp(op)}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatSyncTime(op.createdAt)}
                    {op.attempts > 0 && ` · ${op.attempts} attempts`}
                  </div>
                  {op.lastError && (
                    <div className="mt-1 break-words text-[11px] text-orange-500">
                      {op.lastError}
                    </div>
                  )}
                </div>
              ))}
              {pendingOps.length > 8 && (
                <div className="text-xs text-muted-foreground">
                  +{pendingOps.length - 8} more pending changes
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

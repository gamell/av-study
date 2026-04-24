"use client";

import {
  Check,
  Cloud,
  CloudOff,
  Loader2,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { useDb } from "@/components/db-provider";
import { cn } from "@/lib/utils";

/**
 * Compact badge reflecting the sync engine state. Click to force a sync.
 * Hidden on tiny viewports (label only), icon always visible.
 */
export function SyncStatus({ className }: { className?: string }) {
  const { state, syncNow } = useDb();

  let label: string;
  let Icon: React.ComponentType<{ className?: string }>;
  let tone = "text-muted-foreground";
  let spinning = false;

  switch (state.status) {
    case "initializing":
    case "pulling":
      label = "Syncing";
      Icon = Loader2;
      spinning = true;
      break;
    case "flushing":
      label = state.pending > 0 ? `Syncing (${state.pending})` : "Syncing";
      Icon = Loader2;
      spinning = true;
      break;
    case "offline":
      label = state.pending > 0 ? `Offline · ${state.pending}` : "Offline";
      Icon = WifiOff;
      tone = "text-orange-500";
      break;
    case "error":
      label = state.pending > 0 ? `Retry · ${state.pending}` : "Retry";
      Icon = CloudOff;
      tone = "text-orange-500";
      break;
    case "idle":
    default:
      if (state.pending > 0) {
        label = `${state.pending} pending`;
        Icon = Cloud;
      } else if (state.lastSyncAt) {
        label = "Synced";
        Icon = Check;
        tone = "text-green-500";
      } else {
        label = "Not synced";
        Icon = RefreshCw;
      }
      break;
  }

  return (
    <button
      type="button"
      onClick={() => void syncNow()}
      title={
        state.status === "error" && "message" in state
          ? state.message
          : label
      }
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors hover:bg-accent",
        tone,
        className
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", spinning && "animate-spin")} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

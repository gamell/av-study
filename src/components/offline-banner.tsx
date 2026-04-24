"use client";

import { WifiOff } from "lucide-react";
import { useSyncState } from "@/components/db-provider";

export function OfflineBanner() {
  const state = useSyncState();
  if (state.online) return null;

  return (
    <div className="sticky top-0 z-50 w-full bg-muted/80 backdrop-blur supports-[backdrop-filter]:bg-muted/60">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
        <WifiOff className="h-3.5 w-3.5" />
        <span>
          Offline — studying works normally; reviews will sync when you&apos;re back online.
        </span>
        {state.pending > 0 && (
          <span className="ml-auto font-mono">{state.pending} pending</span>
        )}
      </div>
    </div>
  );
}

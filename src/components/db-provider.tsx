"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { syncEngine } from "@/lib/data/sync";
import type { SyncState } from "@/lib/data/types";

interface DbContextValue {
  state: SyncState;
  /** Monotonically incremented whenever the snapshot changes; use in deps to re-query. */
  version: number;
  syncNow: () => Promise<void>;
}

const DbContext = createContext<DbContextValue | null>(null);

export function DbProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SyncState>(() => syncEngine.current);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    void syncEngine.init();
    let lastSync = syncEngine.current.lastSyncAt;
    const unsubscribe = syncEngine.subscribe((next) => {
      setState(next);
      if (next.lastSyncAt && next.lastSyncAt !== lastSync) {
        lastSync = next.lastSyncAt;
        setVersion((v) => v + 1);
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const value = useMemo<DbContextValue>(
    () => ({
      state,
      version,
      syncNow: () => syncEngine.syncNow(),
    }),
    [state, version]
  );

  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
}

export function useDb(): DbContextValue {
  const ctx = useContext(DbContext);
  if (!ctx) throw new Error("useDb must be used inside <DbProvider>");
  return ctx;
}

export function useSyncState(): SyncState {
  return useDb().state;
}

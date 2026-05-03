"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDb } from "@/components/db-provider";

const WARM_ROUTES_MESSAGE = "PILOT_STUDY_WARM_ROUTES";
const OFFLINE_READY_ROUTES = [
  "/",
  "/study/knowledge",
  "/study/oral",
  "/database",
  "/progress",
  "/review-text",
  "/~offline",
];

export function OfflineRouteWarmer() {
  const router = useRouter();
  const { state } = useDb();
  const warmedForSnapshot = useRef<string | null>(null);

  useEffect(() => {
    if (!state.lastSyncAt || warmedForSnapshot.current === state.lastSyncAt) {
      return;
    }
    warmedForSnapshot.current = state.lastSyncAt;

    for (const route of OFFLINE_READY_ROUTES) {
      router.prefetch(route);
    }

    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.ready.then((registration) => {
      registration.active?.postMessage({
        type: WARM_ROUTES_MESSAGE,
        routes: OFFLINE_READY_ROUTES,
      });
    });
  }, [router, state.lastSyncAt]);

  return null;
}

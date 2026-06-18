"use client";

import { useCallback, useEffect, useState } from "react";
import type { AiFeature } from "@/lib/ai/models";

const STORAGE_PREFIX = "pilot-study:model:";

/**
 * Per-feature model preference persisted in localStorage. The selection is
 * shared across every surface of the same feature (e.g. all AI-chat panels),
 * but independent between features (cards vs study texts vs chat vs image).
 */
export function useModelPreference(
  feature: AiFeature,
  defaultModel: string
): readonly [string, (next: string) => void] {
  const [model, setModelState] = useState(defaultModel);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + feature);
      if (stored) setModelState(stored);
    } catch {
      // localStorage unavailable (private mode / SSR) — keep the default.
    }
  }, [feature]);

  const setModel = useCallback(
    (next: string) => {
      setModelState(next);
      try {
        localStorage.setItem(STORAGE_PREFIX + feature, next);
      } catch {
        // ignore persistence failures
      }
    },
    [feature]
  );

  return [model, setModel] as const;
}

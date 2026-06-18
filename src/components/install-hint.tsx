"use client";

import { useEffect, useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISSED_KEY = "pilot-study:install-hint-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Mode = "hidden" | "ios-safari" | "browser-prompt";

/**
 * Cross-platform PWA install hint.
 *
 * - iOS Safari: there is no automatic install button — show step-by-step
 *   instructions ("Tap Share, then Add to Home Screen"). iOS exposes
 *   `navigator.standalone` so we know if we're already installed.
 * - Other browsers (Android Chrome, desktop Chromium): listen for
 *   `beforeinstallprompt` and render a real button that fires `prompt()`.
 * - Already installed (display-mode standalone, or navigator.standalone):
 *   render nothing.
 *
 * Dismissal is sticky via localStorage so the banner doesn't nag.
 */
export function InstallHint() {
  const [mode, setMode] = useState<Mode>("hidden");
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (localStorage.getItem(DISMISSED_KEY) === "1") return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS-only flag (legacy but still authoritative on Safari).
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);

    if (isIos) {
      setMode("ios-safari");
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setMode("browser-prompt");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setMode("hidden");
  }

  async function triggerInstall() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      setMode("hidden");
    }
  }

  if (mode === "hidden") return null;

  return (
    <div className="w-full border-b bg-primary/5 backdrop-blur supports-[backdrop-filter]:bg-primary/10">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5 text-sm">
        <Download className="h-4 w-4 shrink-0 text-primary" />
        {mode === "ios-safari" ? (
          <span className="flex flex-1 flex-wrap items-center gap-1 text-foreground">
            Install Pilot Study: tap
            <Share className="inline h-3.5 w-3.5" aria-label="Share" />
            <span className="font-medium">Share</span>
            then
            <Plus className="inline h-3.5 w-3.5" aria-label="Add to Home Screen" />
            <span className="font-medium">Add to Home Screen</span>.
          </span>
        ) : (
          <div className="flex flex-1 items-center justify-between gap-2">
            <span>Install Pilot Study to your home screen for offline access.</span>
            <Button size="sm" onClick={() => void triggerInstall()}>
              Install
            </Button>
          </div>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Dismiss install hint"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

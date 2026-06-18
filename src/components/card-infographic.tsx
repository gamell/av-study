"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ImageIcon, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModelSelector } from "@/components/model-selector";
import {
  buildDefaultInfographicPrompt,
  type InfographicPromptCard,
} from "@/lib/infographic-generation";
import { DEFAULT_IMAGE_MODEL, IMAGE_MODELS } from "@/lib/ai/models";
import { useModelPreference } from "@/lib/ai/use-model-preference";
import {
  getInfographicForCard,
  insertInfographicFromServer,
} from "@/lib/data/infographics";
import type { CardInfographic as Infographic } from "@/lib/data/types";

interface CardInfographicProps {
  card: InfographicPromptCard & { id: number };
}

interface GenerateInfographicResponse {
  infographic?: Infographic;
  error?: string;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function CardInfographic({ card }: CardInfographicProps) {
  const [infographic, setInfographic] = useState<Infographic | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useModelPreference(
    "infographic",
    DEFAULT_IMAGE_MODEL
  );

  const defaultPrompt = useMemo(
    () => buildDefaultInfographicPrompt(card),
    [card.question, card.answer, card.acsCode, card.references]
  );
  const imageSrc = infographic
    ? `data:${infographic.mimeType};base64,${infographic.imageBase64}`
    : null;

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setEditingPrompt(false);
    setError(null);
    getInfographicForCard(card.id).then((row) => {
      if (cancelled) return;
      setInfographic(row);
      setPrompt(row?.prompt ?? defaultPrompt);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [card.id, defaultPrompt]);

  async function generate(nextPrompt: string): Promise<void> {
    if (generating) return;
    if (!navigator.onLine) {
      setError("Generating infographics requires an internet connection.");
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/cards/${card.id}/infographic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: nextPrompt, model }),
      });
      const data = (await response.json()) as GenerateInfographicResponse;
      if (!response.ok || data.error || !data.infographic) {
        throw new Error(data.error || "Failed to generate infographic.");
      }

      await insertInfographicFromServer(data.infographic);
      setInfographic(data.infographic);
      setPrompt(data.infographic.prompt);
      setEditingPrompt(false);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setGenerating(false);
    }
  }

  if (!loaded) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        Loading infographic...
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
        <ImageIcon className="h-4 w-4" />
        Infographic
        <ModelSelector
          models={IMAGE_MODELS}
          value={model}
          onChange={setModel}
          disabled={generating}
          aria-label="Infographic model"
          className="ml-auto"
        />
      </div>

      {imageSrc ? (
        <div className="space-y-3">
          <Image
            src={imageSrc}
            alt={`Study infographic for ${card.question}`}
            width={1024}
            height={1024}
            unoptimized
            className="w-full rounded-lg border bg-muted object-contain"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPrompt(infographic?.prompt ?? defaultPrompt);
                setEditingPrompt((open) => !open);
              }}
            >
              <Wand2 className="h-4 w-4 mr-1.5" />
              Generate Again
            </Button>
            <p className="text-xs text-muted-foreground">
              {infographic?.provider}/{infographic?.model}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Generate a visual study aid for this card. Generated images are saved
            for offline use after sync.
          </p>
          <Button
            size="sm"
            onClick={() => void generate(defaultPrompt)}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4 mr-1.5" />
            )}
            Generate infographic
          </Button>
        </div>
      )}

      {editingPrompt && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={7}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingPrompt(false)}
              disabled={generating}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void generate(prompt)}
              disabled={!prompt.trim() || generating}
            >
              {generating && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Generate
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

/**
 * Shared OpenRouter model registry. Imported by both server routes and client
 * UI, so this module must stay free of server-only or `"use client"` code.
 *
 * Every AI feature in the app routes through OpenRouter with a single
 * `OPENROUTER_API_KEY`. The curated lists below back the per-feature model
 * picker and act as a server-side allowlist for the `model` request param.
 * Slugs are plain OpenRouter model ids — edit these lists to taste; the
 * server defaults are additionally overridable via `OPENROUTER_MODEL` and
 * `OPENROUTER_IMAGE_MODEL`.
 */

export interface ModelOption {
  id: string;
  label: string;
}

/** AI features that surface a model picker. Used as localStorage namespaces. */
export type AiFeature =
  | "generate-cards"
  | "generate-text"
  | "chat"
  | "infographic";

/** Text/structured-output models (cards, study texts, in-card chat). */
export const TEXT_MODELS: readonly ModelOption[] = [
  { id: "openai/gpt-5.4", label: "GPT-5.4" },
  { id: "openai/gpt-5.4-mini", label: "GPT-5.4 Mini" },
  { id: "anthropic/claude-opus-4.5", label: "Claude Opus 4.5" },
  { id: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5" },
  { id: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
] as const;

/** Image-output models (card infographics). */
export const IMAGE_MODELS: readonly ModelOption[] = [
  { id: "openai/gpt-5.4-image-2", label: "GPT-5.4 Image 2" },
  {
    id: "google/gemini-2.5-flash-image-preview",
    label: "Gemini 2.5 Flash (image)",
  },
] as const;

export const DEFAULT_TEXT_MODEL = TEXT_MODELS[0].id;
export const DEFAULT_IMAGE_MODEL = "openai/gpt-5.4-image-2";

export function isAllowedTextModel(id: string | null | undefined): id is string {
  return !!id && TEXT_MODELS.some((m) => m.id === id);
}

export function isAllowedImageModel(
  id: string | null | undefined
): id is string {
  return !!id && IMAGE_MODELS.some((m) => m.id === id);
}

export function modelLabel(id: string): string {
  return (
    [...TEXT_MODELS, ...IMAGE_MODELS].find((m) => m.id === id)?.label ?? id
  );
}

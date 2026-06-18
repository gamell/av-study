import { DEFAULT_IMAGE_MODEL, isAllowedImageModel } from "@/lib/ai/models";

export const INFOGRAPHIC_PROVIDER = "openrouter";
export const DEFAULT_INFOGRAPHIC_MIME_TYPE = "image/png";

export interface InfographicPromptCard {
  question: string;
  answer: string;
  acsCode?: string | null;
  references?: string | null;
}

export function buildDefaultInfographicPrompt(
  card: InfographicPromptCard
): string {
  return `Create an infographic to help me study and remember the following aviation concept, factuality and veracity are paramount. Check official FAA sources if needed:

Question: ${card.question}
Answer: ${card.answer}
ACS Code: ${card.acsCode || "N/A"}
References: ${card.references || "N/A"}`;
}

export function normalizePrompt(
  prompt: unknown,
  card: InfographicPromptCard
): string {
  if (typeof prompt === "string") {
    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt) return trimmedPrompt;
  }

  return buildDefaultInfographicPrompt(card);
}

/**
 * Resolve the requested image model against the allowlist, falling back to the
 * env-configured or curated default.
 */
export function resolveInfographicModel(requested?: string | null): string {
  if (isAllowedImageModel(requested)) return requested;
  return process.env.OPENROUTER_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;
}

/**
 * OpenRouter generates images through the chat-completions endpoint when
 * `modalities` requests image output. See
 * https://openrouter.ai/docs/guides/overview/multimodal/image-generation
 */
export function buildOpenRouterImageRequest(
  model: string,
  prompt: string
): {
  model: string;
  modalities: string[];
  messages: Array<{ role: "user"; content: string }>;
} {
  return {
    model,
    modalities: ["image", "text"],
    messages: [{ role: "user", content: prompt }],
  };
}

export interface ParsedImageDataUrl {
  mimeType: string;
  base64: string;
}

/**
 * Parse a `data:<mime>;base64,<payload>` URL as returned in an OpenRouter
 * assistant message's `images[].image_url.url`.
 */
export function parseImageDataUrl(url: string): ParsedImageDataUrl | null {
  // `[\s\S]` instead of `.` + the `s` (dotAll) flag, which needs an es2018+
  // target. Base64 payloads can be long but contain no problematic chars.
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(url);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

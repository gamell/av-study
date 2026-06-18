import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { type LanguageModel } from "ai";
import {
  DEFAULT_TEXT_MODEL,
  isAllowedTextModel,
} from "@/lib/ai/models";

export const FACTUALITY_DIRECTIVE = `FACTUALITY AND VERACITY ARE PARAMOUNT.

This is FAA Private Pilot exam preparation material. Inaccurate content could contribute to unsafe flying decisions. You MUST:

- State only facts you are certain about. If you are unsure, say "verify this against the current FAA source" rather than guessing.
- Never invent CFR section numbers, ACS codes, AIM section numbers, PHAK or AFH chapter references, aircraft limitations, or procedures. Cite a reference only if you are confident it is correct and current.
- Prefer primary FAA sources (14 CFR Part 61/91, AIM, FAA-H-8083-25/-3, ACS) over paraphrased second-hand info.
- When current FAA guidance has changed or you are not sure of the latest, flag it so the student verifies before relying on it.
- If a question is outside your knowledge or beyond verifiable FAA material, say so clearly instead of fabricating an answer.`;

export class NoLlmProviderError extends Error {
  constructor() {
    super("No LLM provider configured. Set OPENROUTER_API_KEY.");
    this.name = "NoLlmProviderError";
  }
}

let _provider: ReturnType<typeof createOpenRouter> | null = null;

function provider(): ReturnType<typeof createOpenRouter> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new NoLlmProviderError();
  if (!_provider) {
    _provider = createOpenRouter({
      apiKey,
      appName: "Pilot Study",
      appUrl: process.env.OPENROUTER_SITE_URL,
    });
  }
  return _provider;
}

/** Server-side default text model (env override wins over the curated default). */
export function serverDefaultTextModel(): string {
  return process.env.OPENROUTER_MODEL || DEFAULT_TEXT_MODEL;
}

/**
 * Resolve a client-requested model id against the allowlist, falling back to
 * the server default for anything missing or not permitted. Returns the slug
 * to use (also persisted alongside generated content for display).
 */
export function resolveTextModel(requested?: string | null): string {
  return isAllowedTextModel(requested) ? requested : serverDefaultTextModel();
}

/** Build an OpenRouter chat model. Throws {@link NoLlmProviderError} if unkeyed. */
export function getTextModel(modelId: string): LanguageModel {
  return provider().chat(modelId);
}

/** True when an OpenRouter key is configured. */
export function hasLlmProvider(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

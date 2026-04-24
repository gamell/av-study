import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { type ProviderOptions } from "@ai-sdk/provider-utils";
import { type LanguageModel } from "ai";

type Provider = "anthropic" | "openai" | "google";

interface Attempt {
  provider: Provider;
  model: string;
  providerOptions?: ProviderOptions;
}

/**
 * Ordered list of attempts. Runtime iterates in this order (after moving the
 * `LLM_PROVIDER`-requested provider's attempts to the front, if any) and
 * returns the first success. Attempts whose API key env var is missing are
 * skipped entirely before any network call is made.
 */
const ATTEMPTS: readonly Attempt[] = [
  {
    provider: "anthropic",
    // Verified id for Claude Opus 4.6 per
    // https://docs.anthropic.com/en/docs/about-claude/models/all-models.
    model: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-6",
    providerOptions: {
      // Opus 4.6 "max effort": adaptive extended thinking + effort:"max".
      // The older manual `budgetTokens` form is deprecated on Opus 4.6.
      anthropic: { thinking: { type: "adaptive" }, effort: "max" },
    },
  },
  {
    provider: "anthropic",
    // Per-provider Anthropic fallback. Stays on Opus by preference; 4.5 does
    // not support the new adaptive thinking flag, so no providerOptions here.
    model: process.env.ANTHROPIC_MODEL_FALLBACK ?? "claude-opus-4-5-20251101",
  },
  {
    provider: "openai",
    // GPT-5.5 released 2026-04-23. If the key's tier doesn't have API access
    // yet, the next attempt (5.4) catches the 404/403 automatically.
    model: process.env.OPENAI_MODEL ?? "gpt-5.5",
  },
  {
    provider: "openai",
    model: process.env.OPENAI_MODEL_FALLBACK ?? "gpt-5.4",
  },
  {
    provider: "google",
    // Gemini 3.1 Pro is still preview as of Feb 2026; switch to
    // `gemini-3.1-pro` via env when it goes GA.
    model: process.env.GOOGLE_MODEL ?? "gemini-3.1-pro-preview",
  },
  {
    provider: "google",
    // Latest stable Gemini Pro as of 2026-04. Gemini 3.0 has been deprecated.
    model: process.env.GOOGLE_MODEL_FALLBACK ?? "gemini-2.5-pro",
  },
] as const;

export const FACTUALITY_DIRECTIVE = `FACTUALITY AND VERACITY ARE PARAMOUNT.

This is FAA Private Pilot exam preparation material. Inaccurate content could contribute to unsafe flying decisions. You MUST:

- State only facts you are certain about. If you are unsure, say "verify this against the current FAA source" rather than guessing.
- Never invent CFR section numbers, ACS codes, AIM section numbers, PHAK or AFH chapter references, aircraft limitations, or procedures. Cite a reference only if you are confident it is correct and current.
- Prefer primary FAA sources (14 CFR Part 61/91, AIM, FAA-H-8083-25/-3, ACS) over paraphrased second-hand info.
- When current FAA guidance has changed or you are not sure of the latest, flag it so the student verifies before relying on it.
- If a question is outside your knowledge or beyond verifiable FAA material, say so clearly instead of fabricating an answer.`;

function hasApiKey(a: Attempt): boolean {
  switch (a.provider) {
    case "anthropic":
      return !!process.env.ANTHROPIC_API_KEY;
    case "openai":
      return !!process.env.OPENAI_API_KEY;
    case "google":
      return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  }
}

function orderedAttempts(): Attempt[] {
  const requested = process.env.LLM_PROVIDER as Provider | undefined;
  const base: readonly Attempt[] = requested
    ? [
        ...ATTEMPTS.filter((a) => a.provider === requested),
        ...ATTEMPTS.filter((a) => a.provider !== requested),
      ]
    : ATTEMPTS;
  return base.filter(hasApiKey);
}

function buildModel(attempt: Attempt): LanguageModel {
  switch (attempt.provider) {
    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      return anthropic(attempt.model);
    }
    case "openai": {
      const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
      return openai(attempt.model);
    }
    case "google": {
      const google = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      });
      return google(attempt.model);
    }
  }
}

export interface LlmFallbackResult<T> {
  result: T;
  provider: Provider;
  model: string;
}

export class NoLlmProviderError extends Error {
  constructor() {
    super(
      "No LLM provider configured. Set at least one of ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY."
    );
    this.name = "NoLlmProviderError";
  }
}

export class AllProvidersFailedError extends Error {
  constructor(
    message: string,
    public attempts: Array<{ provider: Provider; model: string; error: string }>
  ) {
    super(message);
    this.name = "AllProvidersFailedError";
  }
}

/**
 * Runs `fn` against each configured provider/model in priority order and
 * returns the first success. The requested `LLM_PROVIDER` (if any) goes
 * first; attempts without an API key are skipped; any thrown error moves on
 * to the next attempt. If every attempt fails, throws
 * `AllProvidersFailedError` with per-attempt error details.
 */
export async function tryWithFallback<T>(
  fn: (model: LanguageModel, providerOptions?: ProviderOptions) => Promise<T>
): Promise<LlmFallbackResult<T>> {
  const attempts = orderedAttempts();
  if (attempts.length === 0) {
    throw new NoLlmProviderError();
  }

  const failures: Array<{ provider: Provider; model: string; error: string }> =
    [];

  for (const attempt of attempts) {
    try {
      const model = buildModel(attempt);
      const result = await fn(model, attempt.providerOptions);
      if (failures.length > 0) {
        console.warn(
          `[llm] succeeded with ${attempt.provider}/${attempt.model} after ${failures.length} failed attempt(s)`
        );
      }
      return { result, provider: attempt.provider, model: attempt.model };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failures.push({
        provider: attempt.provider,
        model: attempt.model,
        error: message,
      });
      console.warn(
        `[llm] attempt failed: ${attempt.provider}/${attempt.model} — ${message}`
      );
    }
  }

  throw new AllProvidersFailedError(
    `All ${failures.length} LLM attempts failed: ${failures
      .map((f) => `${f.provider}/${f.model} (${f.error})`)
      .join("; ")}`,
    failures
  );
}

import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { type LanguageModel } from "ai";

type Provider = "openai" | "anthropic" | "google";

function getProvider(): Provider {
  const provider = process.env.LLM_PROVIDER || "openai";
  if (!["openai", "anthropic", "google"].includes(provider)) {
    throw new Error(
      `Invalid LLM_PROVIDER "${provider}". Must be "openai", "anthropic", or "google".`
    );
  }
  return provider as Provider;
}

export function getModel(): LanguageModel {
  const provider = getProvider();

  switch (provider) {
    case "openai": {
      const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      return openai(process.env.OPENAI_MODEL || "gpt-4o");
    }
    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      return anthropic(
        process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514"
      );
    }
    case "google": {
      const google = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      });
      return google(process.env.GOOGLE_MODEL || "gemini-2.0-flash");
    }
  }
}

export function getProviderInfo() {
  const provider = getProvider();
  const models: Record<Provider, string> = {
    openai: process.env.OPENAI_MODEL || "gpt-4o",
    anthropic: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
    google: process.env.GOOGLE_MODEL || "gemini-2.0-flash",
  };
  return { provider, model: models[provider] };
}

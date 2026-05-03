export const INFOGRAPHIC_PROVIDER = "openai";
export const INFOGRAPHIC_IMAGE_MODEL = "gpt-image-2";
export const INFOGRAPHIC_MIME_TYPE = "image/png";

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

export function buildOpenAIImageRequest(prompt: string): {
  model: string;
  prompt: string;
} {
  return {
    model: INFOGRAPHIC_IMAGE_MODEL,
    prompt,
  };
}

import { expect, test } from "bun:test";
import {
  buildDefaultInfographicPrompt,
  buildOpenRouterImageRequest,
  normalizePrompt,
  parseImageDataUrl,
  resolveInfographicModel,
} from "../infographic-generation";
import { DEFAULT_IMAGE_MODEL } from "../ai/models";

const card = {
  question: "What causes a wing to stall?",
  answer: "A wing stalls when it exceeds its critical angle of attack.",
  acsCode: "PA.I.F.K1",
  references: "PHAK Chapter 5",
};

test("builds the default infographic prompt from card content", () => {
  const prompt = buildDefaultInfographicPrompt(card);

  expect(prompt).toContain(
    "Create an infographic to help me study and remember the following aviation concept"
  );
  expect(prompt).toContain("factuality and veracity are paramount");
  expect(prompt).toContain("Question: What causes a wing to stall?");
  expect(prompt).toContain(
    "Answer: A wing stalls when it exceeds its critical angle of attack."
  );
  expect(prompt).toContain("ACS Code: PA.I.F.K1");
  expect(prompt).toContain("References: PHAK Chapter 5");
});

test("normalizes a custom prompt or falls back to the default prompt", () => {
  expect(normalizePrompt("  custom prompt  ", card)).toBe("custom prompt");
  expect(normalizePrompt("", card)).toBe(buildDefaultInfographicPrompt(card));
});

test("builds the OpenRouter image generation request payload", () => {
  expect(
    buildOpenRouterImageRequest("openai/gpt-5.4-image-2", "study image")
  ).toEqual({
    model: "openai/gpt-5.4-image-2",
    modalities: ["image", "text"],
    messages: [{ role: "user", content: "study image" }],
  });
});

test("resolves the image model against the allowlist with a default fallback", () => {
  expect(resolveInfographicModel("openai/gpt-5.4-image-2")).toBe(
    "openai/gpt-5.4-image-2"
  );
  expect(resolveInfographicModel("not-a-real-model")).toBe(DEFAULT_IMAGE_MODEL);
  expect(resolveInfographicModel(null)).toBe(DEFAULT_IMAGE_MODEL);
});

test("parses a base64 image data URL", () => {
  expect(
    parseImageDataUrl("data:image/png;base64,aW1n")
  ).toEqual({ mimeType: "image/png", base64: "aW1n" });
  expect(parseImageDataUrl("https://example.com/x.png")).toBeNull();
});

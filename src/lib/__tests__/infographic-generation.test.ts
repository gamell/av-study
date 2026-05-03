import { expect, test } from "bun:test";
import {
  buildDefaultInfographicPrompt,
  buildOpenAIImageRequest,
  normalizePrompt,
} from "../infographic-generation";

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

test("builds the OpenAI image generation request payload", () => {
  expect(buildOpenAIImageRequest("study image")).toEqual({
    model: "gpt-image-2",
    prompt: "study image",
  });
});

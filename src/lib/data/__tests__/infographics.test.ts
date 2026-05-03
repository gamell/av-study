import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, test } from "bun:test";
import type { CardInfographic } from "../types";

beforeEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: globalThis,
  });
});

afterEach(async () => {
  const { getClientDb } = await import("../db");
  const db = getClientDb();
  await db.cardInfographics.clear();
});

function infographicRow(
  patch: Partial<CardInfographic> = {}
): CardInfographic {
  return {
    id: 1,
    cardId: 42,
    prompt: "initial prompt",
    imageBase64: "aW5mb2dyYXBoaWM=",
    mimeType: "image/png",
    provider: "openai",
    model: "gpt-image-2",
    createdAt: "2026-05-02T10:00:00.000Z",
    updatedAt: "2026-05-02T10:00:00.000Z",
    ...patch,
  };
}

test("stores and reads an infographic by card id", async () => {
  const { getInfographicForCard, insertInfographicFromServer } = await import(
    "../infographics"
  );

  const row = infographicRow();
  await insertInfographicFromServer(row);

  expect(await getInfographicForCard(42)).toEqual(row);
  expect(await getInfographicForCard(7)).toBeNull();
});

test("replaces an existing infographic for the same card", async () => {
  const { getInfographicForCard, insertInfographicFromServer } = await import(
    "../infographics"
  );

  await insertInfographicFromServer(infographicRow());
  const replacement = infographicRow({
    id: 2,
    prompt: "edited prompt",
    imageBase64: "bmV3LWltYWdl",
    updatedAt: "2026-05-02T10:05:00.000Z",
  });

  await insertInfographicFromServer(replacement);

  expect(await getInfographicForCard(42)).toEqual(replacement);
});

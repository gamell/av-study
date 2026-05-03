import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/ensure-seeded";
import {
  cardInfographics,
  cards,
  type CardInfographic,
} from "@/lib/db/schema";
import {
  buildOpenAIImageRequest,
  INFOGRAPHIC_IMAGE_MODEL,
  INFOGRAPHIC_MIME_TYPE,
  INFOGRAPHIC_PROVIDER,
  normalizePrompt,
} from "@/lib/infographic-generation";

const OPENAI_IMAGE_GENERATIONS_URL =
  "https://api.openai.com/v1/images/generations";

interface OpenAIImageResponse {
  data?: Array<{
    b64_json?: string;
  }>;
  error?: {
    message?: string;
  };
}

async function readOpenAIError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as OpenAIImageResponse;
    return (
      data.error?.message || `OpenAI image generation failed (${response.status})`
    );
  } catch {
    return `OpenAI image generation failed (${response.status})`;
  }
}

async function fetchOpenAIImageBase64(
  prompt: string,
  apiKey: string
): Promise<string | undefined> {
  const openAiResponse = await fetch(OPENAI_IMAGE_GENERATIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildOpenAIImageRequest(prompt)),
  });

  if (!openAiResponse.ok) {
    throw new Error(await readOpenAIError(openAiResponse));
  }

  const data = (await openAiResponse.json()) as OpenAIImageResponse;
  return data.data?.[0]?.b64_json;
}

async function saveInfographic(
  cardId: number,
  prompt: string,
  imageBase64: string
): Promise<CardInfographic> {
  const now = new Date().toISOString();
  const [saved] = await db
    .insert(cardInfographics)
    .values({
      cardId,
      prompt,
      imageBase64,
      mimeType: INFOGRAPHIC_MIME_TYPE,
      provider: INFOGRAPHIC_PROVIDER,
      model: INFOGRAPHIC_IMAGE_MODEL,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: cardInfographics.cardId,
      set: {
        prompt,
        imageBase64,
        mimeType: INFOGRAPHIC_MIME_TYPE,
        provider: INFOGRAPHIC_PROVIDER,
        model: INFOGRAPHIC_IMAGE_MODEL,
        updatedAt: now,
      },
    })
    .returning();

  if (!saved) {
    throw new Error("Failed to save generated infographic.");
  }

  return saved;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  await ensureDatabase();
  const { id } = await params;
  const cardId = Number.parseInt(id, 10);
  if (!Number.isFinite(cardId)) {
    return NextResponse.json({ error: "Invalid card id" }, { status: 400 });
  }

  const [card] = await db.select().from(cards).where(eq(cards.id, cardId));
  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "No OpenAI API key configured. Set OPENAI_API_KEY." },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { prompt?: unknown };
  const prompt = normalizePrompt(body.prompt, card);

  let imageBase64: string | undefined;
  try {
    imageBase64 = await fetchOpenAIImageBase64(prompt, apiKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!imageBase64) {
    return NextResponse.json(
      { error: "OpenAI returned no image data." },
      { status: 502 }
    );
  }

  const saved = await saveInfographic(cardId, prompt, imageBase64);

  return NextResponse.json({
    infographic: saved,
    provider: saved.provider,
    model: saved.model,
  });
}

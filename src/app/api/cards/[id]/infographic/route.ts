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
  DEFAULT_INFOGRAPHIC_MIME_TYPE,
  INFOGRAPHIC_PROVIDER,
  buildOpenRouterImageRequest,
  normalizePrompt,
  parseImageDataUrl,
  resolveInfographicModel,
} from "@/lib/infographic-generation";

const OPENROUTER_CHAT_COMPLETIONS_URL =
  "https://openrouter.ai/api/v1/chat/completions";

interface OpenRouterImageMessage {
  images?: Array<{
    image_url?: {
      url?: string;
    };
  }>;
}

interface OpenRouterChatResponse {
  choices?: Array<{
    message?: OpenRouterImageMessage;
  }>;
  error?: {
    message?: string;
  };
}

async function readOpenRouterError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as OpenRouterChatResponse;
    return (
      data.error?.message ||
      `OpenRouter image generation failed (${response.status})`
    );
  } catch {
    return `OpenRouter image generation failed (${response.status})`;
  }
}

interface GeneratedImage {
  base64: string;
  mimeType: string;
}

async function fetchOpenRouterImage(
  model: string,
  prompt: string,
  apiKey: string
): Promise<GeneratedImage | undefined> {
  const response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildOpenRouterImageRequest(model, prompt)),
  });

  if (!response.ok) {
    throw new Error(await readOpenRouterError(response));
  }

  const data = (await response.json()) as OpenRouterChatResponse;
  const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) return undefined;

  const parsed = parseImageDataUrl(url);
  if (!parsed) return undefined;
  return { base64: parsed.base64, mimeType: parsed.mimeType };
}

async function saveInfographic(
  cardId: number,
  prompt: string,
  model: string,
  image: GeneratedImage
): Promise<CardInfographic> {
  const now = new Date().toISOString();
  const mimeType = image.mimeType || DEFAULT_INFOGRAPHIC_MIME_TYPE;
  const [saved] = await db
    .insert(cardInfographics)
    .values({
      cardId,
      prompt,
      imageBase64: image.base64,
      mimeType,
      provider: INFOGRAPHIC_PROVIDER,
      model,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: cardInfographics.cardId,
      set: {
        prompt,
        imageBase64: image.base64,
        mimeType,
        provider: INFOGRAPHIC_PROVIDER,
        model,
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

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "No LLM provider configured. Set OPENROUTER_API_KEY." },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    prompt?: unknown;
    model?: unknown;
  };
  const prompt = normalizePrompt(body.prompt, card);
  const model = resolveInfographicModel(
    typeof body.model === "string" ? body.model : null
  );

  let image: GeneratedImage | undefined;
  try {
    image = await fetchOpenRouterImage(model, prompt, apiKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!image) {
    return NextResponse.json(
      { error: "OpenRouter returned no image data." },
      { status: 502 }
    );
  }

  const saved = await saveInfographic(cardId, prompt, model, image);

  return NextResponse.json({
    infographic: saved,
    provider: saved.provider,
    model: saved.model,
  });
}

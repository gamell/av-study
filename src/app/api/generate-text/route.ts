import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import {
  FACTUALITY_DIRECTIVE,
  NoLlmProviderError,
  tryWithFallback,
} from "@/lib/llm";
import { db } from "@/lib/db";
import { cards, cardProgress, studyTexts } from "@/lib/db/schema";
import { eq, and, lt, asc, inArray } from "drizzle-orm";
import { ensureDatabase } from "@/lib/db/ensure-seeded";

export async function POST(request: NextRequest) {
  await ensureDatabase();

  const { cardIds, mode } = await request.json();

  let selectedCards;

  if (mode === "auto") {
    // Auto-select: cards with low ease factor or recently failed
    selectedCards = await db
      .select({
        id: cards.id,
        question: cards.question,
        answer: cards.answer,
        acsCode: cards.acsCode,
        references: cards.references,
        easeFactor: cardProgress.easeFactor,
      })
      .from(cards)
      .innerJoin(cardProgress, eq(cards.id, cardProgress.cardId))
      .where(lt(cardProgress.easeFactor, 2.5))
      .orderBy(asc(cardProgress.easeFactor))
      .limit(15);
  } else {
    if (!cardIds?.length) {
      return NextResponse.json(
        { error: "cardIds required for manual mode" },
        { status: 400 }
      );
    }
    selectedCards = await db
      .select({
        id: cards.id,
        question: cards.question,
        answer: cards.answer,
        acsCode: cards.acsCode,
        references: cards.references,
        easeFactor: cardProgress.easeFactor,
      })
      .from(cards)
      .innerJoin(cardProgress, eq(cards.id, cardProgress.cardId))
      .where(inArray(cards.id, cardIds));
  }

  if (!selectedCards.length) {
    return NextResponse.json(
      { error: "No cards found to review" },
      { status: 404 }
    );
  }

  const conceptList = selectedCards
    .map(
      (c, i) =>
        `${i + 1}. Question: ${c.question}\n   Answer: ${c.answer}\n   Reference: ${c.references || "N/A"}`
    )
    .join("\n\n");

  let result;
  let provider: string;
  let modelName: string;
  try {
    const outcome = await tryWithFallback((model, providerOptions) =>
      generateText({
        model,
        providerOptions,
        prompt: `${FACTUALITY_DIRECTIVE}

You are an experienced flight instructor creating a study guide for a student pilot preparing for their private pilot certificate. The student has been struggling with the following concepts. Write a clear, engaging study text that:

1. Explains each concept thoroughly, focusing on the "why" behind it
2. Connects related concepts together so the student sees the bigger picture
3. Includes helpful mnemonics, memory tricks, or analogies
4. Uses a conversational, encouraging tone (this will be listened to as audio while running)
5. Flows naturally as continuous prose -- no bullet points or numbered lists
6. Starts with the most fundamental concepts and builds up
7. Ends with a brief summary tying everything together

Concepts the student needs to review:

${conceptList}

Write the study text now. Make it thorough but engaging -- approximately 200-400 words per concept. If you are not confident about a specific fact or reference, hedge it ("verify in the current PHAK" etc.) rather than asserting it.`,
      })
    );
    result = outcome.result;
    provider = outcome.provider;
    modelName = outcome.model;
  } catch (err) {
    if (err instanceof NoLlmProviderError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const title = `Study Review - ${selectedCards.length} concepts - ${new Date().toLocaleDateString()}`;

  const [saved] = await db
    .insert(studyTexts)
    .values({
      title,
      content: result.text,
      cardIds: JSON.stringify(selectedCards.map((c) => c.id)),
      provider,
      model: modelName,
    })
    .returning();

  return NextResponse.json({
    id: saved.id,
    title: saved.title,
    content: result.text,
    cardCount: selectedCards.length,
    provider,
    model: modelName,
  });
}

export async function GET() {
  await ensureDatabase();

  const texts = await db
    .select()
    .from(studyTexts)
    .orderBy(studyTexts.createdAt);

  return NextResponse.json(texts);
}

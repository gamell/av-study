import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { getModel, getProviderInfo } from "@/lib/llm";
import { db } from "@/lib/db";
import { cards, cardProgress, categories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { ensureDatabase } from "@/lib/db/ensure-seeded";

const cardSchema = z.object({
  cards: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
      acsCode: z.string().nullable(),
      references: z.string(),
    })
  ),
});

export async function POST(request: NextRequest) {
  await ensureDatabase();

  const { topic, deckType, count: cardCount = 10 } = await request.json();

  if (!topic || !deckType) {
    return NextResponse.json(
      { error: "topic and deckType required" },
      { status: 400 }
    );
  }

  const style =
    deckType === "oral"
      ? "scenario-based questions as a Designated Pilot Examiner (DPE) would ask during the oral portion of a checkride. Frame questions as scenarios."
      : "factual knowledge questions for the FAA Private Pilot Knowledge Test (written exam). Focus on regulations, procedures, and aeronautical knowledge.";

  const model = getModel();
  const { provider, model: modelName } = getProviderInfo();

  const result = await generateObject({
    model,
    schema: cardSchema,
    prompt: `Generate ${cardCount} high-quality flashcards about "${topic}" for private pilot exam preparation.

Style: ${style}

Requirements:
- Each question should test understanding, not just memorization
- Answers should be 2-5 sentences, explaining the "why" behind the concept
- Include ACS codes where applicable (format: PA.X.X.Kn)
- Reference specific FAA publications (PHAK chapters, 14 CFR sections, AIM sections, AFH chapters)
- Be factually accurate per current FAA regulations
- Include mnemonics where commonly used in aviation

Return exactly ${cardCount} cards.`,
  });

  // Find or create category
  let [category] = await db
    .select()
    .from(categories)
    .where(
      and(eq(categories.name, topic), eq(categories.deckType, deckType))
    );

  if (!category) {
    [category] = await db
      .insert(categories)
      .values({
        name: topic,
        acsArea: "AI",
        deckType,
        description: `AI-generated cards about ${topic}`,
      })
      .returning();
  }

  const insertedCards = [];
  for (const card of result.object.cards) {
    const [inserted] = await db
      .insert(cards)
      .values({
        categoryId: category.id,
        question: card.question,
        answer: card.answer,
        acsCode: card.acsCode,
        references: card.references,
        deckType,
        isGenerated: true,
      })
      .returning();

    await db.insert(cardProgress).values({
      cardId: inserted.id,
      repetitions: 0,
      easeFactor: 2.5,
      interval: 0,
      nextReviewAt: new Date().toISOString(),
    });

    insertedCards.push(inserted);
  }

  return NextResponse.json({
    generated: insertedCards.length,
    provider,
    model: modelName,
    cards: insertedCards,
  });
}

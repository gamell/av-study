import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import {
  FACTUALITY_DIRECTIVE,
  NoLlmProviderError,
  getTextModel,
  resolveTextModel,
} from "@/lib/llm";
import { db } from "@/lib/db";
import { cards, cardNotes } from "@/lib/db/schema";
import { eq, asc, and, inArray } from "drizzle-orm";
import { ensureDatabase } from "@/lib/db/ensure-seeded";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDatabase();
  const { id } = await params;
  const cardId = parseInt(id, 10);
  const { message, model: requestedModel } = await request.json();

  if (!message?.trim()) {
    return NextResponse.json(
      { error: "message is required" },
      { status: 400 }
    );
  }

  const [card] = await db
    .select()
    .from(cards)
    .where(eq(cards.id, cardId));

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  // Save user message
  const [userNote] = await db
    .insert(cardNotes)
    .values({
      cardId,
      type: "ai_user",
      content: message.trim(),
    })
    .returning();

  // Load chat history
  const history = await db
    .select()
    .from(cardNotes)
    .where(
      and(
        eq(cardNotes.cardId, cardId),
        inArray(cardNotes.type, ["ai_user", "ai_assistant"])
      )
    )
    .orderBy(asc(cardNotes.createdAt));

  const chatHistory = history
    .map(
      (h) =>
        `${h.type === "ai_user" ? "Student" : "Instructor"}: ${h.content}`
    )
    .join("\n\n");

  const provider = "openrouter";
  const modelName = resolveTextModel(requestedModel);
  let result;
  try {
    result = await generateText({
      model: getTextModel(modelName),
      prompt: `${FACTUALITY_DIRECTIVE}

You are an experienced FAA-certified flight instructor helping a student pilot study for their private pilot certificate. You are discussing a specific flashcard.

Flashcard context:
- Question: ${card.question}
- Answer: ${card.answer}
- ACS Code: ${card.acsCode || "N/A"}
- References: ${card.references || "N/A"}

${chatHistory ? `Previous conversation:\n${chatHistory}\n\n` : ""}The student asks: ${message.trim()}

Respond as a knowledgeable, encouraging flight instructor. Be thorough but concise. Cite specific FAA publications, regulations, or handbook chapters only when you are confident they are correct and current. If the student seems confused, try a different angle or analogy. If asked about something outside verifiable FAA material, say so clearly rather than guessing.`,
    });
  } catch (err) {
    if (err instanceof NoLlmProviderError) {
      return NextResponse.json(
        { error: err.message, user: userNote },
        { status: 503 }
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message, user: userNote }, { status: 502 });
  }

  // Save assistant response
  const [saved] = await db
    .insert(cardNotes)
    .values({
      cardId,
      type: "ai_assistant",
      content: result.text,
    })
    .returning();

  return NextResponse.json({
    id: saved.id,
    content: result.text,
    user: userNote,
    assistant: saved,
    provider,
    model: modelName,
  });
}

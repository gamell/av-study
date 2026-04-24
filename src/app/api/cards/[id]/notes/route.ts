import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cardNotes } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { ensureDatabase } from "@/lib/db/ensure-seeded";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDatabase();
  const { id } = await params;
  const cardId = parseInt(id, 10);

  const notes = await db
    .select()
    .from(cardNotes)
    .where(eq(cardNotes.cardId, cardId))
    .orderBy(asc(cardNotes.createdAt));

  return NextResponse.json(notes);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDatabase();
  const { id } = await params;
  const cardId = parseInt(id, 10);
  const { content, type = "note" } = await request.json();

  if (!content?.trim()) {
    return NextResponse.json(
      { error: "content is required" },
      { status: 400 }
    );
  }

  const [note] = await db
    .insert(cardNotes)
    .values({
      cardId,
      type,
      content: content.trim(),
    })
    .returning();

  return NextResponse.json(note);
}

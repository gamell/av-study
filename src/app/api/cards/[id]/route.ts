import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cards, cardProgress, cardNotes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ensureDatabase } from "@/lib/db/ensure-seeded";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDatabase();
  const { id } = await params;
  const cardId = parseInt(id, 10);
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (body.question !== undefined) updates.question = body.question;
  if (body.answer !== undefined) updates.answer = body.answer;
  if (body.acsCode !== undefined) updates.acsCode = body.acsCode;
  if (body.references !== undefined) updates.references = body.references;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 }
    );
  }

  updates.updatedAt = new Date().toISOString();

  const [updated] = await db
    .update(cards)
    .set(updates)
    .where(eq(cards.id, cardId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDatabase();
  const { id } = await params;
  const cardId = parseInt(id, 10);

  await db.delete(cardNotes).where(eq(cardNotes.cardId, cardId));
  await db.delete(cardProgress).where(eq(cardProgress.cardId, cardId));
  await db.delete(cards).where(eq(cards.id, cardId));

  return NextResponse.json({ success: true });
}

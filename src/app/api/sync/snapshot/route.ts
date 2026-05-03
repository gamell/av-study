import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  categories,
  cards,
  cardProgress,
  studySessions,
  studyTexts,
  cardNotes,
  cardInfographics,
} from "@/lib/db/schema";
import { ensureDatabase } from "@/lib/db/ensure-seeded";

export async function GET() {
  await ensureDatabase();

  const [
    categoriesRows,
    cardsRows,
    cardProgressRows,
    studySessionsRows,
    studyTextsRows,
    cardNotesRows,
    cardInfographicsRows,
  ] = await Promise.all([
    db.select().from(categories),
    db.select().from(cards),
    db.select().from(cardProgress),
    db.select().from(studySessions),
    db.select().from(studyTexts),
    db.select().from(cardNotes),
    db.select().from(cardInfographics),
  ]);

  return NextResponse.json(
    {
      serverTime: new Date().toISOString(),
      categories: categoriesRows,
      cards: cardsRows,
      cardProgress: cardProgressRows,
      studySessions: studySessionsRows,
      studyTexts: studyTextsRows,
      cardNotes: cardNotesRows,
      cardInfographics: cardInfographicsRows,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

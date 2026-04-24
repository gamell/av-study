import { db } from "./index";
import { categories, cards, cardProgress } from "./schema";
import { count } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

let initialized = false;

export async function ensureDatabase() {
  if (initialized) return;

  // Run migrations
  migrate(db, { migrationsFolder: "./drizzle" });

  // Check if already seeded
  const [{ total }] = await db.select({ total: count() }).from(cards);

  if (total === 0) {
    console.log("First run detected. Seeding database...");

    const knowledgeDeck = (await import("@/data/knowledge-deck.json")).default;
    const oralDeck = (await import("@/data/oral-deck.json")).default;

    for (const deck of [
      { data: knowledgeDeck, deckType: "knowledge" as const },
      { data: oralDeck, deckType: "oral" as const },
    ]) {
      const categoryMap = new Map<string, number>();

      for (const cat of deck.data.categories) {
        const [inserted] = await db
          .insert(categories)
          .values({
            name: cat.name,
            acsArea: cat.acsArea,
            deckType: deck.deckType,
            description: cat.description,
          })
          .returning({ id: categories.id });
        categoryMap.set(cat.name, inserted.id);
      }

      for (const card of deck.data.cards) {
        const categoryId = categoryMap.get(card.category);
        if (!categoryId) continue;

        const [inserted] = await db
          .insert(cards)
          .values({
            categoryId,
            question: card.question,
            answer: card.answer,
            acsCode: card.acsCode,
            references: card.references,
            deckType: deck.deckType,
            isGenerated: false,
          })
          .returning({ id: cards.id });

        await db.insert(cardProgress).values({
          cardId: inserted.id,
          repetitions: 0,
          easeFactor: 2.5,
          interval: 0,
          nextReviewAt: new Date().toISOString(),
        });
      }
    }

    console.log("Database seeded successfully.");
  }

  initialized = true;
}

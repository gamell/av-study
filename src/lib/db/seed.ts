import { db } from "./index";
import { categories, cards, cardProgress } from "./schema";
import { count } from "drizzle-orm";
import knowledgeDeck from "@/data/knowledge-deck.json";
import oralDeck from "@/data/oral-deck.json";

interface DeckFile {
  categories: {
    name: string;
    acsArea: string;
    description: string;
  }[];
  cards: {
    question: string;
    answer: string;
    acsCode: string | null;
    references: string;
    category: string;
  }[];
}

async function seed() {
  const [{ total }] = await db
    .select({ total: count() })
    .from(cards);

  if (total > 0) {
    console.log(`Database already seeded with ${total} cards. Skipping.`);
    return;
  }

  console.log("Seeding database...");

  for (const deck of [
    { data: knowledgeDeck as DeckFile, deckType: "knowledge" as const },
    { data: oralDeck as DeckFile, deckType: "oral" as const },
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
      if (!categoryId) {
        console.warn(
          `Category "${card.category}" not found for card: ${card.question.substring(0, 50)}...`
        );
        continue;
      }

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

    console.log(
      `Seeded ${deck.data.cards.length} ${deck.deckType} cards in ${deck.data.categories.length} categories`
    );
  }

  console.log("Seeding complete!");
}

seed().catch(console.error);

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  acsArea: text("acs_area").notNull(),
  deckType: text("deck_type", { enum: ["knowledge", "oral"] }).notNull(),
  description: text("description").notNull(),
});

export const cards = sqliteTable("cards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  acsCode: text("acs_code"),
  references: text("references"),
  deckType: text("deck_type", { enum: ["knowledge", "oral"] }).notNull(),
  isGenerated: integer("is_generated", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const cardProgress = sqliteTable("card_progress", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cardId: integer("card_id")
    .notNull()
    .unique()
    .references(() => cards.id, { onDelete: "cascade" }),
  repetitions: integer("repetitions").notNull().default(0),
  easeFactor: real("ease_factor").notNull().default(2.5),
  interval: integer("interval").notNull().default(0),
  nextReviewAt: text("next_review_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  lastReviewedAt: text("last_reviewed_at"),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const studySessions = sqliteTable("study_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  deckType: text("deck_type", { enum: ["knowledge", "oral"] }).notNull(),
  startedAt: text("started_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  endedAt: text("ended_at"),
  cardsReviewed: integer("cards_reviewed").notNull().default(0),
  cardsCorrect: integer("cards_correct").notNull().default(0),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const studyTexts = sqliteTable("study_texts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  cardIds: text("card_ids").notNull(), // JSON array of card IDs
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const cardNotes = sqliteTable("card_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cardId: integer("card_id")
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: ["note", "ai_user", "ai_assistant"],
  }).notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export type Category = typeof categories.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type CardProgress = typeof cardProgress.$inferSelect;
export type StudySession = typeof studySessions.$inferSelect;
export type StudyText = typeof studyTexts.$inferSelect;
export type CardNote = typeof cardNotes.$inferSelect;

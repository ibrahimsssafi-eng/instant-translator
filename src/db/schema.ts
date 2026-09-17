import { integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const translations = pgTable("translations", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceText: text("source_text").notNull(),
  translatedText: text("translated_text").notNull(),
  sourceLang: varchar("source_lang", { length: 8 }).notNull().default("ar"),
  targetLang: varchar("target_lang", { length: 8 }).notNull().default("en"),
  mode: varchar("mode", { length: 16 }).notNull().default("manual"),
  chars: integer("chars").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TranslationRow = typeof translations.$inferSelect;

export const agentState = pgTable("agent_state", {
  id: varchar("id", { length: 96 }).primaryKey(),
  platform: varchar("platform", { length: 32 }).notNull().default(""),
  version: varchar("version", { length: 16 }).notNull().default(""),
  translated: integer("translated").notNull().default(0),
  chars: integer("chars").notNull().default(0),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AgentStateRow = typeof agentState.$inferSelect;

import { sql } from "drizzle-orm";
import { pgTable, text, integer, timestamp, serial } from "drizzle-orm/pg-core";

// Conversations table (mirrors shared/schema.ts)
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default("新しい会話"),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  model: text("model").notNull().default("claude-sonnet-4-5"),
  temperature: integer("temperature").notNull().default(70),
  maxTokens: integer("max_tokens").notNull().default(4096),
  topP: integer("top_p").notNull().default(100),
});

// Messages table (mirrors shared/schema.ts)
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Types
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

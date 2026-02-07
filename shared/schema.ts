import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  characterCount: integer("character_count").notNull(),
  inputPrompt: text("input_prompt").notNull(),
  generatedAt: timestamp("generated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const insertArticleSchema = createInsertSchema(articles).omit({
  id: true,
  generatedAt: true,
});

export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articles.$inferSelect;

export const generateArticleRequestSchema = z.object({
  prompt: z.string().min(1, "入力テキストは必須です"),
  targetLength: z.number().min(1).max(9999).default(1000),
  systemPromptId: z.string().optional(),
  model: z.string().optional().default("claude-sonnet-4-5"),
});

export type GenerateArticleRequest = z.infer<
  typeof generateArticleRequestSchema
>;

export const generateArticleResponseSchema = z.object({
  article: z.string(),
  characterCount: z.number(),
  generatedAt: z.string(),
  id: z.number(),
});

export type GenerateArticleResponse = z.infer<
  typeof generateArticleResponseSchema
>;

export const systemPrompts = pgTable("system_prompts", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  promptText: text("prompt_text").notNull(),
  category: text("category").notNull().default("custom"),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const insertSystemPromptSchema = createInsertSchema(systemPrompts).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertSystemPrompt = z.infer<typeof insertSystemPromptSchema>;
export type SystemPrompt = typeof systemPrompts.$inferSelect;

// ============================================
// Chat / Conversation Schema (New)
// ============================================

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
  temperature: integer("temperature").notNull().default(70), // Stored as integer (0-200 for 0.0-2.0)
  maxTokens: integer("max_tokens").notNull().default(4096),
  topP: integer("top_p").notNull().default(100), // Stored as integer (0-100 for 0.0-1.0)
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role").notNull(), // "user" or "assistant"
  content: text("content").notNull(),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Chat request/response schemas
export const chatRequestSchema = z.object({
  conversationId: z.number(),
  message: z.string().min(1, "メッセージは必須です"),
  model: z.string().optional(),
  temperature: z.number().min(0).max(200).optional(),
  maxTokens: z.number().min(1).max(8192).optional(),
  topP: z.number().min(0).max(100).optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const chatResponseSchema = z.object({
  messageId: z.number(),
  content: z.string(),
  conversationId: z.number(),
});

export type ChatResponse = z.infer<typeof chatResponseSchema>;

// Conversation with messages
export const conversationWithMessagesSchema = z.object({
  id: z.number(),
  title: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  model: z.string(),
  temperature: z.number(),
  maxTokens: z.number(),
  topP: z.number(),
  messages: z.array(
    z.object({
      id: z.number(),
      conversationId: z.number(),
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      createdAt: z.date(),
    }),
  ),
});

export type ConversationWithMessages = z.infer<
  typeof conversationWithMessagesSchema
>;

// ============================================
// API Usage Stats Schema
// ============================================

export const apiUsageLogs = pgTable("api_usage_logs", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(), // claude, gemini, perplexity
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  cost: integer("cost_nano_usd").notNull().default(0), // Nano USD (1e-9) to avoid floating point issues
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const insertApiUsageLogSchema = createInsertSchema(apiUsageLogs).omit({
  id: true,
  createdAt: true,
});

export type ApiUsageLog = typeof apiUsageLogs.$inferSelect;
export type InsertApiUsageLog = z.infer<typeof insertApiUsageLogSchema>;

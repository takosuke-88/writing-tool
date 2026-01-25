import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  generatedAt: timestamp("generated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
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
});

export type GenerateArticleRequest = z.infer<typeof generateArticleRequestSchema>;

export const generateArticleResponseSchema = z.object({
  article: z.string(),
  characterCount: z.number(),
  generatedAt: z.string(),
  id: z.number(),
});

export type GenerateArticleResponse = z.infer<typeof generateArticleResponseSchema>;

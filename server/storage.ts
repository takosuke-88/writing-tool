import { db } from "./db";
import { articles, systemPrompts } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import type { Article, InsertArticle, SystemPrompt, InsertSystemPrompt } from "@shared/schema";

export interface IStorage {
  getAllArticles(): Promise<Article[]>;
  getArticle(id: number): Promise<Article | undefined>;
  createArticle(article: InsertArticle): Promise<Article>;
  deleteArticle(id: number): Promise<void>;
  getAllSystemPrompts(): Promise<SystemPrompt[]>;
  getSystemPrompt(id: string): Promise<SystemPrompt | undefined>;
  createSystemPrompt(prompt: InsertSystemPrompt): Promise<SystemPrompt>;
  updateSystemPrompt(id: string, prompt: Partial<InsertSystemPrompt>): Promise<SystemPrompt | undefined>;
  deleteSystemPrompt(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getAllArticles(): Promise<Article[]> {
    return await db.select().from(articles).orderBy(desc(articles.generatedAt));
  }

  async getArticle(id: number): Promise<Article | undefined> {
    const result = await db.select().from(articles).where(eq(articles.id, id));
    return result[0];
  }

  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    const result = await db.insert(articles).values(insertArticle).returning();
    return result[0];
  }

  async deleteArticle(id: number): Promise<void> {
    await db.delete(articles).where(eq(articles.id, id));
  }

  async getAllSystemPrompts(): Promise<SystemPrompt[]> {
    return await db.select().from(systemPrompts).orderBy(systemPrompts.name);
  }

  async getSystemPrompt(id: string): Promise<SystemPrompt | undefined> {
    const result = await db.select().from(systemPrompts).where(eq(systemPrompts.id, id));
    return result[0];
  }

  async createSystemPrompt(prompt: InsertSystemPrompt): Promise<SystemPrompt> {
    const result = await db.insert(systemPrompts).values(prompt).returning();
    return result[0];
  }

  async updateSystemPrompt(id: string, prompt: Partial<InsertSystemPrompt>): Promise<SystemPrompt | undefined> {
    const result = await db
      .update(systemPrompts)
      .set({ ...prompt, updatedAt: new Date() })
      .where(eq(systemPrompts.id, id))
      .returning();
    return result[0];
  }

  async deleteSystemPrompt(id: string): Promise<void> {
    await db.delete(systemPrompts).where(eq(systemPrompts.id, id));
  }
}

export const storage = new DatabaseStorage();

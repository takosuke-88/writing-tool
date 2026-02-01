import { db } from "./db";
import { articles, systemPrompts } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import type {
  Article,
  InsertArticle,
  SystemPrompt,
  InsertSystemPrompt,
} from "@shared/schema";

export interface IStorage {
  getAllArticles(): Promise<Article[]>;
  getArticle(id: number): Promise<Article | undefined>;
  createArticle(article: InsertArticle): Promise<Article>;
  deleteArticle(id: number): Promise<void>;
  getAllSystemPrompts(): Promise<SystemPrompt[]>;
  getSystemPrompt(id: string): Promise<SystemPrompt | undefined>;
  createSystemPrompt(prompt: InsertSystemPrompt): Promise<SystemPrompt>;
  updateSystemPrompt(
    id: string,
    prompt: Partial<InsertSystemPrompt>,
  ): Promise<SystemPrompt | undefined>;
  deleteSystemPrompt(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getAllArticles(): Promise<Article[]> {
    try {
      return await db
        .select()
        .from(articles)
        .orderBy(desc(articles.generatedAt));
    } catch (error) {
      console.warn("Database error, returning empty array:", error);
      return [];
    }
  }

  async getArticle(id: number): Promise<Article | undefined> {
    try {
      const result = await db
        .select()
        .from(articles)
        .where(eq(articles.id, id));
      return result[0];
    } catch (error) {
      console.warn("Database error:", error);
      return undefined;
    }
  }

  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    try {
      const result = await db
        .insert(articles)
        .values(insertArticle)
        .returning();
      return result[0];
    } catch (error) {
      console.warn("Database error:", error);
      throw error;
    }
  }

  async deleteArticle(id: number): Promise<void> {
    try {
      await db.delete(articles).where(eq(articles.id, id));
    } catch (error) {
      console.warn("Database error:", error);
    }
  }

  async getAllSystemPrompts(): Promise<SystemPrompt[]> {
    try {
      return await db.select().from(systemPrompts);
    } catch (error) {
      console.warn("Database error, returning empty array:", error);
      return [];
    }
  }

  async getSystemPrompt(id: string): Promise<SystemPrompt | undefined> {
    try {
      const result = await db
        .select()
        .from(systemPrompts)
        .where(eq(systemPrompts.id, id));
      return result[0];
    } catch (error) {
      console.warn("Database error:", error);
      return undefined;
    }
  }

  async createSystemPrompt(prompt: InsertSystemPrompt): Promise<SystemPrompt> {
    try {
      const result = await db.insert(systemPrompts).values(prompt).returning();
      return result[0];
    } catch (error) {
      console.warn("Database error:", error);
      throw error;
    }
  }

  async updateSystemPrompt(
    id: string,
    prompt: Partial<InsertSystemPrompt>,
  ): Promise<SystemPrompt | undefined> {
    try {
      const result = await db
        .update(systemPrompts)
        .set({ ...prompt, updatedAt: new Date() })
        .where(eq(systemPrompts.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.warn("Database error:", error);
      return undefined;
    }
  }

  async deleteSystemPrompt(id: string): Promise<void> {
    try {
      await db.delete(systemPrompts).where(eq(systemPrompts.id, id));
    } catch (error) {
      console.warn("Database error:", error);
    }
  }
}

export const storage = new DatabaseStorage();

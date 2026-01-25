import { db } from "./db";
import { articles } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import type { Article, InsertArticle } from "@shared/schema";

export interface IStorage {
  getAllArticles(): Promise<Article[]>;
  getArticle(id: number): Promise<Article | undefined>;
  createArticle(article: InsertArticle): Promise<Article>;
  deleteArticle(id: number): Promise<void>;
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
}

export const storage = new DatabaseStorage();

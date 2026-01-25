import { randomUUID } from "crypto";
import type { Article, InsertArticle } from "@shared/schema";

export interface IStorage {
  getAllArticles(): Promise<Article[]>;
  getArticle(id: number): Promise<Article | undefined>;
  createArticle(article: InsertArticle): Promise<Article>;
  deleteArticle(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private articles: Map<number, Article>;
  private nextId: number;

  constructor() {
    this.articles = new Map();
    this.nextId = 1;
  }

  async getAllArticles(): Promise<Article[]> {
    const articles = Array.from(this.articles.values());
    return articles.sort((a, b) => 
      new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );
  }

  async getArticle(id: number): Promise<Article | undefined> {
    return this.articles.get(id);
  }

  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    const id = this.nextId++;
    const article: Article = {
      ...insertArticle,
      id,
      generatedAt: new Date(),
    };
    this.articles.set(id, article);
    return article;
  }

  async deleteArticle(id: number): Promise<void> {
    this.articles.delete(id);
  }
}

export const storage = new MemStorage();

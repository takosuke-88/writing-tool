import { db, isDatabaseAvailable } from "./db";
import { articles, systemPrompts, apiUsageLogs } from "@shared/schema";
import { eq, desc, sql, gte } from "drizzle-orm";
import type {
  Article,
  InsertArticle,
  SystemPrompt,
  InsertSystemPrompt,
  ApiUsageLog,
} from "@shared/schema";

export interface UsageStats {
  today: {
    requests: number;
    cost: number;
    byAPI: Record<string, { requests: number; cost: number }>;
  };
  thisMonth: {
    requests: number;
    cost: number;
    byAPI: Record<string, { requests: number; cost: number }>;
  };
  dailyBreakdown: Array<{
    date: string;
    cost: number;
  }>;
}

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
  // getApiUsageStats is deprecated/handled by KV now, but kept for interface compat if needed
  getApiUsageStats(): Promise<UsageStats>;
}

export class MemStorage implements IStorage {
  private articles: Map<number, Article>;
  private systemPrompts: Map<string, SystemPrompt>;
  private currentArticleId: number;

  constructor() {
    this.articles = new Map();
    this.systemPrompts = new Map();
    this.currentArticleId = 1;
  }

  async getAllArticles(): Promise<Article[]> {
    return Array.from(this.articles.values()).sort(
      (a, b) => b.generatedAt.getTime() - a.generatedAt.getTime(),
    );
  }

  async getArticle(id: number): Promise<Article | undefined> {
    return this.articles.get(id);
  }

  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    const id = this.currentArticleId++;
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

  async getAllSystemPrompts(): Promise<SystemPrompt[]> {
    return Array.from(this.systemPrompts.values());
  }

  async getSystemPrompt(id: string): Promise<SystemPrompt | undefined> {
    return this.systemPrompts.get(id);
  }

  async createSystemPrompt(prompt: InsertSystemPrompt): Promise<SystemPrompt> {
    const id = prompt.id || Math.random().toString(36).substring(7);
    const newPrompt: SystemPrompt = {
      ...prompt,
      id,
      category: prompt.category || "custom",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.systemPrompts.set(id, newPrompt);
    return newPrompt;
  }

  async updateSystemPrompt(
    id: string,
    prompt: Partial<InsertSystemPrompt>,
  ): Promise<SystemPrompt | undefined> {
    const existing = this.systemPrompts.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...prompt, updatedAt: new Date() };
    this.systemPrompts.set(id, updated);
    return updated;
  }

  async deleteSystemPrompt(id: string): Promise<void> {
    this.systemPrompts.delete(id);
  }

  async getApiUsageStats(): Promise<UsageStats> {
    return {
      today: { requests: 0, cost: 0, byAPI: {} },
      thisMonth: { requests: 0, cost: 0, byAPI: {} },
      dailyBreakdown: [],
    };
  }
}

export class DatabaseStorage implements IStorage {
  async getAllArticles(): Promise<Article[]> {
    try {
      return await db
        .select()
        .from(articles)
        .orderBy(desc(articles.generatedAt));
    } catch (error) {
      // console.warn("Database error, returning empty array:", error);
      throw error; // Let it throw to trigger fallback if handled upstream, or catch
    }
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
    return await db.select().from(systemPrompts);
  }

  async getSystemPrompt(id: string): Promise<SystemPrompt | undefined> {
    const result = await db
      .select()
      .from(systemPrompts)
      .where(eq(systemPrompts.id, id));
    return result[0];
  }

  async createSystemPrompt(prompt: InsertSystemPrompt): Promise<SystemPrompt> {
    const result = await db.insert(systemPrompts).values(prompt).returning();
    return result[0];
  }

  async updateSystemPrompt(
    id: string,
    prompt: Partial<InsertSystemPrompt>,
  ): Promise<SystemPrompt | undefined> {
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

  async getApiUsageStats(): Promise<UsageStats> {
    // Deprecated in favor of Vercel KV via api/stats.js
    return {
      today: { requests: 0, cost: 0, byAPI: {} },
      thisMonth: { requests: 0, cost: 0, byAPI: {} },
      dailyBreakdown: [],
    };
  }
}

// Determine which storage to use
// If DATABASE_URL is present, try DatabaseStorage?
// Or default to MemStorage if no DB configured.

// Lazy Storage Proxy to handle async database availability check
let storageImplementation: IStorage | null = null;

async function getStorage(): Promise<IStorage> {
  if (storageImplementation) return storageImplementation;

  const available = await isDatabaseAvailable();
  if (available) {
    console.log("✅ Database available, using DatabaseStorage");
    storageImplementation = new DatabaseStorage();
  } else {
    console.log("⚠️ Database unavailable, falling back to MemStorage");
    storageImplementation = new MemStorage();
  }
  return storageImplementation;
}

export const storage: IStorage = {
  getAllArticles: async () => (await getStorage()).getAllArticles(),
  getArticle: async (id) => (await getStorage()).getArticle(id),
  createArticle: async (art) => (await getStorage()).createArticle(art),
  deleteArticle: async (id) => (await getStorage()).deleteArticle(id),
  getAllSystemPrompts: async () => (await getStorage()).getAllSystemPrompts(),
  getSystemPrompt: async (id) => (await getStorage()).getSystemPrompt(id),
  createSystemPrompt: async (p) => (await getStorage()).createSystemPrompt(p),
  updateSystemPrompt: async (id, p) =>
    (await getStorage()).updateSystemPrompt(id, p),
  deleteSystemPrompt: async (id) => (await getStorage()).deleteSystemPrompt(id),
  getApiUsageStats: async () => (await getStorage()).getApiUsageStats(),
};

import { db, isDatabaseAvailable } from "./db";
import {
  articles,
  systemPrompts,
  apiUsageLogs,
  conversations,
  messages as dbMessages,
} from "../shared/schema";
import { eq, desc, asc, sql, gte } from "drizzle-orm";
import type {
  Article,
  InsertArticle,
  SystemPrompt,
  InsertSystemPrompt,
  ApiUsageLog,
  Conversation,
  InsertConversation,
  Message,
  InsertMessage,
  ConversationWithMessages,
} from "../shared/schema";

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
  getApiUsageStats(): Promise<UsageStats>;

  // Conversation and Message methods
  getConversations(): Promise<Conversation[]>;
  getConversation(id: number): Promise<ConversationWithMessages | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(
    id: number,
    data: Partial<InsertConversation>,
  ): Promise<Conversation | undefined>;
  deleteConversation(id: number): Promise<void>;
  addMessage(message: InsertMessage): Promise<Message>;
}

export class MemStorage implements IStorage {
  private articles: Map<number, Article>;
  private systemPrompts: Map<string, SystemPrompt>;
  private conversations: Map<number, Conversation>;
  private messages: Map<number, Message>;
  private currentArticleId: number;
  private currentConversationId: number;
  private currentMessageId: number;

  constructor() {
    this.articles = new Map();
    this.systemPrompts = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.currentArticleId = 1;
    this.currentConversationId = 1;
    this.currentMessageId = 1;
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

  // Conversation and Message methods
  async getConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
  }

  async getConversation(
    id: number,
  ): Promise<ConversationWithMessages | undefined> {
    const conv = this.conversations.get(id);
    if (!conv) return undefined;
    const msgs = Array.from(this.messages.values())
      .filter((m) => m.conversationId === id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((m): Message => ({ ...m, role: m.role as "user" | "assistant" }));
    return {
      ...conv,
      messages: msgs as unknown as ConversationWithMessages["messages"],
    };
  }

  async createConversation(data: InsertConversation): Promise<Conversation> {
    const id = this.currentConversationId++;
    const conversation: Conversation = {
      ...data,
      id,
      title: data.title || "新しい会話",
      model: data.model || "claude-sonnet-4-5",
      temperature: data.temperature ?? 70,
      maxTokens: data.maxTokens ?? 4096,
      topP: data.topP ?? 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversation(
    id: number,
    data: Partial<InsertConversation>,
  ): Promise<Conversation | undefined> {
    const existing = this.conversations.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.conversations.set(id, updated);
    return updated;
  }

  async deleteConversation(id: number): Promise<void> {
    this.conversations.delete(id);
    const msgsToDelete = Array.from(this.messages.values())
      .filter((m) => m.conversationId === id)
      .map((m) => m.id);
    msgsToDelete.forEach((msgId) => this.messages.delete(msgId));
  }

  async addMessage(data: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const message: Message = {
      ...data,
      id,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    const conv = this.conversations.get(data.conversationId);
    if (conv) {
      this.conversations.set(data.conversationId, {
        ...conv,
        updatedAt: new Date(),
      });
    }
    return message;
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
      throw error;
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

  // Conversation and Message methods (Database)
  async getConversations(): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.updatedAt));
  }

  async getConversation(
    id: number,
  ): Promise<ConversationWithMessages | undefined> {
    const convResult = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    if (convResult.length === 0) return undefined;

    const msgsResult = await db
      .select()
      .from(dbMessages)
      .where(eq(dbMessages.conversationId, id))
      .orderBy(asc(dbMessages.createdAt));
    return {
      ...convResult[0],
      messages: msgsResult as unknown as ConversationWithMessages["messages"],
    };
  }

  async createConversation(data: InsertConversation): Promise<Conversation> {
    const result = await db
      .insert(conversations)
      .values({
        ...data,
        title: data.title || "新しい会話",
        model: data.model || "claude-sonnet-4-5",
      })
      .returning();
    return result[0];
  }

  async updateConversation(
    id: number,
    data: Partial<InsertConversation>,
  ): Promise<Conversation | undefined> {
    const result = await db
      .update(conversations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return result[0];
  }

  async deleteConversation(id: number): Promise<void> {
    // cascade delete is handled by the foreign key constraint in schema
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  async addMessage(data: InsertMessage): Promise<Message> {
    const result = await db.insert(dbMessages).values(data).returning();
    // Update conversation updatedAt
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, data.conversationId));
    return result[0];
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
    // In production, we MUST have a database. Do not fallback to memory.
    if (process.env.NODE_ENV === "production") {
      console.error(
        "❌ Database unavailable in production environment. MemStorage fallback is disabled.",
      );
      throw new Error(
        "データベース設定が必要です。Vercel Postgres が正しく設定されていません。",
      );
    }

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
  getConversations: async () => (await getStorage()).getConversations(),
  getConversation: async (id) => (await getStorage()).getConversation(id),
  createConversation: async (c) => (await getStorage()).createConversation(c),
  updateConversation: async (id, c) =>
    (await getStorage()).updateConversation(id, c),
  deleteConversation: async (id) => (await getStorage()).deleteConversation(id),
  addMessage: async (m) => (await getStorage()).addMessage(m),
};

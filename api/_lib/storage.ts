import { getDb } from "./db";
import { conversations, messages } from "./schema";
import { eq, desc, asc } from "drizzle-orm";
import type { Conversation, InsertConversation, Message } from "./schema";

// --- Conversation CRUD ---

export async function getConversations(): Promise<Conversation[]> {
  const db = getDb();
  return await db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.updatedAt));
}

export async function getConversation(id: number) {
  const db = getDb();
  const convResult = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id));
  if (convResult.length === 0) return undefined;

  const msgsResult = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  return {
    ...convResult[0],
    messages: msgsResult,
  };
}

export async function createConversation(
  data: Partial<InsertConversation>,
): Promise<Conversation> {
  const db = getDb();
  const result = await db
    .insert(conversations)
    .values({
      title: data.title || "新しい会話",
      model: data.model || "claude-sonnet-4-5",
      temperature: data.temperature ?? 70,
      maxTokens: data.maxTokens ?? 4096,
      topP: data.topP ?? 100,
    })
    .returning();
  return result[0];
}

export async function updateConversation(
  id: number,
  data: Partial<InsertConversation>,
): Promise<Conversation | undefined> {
  const db = getDb();
  const result = await db
    .update(conversations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(conversations.id, id))
    .returning();
  return result[0];
}

export async function deleteConversation(id: number): Promise<void> {
  const db = getDb();
  await db.delete(conversations).where(eq(conversations.id, id));
}

// --- Message CRUD ---

export async function addMessage(data: {
  conversationId: number;
  role: string;
  content: string;
}): Promise<Message> {
  const db = getDb();
  const result = await db.insert(messages).values(data).returning();
  // Update conversation updatedAt
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, data.conversationId));
  return result[0];
}

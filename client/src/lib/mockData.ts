import type {
  Conversation,
  Message,
  ConversationWithMessages,
} from "@shared/schema";

// Mock conversations for development
export const mockConversations: Conversation[] = [
  {
    id: 1,
    title: "うわりとりの相談",
    createdAt: new Date("2026-02-01T10:30:00"),
    updatedAt: new Date("2026-02-01T10:35:00"),
    model: "claude-sonnet-4-5",
    temperature: 70,
    maxTokens: 4096,
    topP: 100,
  },
  {
    id: 2,
    title: "SEO記事のアイデア",
    createdAt: new Date("2026-01-31T15:20:00"),
    updatedAt: new Date("2026-01-31T15:45:00"),
    model: "claude-sonnet-4-5",
    temperature: 50,
    maxTokens: 4096,
    topP: 100,
  },
  {
    id: 3,
    title: "プログラミング質問",
    createdAt: new Date("2026-01-30T09:15:00"),
    updatedAt: new Date("2026-01-30T09:30:00"),
    model: "claude-sonnet-4-5",
    temperature: 70,
    maxTokens: 4096,
    topP: 100,
  },
];

export const mockMessages: Record<number, Message[]> = {
  1: [
    {
      id: 1,
      conversationId: 1,
      role: "user",
      content: "うわりとりの相談について教えてください",
      createdAt: new Date("2026-02-01T10:30:00"),
    },
    {
      id: 2,
      conversationId: 1,
      role: "assistant",
      content:
        "うわりとりについてご説明しますね。\n\nうわりとりは、日本の伝統的な手法で...\n\n主なポイントは以下の通りです:\n1. 基本的な考え方\n2. 実践方法\n3. 注意点",
      createdAt: new Date("2026-02-01T10:30:30"),
    },
    {
      id: 3,
      conversationId: 1,
      role: "user",
      content: "もっと詳しく教えてください",
      createdAt: new Date("2026-02-01T10:35:00"),
    },
    {
      id: 4,
      conversationId: 1,
      role: "assistant",
      content:
        "詳しくご説明します。\n\n## 1. 基本的な考え方\n\nうわりとりの基本は...\n\n```javascript\nconst example = 'code block';\n```\n\n## 2. 実践方法\n\n具体的な手順は...",
      createdAt: new Date("2026-02-01T10:35:15"),
    },
  ],
  2: [
    {
      id: 5,
      conversationId: 2,
      role: "user",
      content: "SEO記事のアイデアをください",
      createdAt: new Date("2026-01-31T15:20:00"),
    },
    {
      id: 6,
      conversationId: 2,
      role: "assistant",
      content:
        "SEO記事のアイデアをいくつかご提案します:\n\n1. **初心者向けガイド**\n   - 検索エンジンの仕組み\n   - キーワード選定の基本\n\n2. **実践的なテクニック**\n   - タイトルの最適化\n   - メタディスクリプションの書き方",
      createdAt: new Date("2026-01-31T15:20:30"),
    },
  ],
  3: [
    {
      id: 7,
      conversationId: 3,
      role: "user",
      content: "ReactのuseEffectについて教えてください",
      createdAt: new Date("2026-01-30T09:15:00"),
    },
    {
      id: 8,
      conversationId: 3,
      role: "assistant",
      content:
        "useEffectはReactのフックの一つで、副作用を扱うために使用します。\n\n```typescript\nimport { useEffect } from 'react';\n\nuseEffect(() => {\n  // 副作用の処理\n  console.log('Component mounted');\n  \n  return () => {\n    // クリーンアップ処理\n    console.log('Component will unmount');\n  };\n}, []);\n```",
      createdAt: new Date("2026-01-30T09:15:20"),
    },
  ],
};

export function getMockConversationWithMessages(
  id: number,
): ConversationWithMessages | null {
  const conversation = mockConversations.find((c) => c.id === id);
  if (!conversation) return null;

  return {
    ...conversation,
    messages: mockMessages[id] || [],
  };
}

export function getAllMockConversations(): Conversation[] {
  return mockConversations;
}

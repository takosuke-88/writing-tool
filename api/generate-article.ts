import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";
import { generateArticleRequestSchema } from "../../shared/schema";
import { storage } from "../../server/storage";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const validationResult = generateArticleRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: "入力が無効です",
        details: validationResult.error.flatten(),
      });
    }

    const { prompt, targetLength, systemPromptId } = validationResult.data;

    let systemPromptText = `あなたはSEOに精通した、人間味あふれるベテランWEBライターです。
ユーザーの入力（お題または下書き）をもとに、必ず${targetLength}文字以内の記事を作成してください。
文字数制限は厳守です。絶対に${targetLength}文字を超えないでください。

【執筆スタイル】
・自然な日本語（〜だよ、〜だね）で、親しみやすさを重視
・AIっぽさを消すため、適度に砕けた表現や筆者の感情を15%混ぜてください
・適度に改行を入れ、スマホで読みやすい構成に
・SEOを意識した見出しと構成を心がけてください`;

    if (systemPromptId) {
      const selectedPrompt = await storage.getSystemPrompt(systemPromptId);
      if (selectedPrompt) {
        systemPromptText =
          selectedPrompt.promptText +
          `\n\n【文字数制限】\n必ず${targetLength}文字以内で作成してください。`;
      }
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      system: systemPromptText,
    });

    const content = message.content[0];
    const articleText = content.type === "text" ? content.text : "";
    const characterCount = articleText.length;

    const title = prompt.slice(0, 30);

    const savedArticle = await storage.createArticle({
      title,
      content: articleText,
      characterCount,
      inputPrompt: prompt,
    });

    res.json({
      article: articleText,
      characterCount,
      generatedAt: savedArticle.generatedAt.toISOString(),
      id: savedArticle.id,
    });
  } catch (error) {
    console.error("Article generation error:", error);
    res.status(500).json({
      error: "記事の生成に失敗しました",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

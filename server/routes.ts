import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Anthropic from "@anthropic-ai/sdk";
import { generateArticleRequestSchema } from "@shared/schema";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/generate-article", async (req, res) => {
    try {
      const validationResult = generateArticleRequestSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "入力が無効です", 
          details: validationResult.error.flatten() 
        });
      }

      const { prompt, targetLength } = validationResult.data;

      const systemPrompt = `あなたはSEOに精通した、人間味あふれるベテランWEBライターです。
ユーザーの入力（お題または下書き）をもとに、${targetLength}文字前後の記事を作成してください。

【執筆スタイル】
・自然な日本語（〜だよ、〜だね）で、親しみやすさを重視
・AIっぽさを消すため、適度に砕けた表現や筆者の感情を15%混ぜてください
・適度に改行を入れ、スマホで読みやすい構成に
・SEOを意識した見出しと構成を心がけてください`;

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 8192,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        system: systemPrompt,
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
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/articles", async (req, res) => {
    try {
      const articles = await storage.getAllArticles();
      res.json(articles);
    } catch (error) {
      console.error("Error fetching articles:", error);
      res.status(500).json({ error: "記事の取得に失敗しました" });
    }
  });

  app.get("/api/articles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "無効なIDです" });
      }

      const article = await storage.getArticle(id);
      if (!article) {
        return res.status(404).json({ error: "記事が見つかりません" });
      }

      res.json(article);
    } catch (error) {
      console.error("Error fetching article:", error);
      res.status(500).json({ error: "記事の取得に失敗しました" });
    }
  });

  app.delete("/api/articles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "無効なIDです" });
      }

      await storage.deleteArticle(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting article:", error);
      res.status(500).json({ error: "記事の削除に失敗しました" });
    }
  });

  return httpServer;
}

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Anthropic from "@anthropic-ai/sdk";
import {
  generateArticleRequestSchema,
  insertSystemPromptSchema,
} from "@shared/schema";
 

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const DEFAULT_TEMPLATES = [
  {
    id: "seo-basic",
    name: "SEO記事（基本）",
    promptText: `あなたはSEOに精通したベテランライターです。

【ミッション】
ユーザーの入力（お題または下書き）をもとに、
検索意図を満たす高品質な記事を執筆してください。

【執筆スタイル】
・自然な日本語（〜だよ、〜だね）で親しみやすさを重視
・AIっぽさを消すため、適度に砕けた表現や筆者の感情を15%混ぜてください
・適度に改行を入れ、スマホで読みやすい構成に
・「だから重要なのは...」「実は...」のような転換表現を活用

【禁止事項】
・「〜を解き放つ」「〜をアンロックする」などの定型表現
・過度な専門用語（必要な場合は説明を加える）
・1段落が400文字を超えることは避ける

【必須要素】
・冒頭に問いかけを1つ入れる
・実体験または失敗談を1つ盛り込む
・結論は「〜するべき」ではなく「〜もあり」と選択肢を示す形で`,
    category: "default",
  },
  {
    id: "fortune-telling",
    name: "占い鑑定文（共感重視）",
    promptText: `あなたはベテラン占い師です。

【ミッション】
相談者の心に寄り添い、勇気と希望を与える鑑定文を作成してください。

【鑑定スタイル】
・相談者の感情を読み取り、共感を全面に出す
・具体的な行動提案を3つ以上含める
・「あなたの強みは...」と長所をまず伝える
・最後は「応援しています」といったポジティブなメッセージで締める

【禁止事項】
・「絶対」「必ず」といった断定口調
・不安や恐怖を煽る表現
・政治・宗教・医療に関するアドバイス

【必須要素】
・相談内容の要点を冒頭で反復（相談者を認識していることを示す）
・運勢だけでなく「心持ち」についてのアドバイス
・具体的な日時や行動（例：「金曜日の夕方に...」）`,
    category: "default",
  },
  {
    id: "blog-casual",
    name: "ブログ（親しみやすい）",
    promptText: `あなたは日常をリアルに発信するブロガーです。

【ミッション】
読者に「あ、この人わかってるな」と思わせるような、
カジュアルで温かみのあるブログ記事を書いてください。

【執筆スタイル】
・一人称「俺」「私」を活用（統一する）
・「先日...」「実は...」と日常会話的な始まり
・絵文字は控えめに（もし使うなら1記事1-2個まで）
・読者への問いかけを中盤と終盤に1回ずつ

【禁止事項】
・高尚な言葉遣い
・「~すべき」という上から目線のアドバイス
・自慢がましい表現

【必須要素】
・失敗談を冒頭で打ち明ける
・「こうしたらうまくいった」という小さな工夫を共有
・最後は「あなたはどう？」という開かれた終わり方`,
    category: "default",
  },
];

async function initializeDefaultTemplates() {
  try {
    const existingPrompts = await storage.getAllSystemPrompts();
    for (const template of DEFAULT_TEMPLATES) {
      const exists = existingPrompts.find((p) => p.id === template.id);
      if (!exists) {
        await storage.createSystemPrompt(template);
      }
    }
    console.log("✅ Default templates initialized");
  } catch (error) {
    console.warn(
      "⚠️  Could not initialize default templates (database not available)",
    );
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  await initializeDefaultTemplates();

  app.post("/api/generate-article", async (req, res) => {
    try {
      const validationResult = generateArticleRequestSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          error: "入力が無効です",
          details: validationResult.error.flatten(),
        });
      }

      const { prompt, targetLength, systemPromptId, model: requestedModel } = validationResult.data;

      // Normalize model name
      let model = requestedModel || "claude-sonnet-4-5";
      if (model === "claude-sonnet-4-5") {
        model = "claude-sonnet-4-5-20250929";
      }

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

      let articleText = "";

      // Route to appropriate API based on model
      if (model.includes("gemini")) {
        // Use Gemini API
        const apiKey = process.env.AI_INTEGRATIONS_GOOGLE_API_KEY;
        if (!apiKey) {
          throw new Error("Gemini API Key is not configured");
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const fullPrompt = `${systemPromptText}\n\n${prompt}`;

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`Gemini API Error: ${response.status} ${errText}`);
          throw new Error(`Gemini API Error: ${response.status}`);
        }

        const data = await response.json();
        articleText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else {
        // Use Anthropic API (default)
        const message = await anthropic.messages.create({
          model: model,
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
        articleText = content.type === "text" ? content.text : "";
      }

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

  app.get("/api/system-prompts", async (req, res) => {
    try {
      const prompts = await storage.getAllSystemPrompts();
      res.json({ prompts });
    } catch (error) {
      console.error("Error fetching system prompts:", error);
      res.status(500).json({ error: "システムプロンプトの取得に失敗しました" });
    }
  });

  app.get("/api/system-prompts/:id", async (req, res) => {
    try {
      const prompt = await storage.getSystemPrompt(req.params.id);
      if (!prompt) {
        return res
          .status(404)
          .json({ error: "システムプロンプトが見つかりません" });
      }
      res.json(prompt);
    } catch (error) {
      console.error("Error fetching system prompt:", error);
      res.status(500).json({ error: "システムプロンプトの取得に失敗しました" });
    }
  });

  app.post("/api/system-prompts", async (req, res) => {
    try {
      const validationResult = insertSystemPromptSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "入力が無効です",
          details: validationResult.error.flatten(),
        });
      }

      const prompt = await storage.createSystemPrompt(validationResult.data);
      res.status(201).json(prompt);
    } catch (error) {
      console.error("Error creating system prompt:", error);
      res.status(500).json({ error: "システムプロンプトの作成に失敗しました" });
    }
  });

  app.put("/api/system-prompts/:id", async (req, res) => {
    try {
      const { name, promptText } = req.body;
      const prompt = await storage.updateSystemPrompt(req.params.id, {
        name,
        promptText,
      });
      if (!prompt) {
        return res
          .status(404)
          .json({ error: "システムプロンプトが見つかりません" });
      }
      res.json(prompt);
    } catch (error) {
      console.error("Error updating system prompt:", error);
      res.status(500).json({ error: "システムプロンプトの更新に失敗しました" });
    }
  });

  app.delete("/api/system-prompts/:id", async (req, res) => {
    try {
      const prompt = await storage.getSystemPrompt(req.params.id);
      if (!prompt) {
        return res
          .status(404)
          .json({ error: "システムプロンプトが見つかりません" });
      }
      if (prompt.category === "default") {
        return res
          .status(400)
          .json({ error: "デフォルトテンプレートは削除できません" });
      }
      await storage.deleteSystemPrompt(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting system prompt:", error);
      res.status(500).json({ error: "システムプロンプトの削除に失敗しました" });
    }
  });

  // NOTE: /api/stats is handled by api/stats.js (Serverless Function) using Vercel KV.
  // We do not implement it here to avoid PostgreSQL dependencies for stats.

  const sanitizeChunk = (text: string): string => {
    const thinkingTags = /[【\[]\s*(?:eco_search|high_precision_search|standard_search|deep_analysis)[\s\S]*?[】\]]/gi;
    const signatureLines = /^\s*(?:Search Model|Model)\s*:[^\n]*$/gmi;
    const separatorLines = /^\s*---\s*$/gmi;
    return text
      .replace(thinkingTags, "")
      .replace(signatureLines, "")
      .replace(separatorLines, "");
  };
  const formatModelName = (model: string): string =>
    model.replace(/-20\d{6}$/, "").replace(/-\d{8}$/, "").trim();
  const createFooter = (model: string, searchMode?: string): string => {
    const displayModel = formatModelName(model);
    let searchModel: string | null = null;
    if (searchMode === "high_precision") searchModel = "perplexity";
    else if (searchMode === "eco") searchModel = "eco_search";
    else if (searchMode === "standard") searchModel = "standard_search";
    let footer = `\n\n---\n`;
    if (searchModel) footer += `Search Model: ${searchModel}\n\n`;
    footer += `Model: ${displayModel}`;
    return footer;
  };
  const normalizeModel = (requested?: string): string => {
    let model = requested || "claude-sonnet-4-5";
    if (model === "claude-sonnet-4-5") model = "claude-sonnet-4-5-20250929";
    return model;
  };
  app.post("/api/chat", async (req, res) => {
    try {
      const {
        messages,
        model: requestedModel,
        temperature,
        maxTokens,
        topP,
        systemInstructions,
        searchMode,
      } = req.body || {};
      const model = normalizeModel(requestedModel);
      const tempParam =
        typeof temperature === "number"
          ? Math.max(0, Math.min(200, temperature)) / 100
          : 0.7;
      const topPParam =
        typeof topP === "number"
          ? Math.max(0, Math.min(100, topP)) / 100
          : 0.8;
      const maxTokensParam =
        typeof maxTokens === "number" ? maxTokens : 2048;
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(
        `data: ${JSON.stringify({ type: "model_selected", model })}\n\n`,
      );
      const isGemini = model.includes("gemini");
      if (isGemini) {
        const apiKey =
          process.env.AI_INTEGRATIONS_GOOGLE_API_KEY ||
          process.env.GOOGLE_API_KEY;
        if (!apiKey) {
          res.write(
            `data: ${JSON.stringify({
              type: "error",
              message: "Gemini API Key missing",
            })}\n\n`,
          );
          res.write("data: [DONE]\n\n");
          return res.end();
        }
        const lastUser = Array.isArray(messages)
          ? messages.filter((m: any) => m && m.role === "user").slice(-1)[0]
          : null;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const requestBody: any = {
          contents: [
            {
              role: "user",
              parts: [{ text: lastUser?.content || "" }],
            },
          ],
          generationConfig: {
            maxOutputTokens: maxTokensParam,
            temperature: tempParam,
            topP: topPParam,
          },
        };
        if (systemInstructions && String(systemInstructions).trim()) {
          requestBody.systemInstruction = {
            parts: [{ text: String(systemInstructions) }],
          };
        }
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
          const errText = await response.text();
          res.write(
            `data: ${JSON.stringify({
              type: "error",
              message: errText || `Gemini API Error: ${response.status}`,
            })}\n\n`,
          );
          res.write("data: [DONE]\n\n");
          return res.end();
        }
        const data = await response.json();
        const text =
          data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const cleaned = sanitizeChunk(String(text || ""));
        res.write(
          `data: ${JSON.stringify({ type: "content", text: cleaned })}\n\n`,
        );
        const footer = createFooter(model, searchMode);
        res.write(
          `data: ${JSON.stringify({ type: "content", text: footer })}\n\n`,
        );
        res.write("data: [DONE]\n\n");
        return res.end();
      } else {
        const chatMessages = Array.isArray(messages)
          ? messages
              .filter(
                (m: any) =>
                  m && typeof m.content === "string" && m.content.trim() !== "",
              )
              .map((m: any) => ({
                role: (m.role === "assistant" ? "assistant" : "user") as
                  | "user"
                  | "assistant",
                content: String(m.content),
              }))
          : [];
        const stream = anthropic.messages.stream({
          model,
          max_tokens: maxTokensParam,
          messages: chatMessages,
          system: systemInstructions ? String(systemInstructions) : undefined,
          temperature: tempParam,
          top_p: topPParam,
        });
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            (event as any).delta?.type === "text_delta"
          ) {
            const content = (event as any).delta?.text || "";
            const cleaned = sanitizeChunk(String(content));
            if (cleaned) {
              res.write(
                `data: ${JSON.stringify({
                  type: "content",
                  text: cleaned,
                })}\n\n`,
              );
            }
          }
        }
        const footer = createFooter(model, searchMode);
        res.write(
          `data: ${JSON.stringify({ type: "content", text: footer })}\n\n`,
        );
        res.write("data: [DONE]\n\n");
        return res.end();
      }
    } catch (error: any) {
      const message =
        error?.message || "Internal Error in chat processing";
      res.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    }
  });

  return httpServer;
}

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

  return httpServer;
}

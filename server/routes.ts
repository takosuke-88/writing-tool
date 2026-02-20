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

  const DEFAULT_MODEL =
    process.env.DEFAULT_MODEL || "claude-sonnet-4-5-20250929";
  const HAIKU_MODEL = process.env.HAIKU_MODEL || "claude-haiku-4-5-20251001";

  // Simple query detection for auto model routing
  const isSimpleQuery = (text: string): boolean => {
    const trimmed = text.trim();
    // Short messages (under 30 chars) are likely simple
    if (trimmed.length < 30) return true;
    // Greeting patterns
    const greetings =
      /^(こんにちは|こんばんは|おはよう|やあ|ども|hi|hello|hey|おつかれ|ありがとう|さようなら|bye|お疲れ|よろしく|はじめまして|元気|調子|テスト)/i;
    if (greetings.test(trimmed)) return true;
    return false;
  };

  const normalizeModel = (requested?: string): string => {
    if (!requested || requested === "auto") {
      return DEFAULT_MODEL; // will be overridden per-query in /api/chat
    }
    return requested;
  };

  app.post("/api/generate-article", async (req, res) => {
    try {
      const validationResult = generateArticleRequestSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          error: "入力が無効です",
          details: validationResult.error.flatten(),
        });
      }

      const {
        prompt,
        targetLength,
        systemPromptId,
        model: requestedModel,
      } = validationResult.data;

      // Normalize model name
      const model = normalizeModel(requestedModel);

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
    const thinkingTags =
      /[【\[]\s*(?:eco_search|high_precision_search|standard_search|deep_analysis)[\s\S]*?[】\]]/gi;
    const signatureLines = /^\s*(Search Model|Model)\s*[:：].*$/gim;
    const separatorLines = /^\s*---\s*$/gim;
    // Also catch lines like "Model: claude-sonnet-4-5" anywhere
    const modelMention = /\bModel\s*[:：]\s*\S+/gi;
    const searchModelMention = /\bSearch Model\s*[:：]\s*\S+/gi;
    return text
      .replace(thinkingTags, "")
      .replace(signatureLines, "")
      .replace(separatorLines, "")
      .replace(modelMention, "")
      .replace(searchModelMention, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };
  const formatModelName = (model: string): string =>
    model
      .replace(/-20\d{6}$/, "")
      .replace(/-\d{8}$/, "")
      .trim();
  const createFooter = (
    model: string,
    searchMode?: string,
    detectedTool?: string,
  ): string => {
    const displayModel = formatModelName(model);
    let searchModel: string | null = null;
    if (
      searchMode === "high_precision" ||
      detectedTool === "high_precision_search"
    )
      searchModel = "perplexity";
    else if (searchMode === "eco" || detectedTool === "eco_search")
      searchModel = "eco_search";
    else if (searchMode === "standard" || detectedTool === "standard_search")
      searchModel = "standard_search";

    let footer = `\n\n---\n`;
    if (searchModel) footer += `Search Model: ${searchModel}\n\n`;
    footer += `Model: ${displayModel}`;
    return footer;
  };

  const sanitizeHistory = (history: any[]) => {
    const signatureLines = /^\s*(Search Model|Model)\s*[:：].*$/gim;
    const separatorLines = /^\s*---\s*$/gim;
    return (Array.isArray(history) ? history : [])
      .map((m) => {
        if (!m) return m;
        if (m.role === "assistant" && typeof m.content === "string") {
          const cleaned = m.content
            .replace(signatureLines, "")
            .replace(separatorLines, "")
            .trim();

          // Semantic cleanup: Remove footer block if it exists
          // Looks for the separator and subsequent metadata
          const splitParts = cleaned.split(/---\s*$/);
          if (splitParts.length > 1) {
            // Check if the last part looks like metadata
            const potentialFooter = splitParts[splitParts.length - 1];
            if (potentialFooter.match(/(Search Model|Model)\s*[:：]/i)) {
              return {
                ...m,
                content: splitParts.slice(0, -1).join("---").trim(),
              };
            }
          }
          return { ...m, content: cleaned };
        }
        return m;
      })
      .filter(
        (m) => !m || typeof m.content !== "string" || m.content.trim() !== "",
      );
  };
  const noMetadataInstruction = `
# Role & Goal
あなたは優秀なライティングアシスタントです。ユーザーの要望に合わせてテキストを生成します。

# Critical Constraints (絶対遵守事項)

1. **【重要】検索コマンドの完全隠蔽**
   - 思考過程で使用する \`【eco_search: ...】\` などのタグやコマンドは、**最終出力には一切含めないでください**。
   - ユーザーに見せるのは「検索結果を踏まえた自然な回答テキスト」のみです。

2. **【重要】署名の完全禁止**
   - 「Search Model: ...」や「Model: ...」などの署名を**絶対に自分て書かないでください**。
   - これらはシステムが強制的に付与するため、あなたが書くと重複します。
   - **回答本文のみ**を出力してください。
`;
  const buildSystemInstruction = (
    base: unknown,
    searchMode?: string,
    forceSearch?: boolean,
  ) => {
    const baseText = base ? String(base) : "";
    if (!searchMode || searchMode === "auto") return baseText;
    const modeText = forceSearch
      ? `\n\n【検索モード】\n現在の検索モードは ${searchMode} です。検索はシステム側で実行します。検索タグや署名は出力しないでください。`
      : `\n\n【検索モード】\n現在の検索モードは ${searchMode} です。このモードで検索タグを出力してください。`;
    return `${baseText}${modeText}`.trim();
  };
  const buildInjectedContext = (results: string) => `【検索結果】\n${results}`;
  const buildSystemReminder = (base: unknown) => {
    const text = base ? String(base).trim() : "";
    if (!text) return "";
    return `【システム指示（遵守）】\n${text}`;
  };
  const detectSearchTag = (
    text: string,
  ): {
    tool: "eco_search" | "high_precision_search" | "standard_search";
    query: string;
  } | null => {
    const tagRegex =
      /[【\[]\s*(eco_search|high_precision_search|standard_search)\s*(?:[:：]\s*([\s\S]*?))?[】\]]/i;
    const m = text.match(tagRegex);
    if (!m) return null;
    const tool = m[1] as
      | "eco_search"
      | "high_precision_search"
      | "standard_search";
    const query = (m[2] || "").trim();
    return { tool, query };
  };
  const execEcoSearch = async (query: string, clientTavilyKey?: string) => {
    const apiKey = clientTavilyKey || process.env.TAVILY_API_KEY;
    if (!apiKey) {
      if (process.env.PERPLEXITY_API_KEY) {
        return await execStandardSearch(query);
      }
      throw new Error("TAVILY_API_KEY missing");
    }
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        include_answer: true,
        max_results: 3,
      }),
    });
    if (!res.ok) throw new Error(`Tavily API Error: ${res.status}`);
    const data = await res.json();
    return (
      data.answer ||
      data.results?.map((r: any) => `${r.title}: ${r.content}`).join("\n\n") ||
      "No results"
    );
  };
  const execHighPrecisionSearch = async (query: string) => {
    if (!process.env.PERPLEXITY_API_KEY)
      throw new Error("PERPLEXITY_API_KEY missing");
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "user",
            content: `以下について簡潔に検索結果をまとめてください: ${query}`,
          },
        ],
        return_citations: false,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 429 || res.status === 402) {
        throw new Error("PERPLEXITY_QUOTA_EXCEEDED");
      }
      throw new Error(`Perplexity API Error: ${res.status} ${errText}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "No results";
  };
  const execStandardSearch = async (query: string) => {
    if (!process.env.PERPLEXITY_API_KEY) throw new Error("API Key missing");
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [{ role: "user", content: query }],
      }),
    });
    if (!res.ok) throw new Error(`Perplexity API Error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
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
        tavilyApiKey,
      } = req.body || {};

      // Resolve model: if "auto", pick Haiku or Sonnet based on query complexity
      const isAutoModel = !requestedModel || requestedModel === "auto";
      const lastUserContent = Array.isArray(messages)
        ? messages.filter((m: any) => m?.role === "user").slice(-1)[0]
            ?.content || ""
        : "";
      const model = isAutoModel
        ? isSimpleQuery(String(lastUserContent))
          ? HAIKU_MODEL
          : DEFAULT_MODEL
        : normalizeModel(requestedModel);
      const tempParam =
        typeof temperature === "number"
          ? Math.max(0, Math.min(100, temperature)) / 100
          : 0.7;
      const maxTokensParam = typeof maxTokens === "number" ? maxTokens : 2048;

      const SYSTEM_REMINDER = `\n\n---\nIMPORTANT SYSTEM INSTRUCTION:\n検索結果や外部情報が含まれている場合でも、あなたの「キャラクター設定（System Prompt）」を最優先してください。\n口調、性格、振る舞いは必ず System Prompt の指示を守り、検索結果の文体（ニュース記事調など）に引きずられないでください。\n\n【禁止事項】\n・ユーザーの質問を復唱しない。\n・「〜を聞いてくれてありがとう」等の感謝の挨拶は禁止。いきなり本題の回答から始める。\n---`;
      const sanitizedMessages = sanitizeHistory(messages);
      const lastUser = sanitizedMessages
        .filter((m: any) => m && m.role === "user")
        .slice(-1)[0];
      // Server-side detection: does this query need real-time search?
      const needsRealtimeSearch = (text: string): boolean => {
        const t = text.toLowerCase();
        // Weather, news, current events, real-time info
        const patterns = [
          /天気/,
          /気温/,
          /降水/,
          /weather/,
          /ニュース/,
          /news/,
          /最新/,
          /速報/,
          /今日/,
          /昨日/,
          /明日/,
          /今週/,
          /先週/,
          /今月/,
          /today/,
          /yesterday/,
          /tomorrow/,
          /株価/,
          /為替/,
          /レート/,
          /price/,
          /現在/,
          /リアルタイム/,
          /最近の/,
          /何時/,
          /いつ/,
          /スコア/,
          /試合結果/,
          /イベント/,
          /開催/,
          /営業時間/,
          /地震/,
          /災害/,
          /交通/,
          /運行/,
        ];
        return patterns.some((p) => p.test(t));
      };

      const forceSearch = searchMode && searchMode !== "auto";
      let injectedResults = "";
      let searchInstructions = "";

      // Debug logging for search flow
      console.log("[SearchDebug] searchMode:", JSON.stringify(searchMode));
      console.log(
        "[SearchDebug] lastUser content:",
        JSON.stringify(String(lastUser?.content || "").slice(0, 50)),
      );

      // Auto mode: ALWAYS trigger eco search for every query
      // Tavily basic search is lightweight and ensures real-time info is always available
      if (searchMode === "auto" && lastUser?.content) {
        console.log("[AutoSearch] TRIGGERING eco search...");
        try {
          injectedResults = await execEcoSearch(
            String(lastUser.content),
            tavilyApiKey,
          );
          console.log(
            "[AutoSearch] SUCCESS, results length:",
            injectedResults.length,
          );
        } catch (e: any) {
          console.error("[AutoSearch] FAILED:", e?.message);
          // Don't block the response if search fails
          injectedResults = "";
        }
      }
      const TOOLS = [
        {
          type: "function",
          function: {
            name: "high_precision_search",
            description: "高精度な検索エンジンで情報を検索します。",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "検索クエリ",
                },
              },
              required: ["query"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "standard_search",
            description: "標準的な検索エンジンで情報を検索します。",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "検索クエリ",
                },
              },
              required: ["query"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "eco_search",
            description: "高速で軽量な検索エンジンで情報を検索します。",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "検索クエリ",
                },
              },
              required: ["query"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "deep_analysis",
            description:
              "与えられたテキストを深く分析し、要約、キーワード抽出、感情分析などを行います。",
            parameters: {
              type: "object",
              properties: {
                text: {
                  type: "string",
                  description: "分析対象のテキスト",
                },
              },
              required: ["text"],
            },
          },
        },
      ];
      let effectiveTools = TOOLS;

      if (searchMode === "auto") {
        searchInstructions = `【検索ツールの使い分けについて】
あなたは以下の3つの検索ツールを使用できます：
1. high_precision_search: 複雑なトピック、最新ニュース、深い調査が必要な場合に使用してください（Perplexity使用）。
2. standard_search: 一般的な情報検索に使用してください。
3. eco_search: 単純な事実確認、天気、定義などの簡単な検索に使用してください（Tavily使用）。
   【重要】回答の冒頭に【eco_search: ...】のようなツール使用の宣言を絶対に入れないでください。省略してください。
   【重要】検索の判断などはタグを出力するだけで、それ以外のメタデータ（署名など）は一切出力しないでください。

ユーザーの質問の複雑さと重要度に応じて、最も適切でコスト対効果の高いツールを選択してください。`;
      } else if (searchMode === "high_precision") {
        searchInstructions = `【検索について】必ず 'high_precision_search' を使用してください。`;
        effectiveTools = TOOLS.filter(
          (t: any) =>
            t.function.name === "high_precision_search" ||
            t.function.name === "deep_analysis",
        );
      } else if (searchMode === "standard") {
        searchInstructions = `【検索について】必ず 'standard_search' を使用してください。`;
        effectiveTools = TOOLS.filter(
          (t: any) =>
            t.function.name === "standard_search" ||
            t.function.name === "deep_analysis",
        );
      } else if (searchMode === "eco") {
        searchInstructions = `【検索について】必ず 'eco_search' を使用してください。`;
        effectiveTools = TOOLS.filter(
          (t: any) =>
            t.function.name === "eco_search" ||
            t.function.name === "deep_analysis",
        );
      }
      if (forceSearch && lastUser?.content) {
        try {
          if (searchMode === "eco") {
            injectedResults = await execEcoSearch(
              String(lastUser.content),
              tavilyApiKey,
            );
          } else if (searchMode === "high_precision") {
            injectedResults = await execHighPrecisionSearch(
              String(lastUser.content),
            );
          } else if (searchMode === "standard") {
            injectedResults = await execStandardSearch(
              String(lastUser.content),
            );
          }
        } catch (e: any) {
          injectedResults = `(検索失敗: ${e?.message || "unknown"})`;
        }
      }
      const systemInstruction = buildSystemInstruction(
        systemInstructions,
        searchMode,
        !!forceSearch,
      );
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
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
        const reminder = buildSystemReminder(systemInstruction);
        const prefixBlocks = [
          reminder ? `${reminder}` : "",
          injectedResults ? `${buildInjectedContext(injectedResults)}` : "",
        ].filter(Boolean);
        const userText = [
          prefixBlocks.join("\n\n"),
          String(lastUser?.content || "") + SYSTEM_REMINDER,
        ]
          .filter((s) => s && s.trim() !== "")
          .join("\n\n");
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const requestBody: any = {
          contents: [
            {
              role: "user",
              parts: [{ text: userText }],
            },
          ],
          generationConfig: {
            maxOutputTokens: maxTokensParam,
            temperature: tempParam,
          },
        };
        if (systemInstruction) {
          requestBody.systemInstruction = {
            parts: [{ text: systemInstruction }],
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
        let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!injectedResults) {
          const tag = detectSearchTag(String(text));
          if (tag) {
            const before = String(text).replace(
              /[【\[]\s*(eco_search|high_precision_search|standard_search)[\s\S]*?[】\]]/i,
              "",
            );
            const cleanedBefore = sanitizeChunk(before);
            if (cleanedBefore) {
              res.write(
                `data: ${JSON.stringify({
                  type: "content",
                  text: cleanedBefore,
                })}\n\n`,
              );
            }
            let results = "";
            try {
              if (tag.tool === "eco_search") {
                results = await execEcoSearch(tag.query, tavilyApiKey);
              } else if (tag.tool === "high_precision_search") {
                results = await execHighPrecisionSearch(tag.query);
              } else {
                results = await execStandardSearch(tag.query);
              }
            } catch (e: any) {
              results = `(検索失敗: ${e?.message || "unknown"})`;
            }
            const continuationBody: any = {
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `${buildInjectedContext(results)}\n\n先ほどの回答の続きを作成してください。`,
                    },
                  ],
                },
              ],
              generationConfig: {
                maxOutputTokens: maxTokensParam,
                temperature: tempParam,
              },
            };
            if (systemInstruction) {
              continuationBody.systemInstruction = {
                parts: [{ text: systemInstruction }],
              };
            }
            const contRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(continuationBody),
              },
            );
            if (contRes.ok) {
              const contData = await contRes.json();
              text = contData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            } else {
              text = "";
            }
          }
        }
        const cleaned = sanitizeChunk(String(text || ""));
        if (cleaned) {
          res.write(
            `data: ${JSON.stringify({ type: "content", text: cleaned })}\n\n`,
          );
        }
        const footer = createFooter(model, searchMode);
        res.write(
          `data: ${JSON.stringify({ type: "content", text: footer })}\n\n`,
        );
        res.write("data: [DONE]\n\n");
        return res.end();
      } else if (model.includes("sonar")) {
        // ── Perplexity API ──
        const apiKey = process.env.PERPLEXITY_API_KEY;
        if (!apiKey) {
          res.write(
            `data: ${JSON.stringify({
              type: "error",
              message: "PERPLEXITY_API_KEY missing",
            })}\n\n`,
          );
          res.write("data: [DONE]\n\n");
          return res.end();
        }
        const pplxMessages = sanitizedMessages
          .filter(
            (m: any) =>
              m && typeof m.content === "string" && m.content.trim() !== "",
          )
          .map((m: any) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: String(m.content),
          }));
        if (systemInstruction) {
          pplxMessages.unshift({
            role: "system" as any,
            content: systemInstruction,
          });
        }
        try {
          const pplxRes = await fetch(
            "https://api.perplexity.ai/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model,
                messages: pplxMessages,
                temperature: tempParam,
                max_tokens: maxTokensParam,
                stream: false,
              }),
            },
          );
          if (!pplxRes.ok) {
            const errText = await pplxRes.text();
            res.write(
              `data: ${JSON.stringify({
                type: "error",
                message: `${pplxRes.status} ${errText}`,
              })}\n\n`,
            );
            res.write("data: [DONE]\n\n");
            return res.end();
          }
          const pplxData = await pplxRes.json();
          const pplxContent = pplxData.choices?.[0]?.message?.content || "";
          const cleaned = sanitizeChunk(String(pplxContent));
          if (cleaned) {
            res.write(
              `data: ${JSON.stringify({ type: "content", text: cleaned })}\n\n`,
            );
          }
        } catch (e: any) {
          res.write(
            `data: ${JSON.stringify({
              type: "error",
              message: `Perplexity Error: ${e?.message || "unknown"}`,
            })}\n\n`,
          );
        }
        const footer = createFooter(model, searchMode);
        res.write(
          `data: ${JSON.stringify({ type: "content", text: footer })}\n\n`,
        );
        res.write("data: [DONE]\n\n");
        return res.end();
      } else {
        const chatMessages = sanitizedMessages
          .filter(
            (m: any) =>
              m && typeof m.content === "string" && m.content.trim() !== "",
          )
          .map((m: any) => ({
            role: (m.role === "assistant" ? "assistant" : "user") as
              | "user"
              | "assistant",
            content: String(m.content),
          }));
        const injectedMessage = injectedResults
          ? {
              role: "user" as const,
              content: buildInjectedContext(injectedResults),
            }
          : null;
        const reminderMessage = systemInstruction
          ? {
              role: "user" as const,
              content: buildSystemReminder(systemInstruction),
            }
          : null;
        let lastUserIndex = -1;
        for (let i = chatMessages.length - 1; i >= 0; i--) {
          if (chatMessages[i].role === "user") {
            lastUserIndex = i;
            break;
          }
        }
        const chatMessagesWithInjection =
          lastUserIndex >= 0
            ? [
                ...chatMessages.slice(0, lastUserIndex),
                ...(reminderMessage ? [reminderMessage] : []),
                ...(injectedMessage ? [injectedMessage] : []),
                chatMessages[lastUserIndex],
                ...chatMessages.slice(lastUserIndex + 1),
              ]
            : chatMessages;

        // Apply System Reminder to the user message content in the chatMessages array
        // We find the last user message in the array we just constructed or the original
        // Actually, we should apply it to the message object itself before sending.
        // chatMessages[lastUserIndex] is the object.
        if (lastUserIndex >= 0) {
          // Create a shallow copy to avoid mutating if needed, but here it's fine
          const targetMsg = chatMessagesWithInjection.find(
            (m) => m === chatMessages[lastUserIndex],
          );
          if (targetMsg && typeof targetMsg.content === "string") {
            targetMsg.content += SYSTEM_REMINDER;
          }
        }
        const stream = anthropic.messages.stream({
          model,
          max_tokens: maxTokensParam,
          messages: chatMessagesWithInjection,
          system: systemInstruction || undefined,
          temperature: tempParam,
        });
        let assistantAccum = "";
        let scanBuffer = "";
        let toolCalls = 0;
        const maxToolCalls = 3;
        let tagDetected: ReturnType<typeof detectSearchTag> | null = null;
        const allowTagDetection = !injectedResults;

        // Output buffering state
        let isBufferingOutput = false;
        let outputBuffer = "";

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            (event as any).delta?.type === "text_delta"
          ) {
            const content = (event as any).delta?.text || "";
            scanBuffer = (scanBuffer + content).slice(-4000); // Keep larger context for tag detection

            if (allowTagDetection) {
              const tag = detectSearchTag(scanBuffer);
              if (!tagDetected && tag && toolCalls < maxToolCalls) {
                tagDetected = tag;
                // Once detected, we do NOT continue here, so that we can strip the tag from output
                // But we need to make sure we don't output the tag itself.
                // Since detectSearchTag finds it in scanBuffer, it might have been partially outputted if we weren't buffering.
                // WE NEED TO BUFFER output when we see a potential open bracket.
              }
            }

            // Simple Buffering Logic for Tag Suppression
            // If we encounter an open bracket, we start buffering until we either match a tag (then discard) or confirm it's not a tag (then flush).
            // Simplified: If 'content' contains part of a tag, don't write it.
            // But 'content' is small.
            // Let's use a simpler heuristic: If we are not buffering, and we see '【' or '[', start buffering.
            // If buffering, append to buffer.
            // If buffer matches a full tag, clear buffer (swallow it).
            // If buffer gets too long or doesn't look like a tag anymore, flush it.

            // Also strip AI-generated signatures from the content before char-by-char processing
            const sigStripped = content
              .replace(/^\s*(Search Model|Model)\s*[:：].*$/gim, "")
              .replace(/^\s*---\s*$/gim, "");
            for (const char of sigStripped) {
              if (!isBufferingOutput) {
                if (char === "【" || char === "[") {
                  isBufferingOutput = true;
                  outputBuffer = char;
                } else {
                  // Pass through sanitization
                  const cleaned = sanitizeChunk(char);
                  if (cleaned) {
                    assistantAccum += cleaned;
                    res.write(
                      `data: ${JSON.stringify({ type: "content", text: cleaned })}\n\n`,
                    );
                  }
                }
              } else {
                outputBuffer += char;
                // Check if valid tag prefix
                if (
                  outputBuffer.length > 50 &&
                  !/^[【\[]\s*(eco|high|standard|deep)/i.test(outputBuffer)
                ) {
                  // Probably not a tag, flush
                  res.write(
                    `data: ${JSON.stringify({ type: "content", text: outputBuffer })}\n\n`,
                  );
                  assistantAccum += outputBuffer;
                  isBufferingOutput = false;
                  outputBuffer = "";
                } else if (/[】\]]/.test(char)) {
                  // Closing bracket found. Check if it is a tag.
                  if (detectSearchTag(outputBuffer)) {
                    // It IS a tag. Censor it.
                    // detectedSearchTag will catch it in the outer scope logic eventually or we already set tagDetected
                    // We do NOT write it to res.
                    // Just clear buffer.
                    isBufferingOutput = false;
                    outputBuffer = "";
                  } else {
                    // Just a bracketed string, flush
                    res.write(
                      `data: ${JSON.stringify({ type: "content", text: outputBuffer })}\n\n`,
                    );
                    assistantAccum += outputBuffer;
                    isBufferingOutput = false;
                    outputBuffer = "";
                  }
                }
              }
            }
          }
        }

        // Flush remaining buffer
        if (isBufferingOutput && outputBuffer) {
          res.write(
            `data: ${JSON.stringify({ type: "content", text: outputBuffer })}\n\n`,
          );
          assistantAccum += outputBuffer;
        }

        if (tagDetected && toolCalls < maxToolCalls) {
          toolCalls++;
          let results = "";
          try {
            if (tagDetected.tool === "eco_search") {
              results = await execEcoSearch(tagDetected.query, tavilyApiKey);
            } else if (tagDetected.tool === "high_precision_search") {
              results = await execHighPrecisionSearch(tagDetected.query);
            } else {
              results = await execStandardSearch(tagDetected.query);
            }
          } catch (e: any) {
            results = `(検索失敗: ${e?.message || "unknown"})`;
          }
          const continuationMessages = [
            ...chatMessagesWithInjection,
            { role: "assistant" as const, content: assistantAccum },
            {
              role: "user" as const,
              content: `${buildInjectedContext(results)}\n\n先ほどの回答の続きを作成してください。`,
            },
          ];
          const contStream = anthropic.messages.stream({
            model,
            max_tokens: maxTokensParam,
            messages: continuationMessages,
            system: systemInstruction || undefined,
            temperature: tempParam,
          });
          for await (const event of contStream) {
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
        }

        const footer = createFooter(model, searchMode);
        res.write(
          `data: ${JSON.stringify({ type: "content", text: footer })}\n\n`,
        );

        res.write("data: [DONE]\n\n");
        return res.end();
      }
    } catch (error: any) {
      const message = error?.message || "Internal Error in chat processing";
      try {
        if (!res.headersSent) {
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
        }
        res.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`);
        res.write("data: [DONE]\n\n");
      } catch (_writeErr) {
        console.error("Failed to write error to SSE stream:", _writeErr);
      }
      return res.end();
    }
  });

  return httpServer;
}

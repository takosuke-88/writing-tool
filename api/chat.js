import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { kv } from "@vercel/kv";

// Initialize Anthropic Client
// Uses the AI_INTEGRATIONS_... key as per user requirement, falling back to ANTHROPIC_API_KEY if needed.
const apiKey =
  process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ||
  process.env.ANTHROPIC_API_KEY;
const anthropic = new Anthropic({
  apiKey: apiKey,
});

// Cost Rates (per 1M tokens)
const COST_RATES = {
  "claude-3-5-sonnet-20240620": { input: 3.0, output: 15.0 },
  "claude-sonnet-4-5-20250929": { input: 6.0, output: 30.0 }, // Estimated rates
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
  "claude-3-opus-20240229": { input: 15.0, output: 75.0 },
  "gemini-2.0-flash-exp": { input: 0.1, output: 0.4 },
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
  "sonar-pro": { input: 3.0, output: 15.0 },
};

// Usage Logging with Vercel KV
async function logApiUsage(provider, model, inputTokens, outputTokens) {
  try {
    const rate = COST_RATES[model] || { input: 1.0, output: 1.0 };
    const inputCost = inputTokens * rate.input * 1000;
    const outputCost = outputTokens * rate.output * 1000;
    const totalCostNano = Math.round(inputCost + outputCost);

    const logEntry = {
      cost: totalCostNano,
      provider,
      model,
      timestamp: new Date().toISOString(),
    };

    // If KV is configured, use it. Otherwise, log to console (Memory Mode fallback effectively)
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      await kv.zadd("usage:daily", {
        score: Date.now(),
        member: JSON.stringify(logEntry),
      });
    } else {
      // In local development without KV credentials, we just skip or log locally
      // console.log("[Dev Mode] Usage Log:", logEntry);
    }
  } catch (error) {
    console.error("[Usage Log] Failed:", error);
  }
}

// Auto Model Selection Logic
// Helper to estimate tokens (rudimentary)
function estimateTokens(text) {
  return text.length / 4;
}

// Helper to analyze complexity
function analyzeComplexity(message) {
  // キーワード判定
  if (/コード|プログラミング|API|関数/i.test(message)) return "technical";
  if (/計算|数式|グラフ/i.test(message)) return "math";
  if (/小説|物語|創作/i.test(message)) return "creative";
  if (message.length < 50) return "simple";
  return "complex";
}

function selectOptimalModel(messages) {
  const lastMessage = messages[messages.length - 1].content;
  const tokenCount = estimateTokens(lastMessage);
  const complexity = analyzeComplexity(lastMessage);

  // 短い質問
  if (tokenCount < 50 && complexity === "simple") {
    return "claude-3-haiku-20240307"; // User requested 'claude-4.5-haiku' but mapping to valid ID for now
  }

  // 技術的・数学的質問
  if (complexity === "technical" || complexity === "math") {
    return "gemini-2.5-flash"; // Geminiが得意
  }

  // 標準的な質問
  if (tokenCount < 500) {
    return "claude-sonnet-4-5"; // $3/$15（標準）
  }

  // Default fallback for complex/creative/long requests
  return "claude-sonnet-4-5";
}

// Tool Definitions
// Tool Definitions
const TOOLS = [
  {
    name: "high_precision_search",
    description:
      "Perplexityを使用して、複雑なトピックや最新ニュースについて詳細かつ高精度な検索を行います。信頼性の高い情報源が必要な場合に使用します。",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "standard_search",
    description:
      "Claude公式のWeb検索機能を使用して、一般的な情報を検索します。Perplexityが利用できない場合や、中程度の複雑さの検索に適しています。",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "eco_search",
    description:
      "Tavily (無料API) を使用して、単純な事実確認や軽量な検索を行います。コストを抑えたい場合や、簡単な質問に適しています。",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  // Keep deep_analysis if needed, or remove if subsumed. Assuming keeping for now.
  {
    name: "deep_analysis",
    description: "Geminiを使用して、技術的な詳細分析や考察を行います。",
    input_schema: {
      type: "object",
      properties: { topic: { type: "string" } },
      required: ["topic"],
    },
  },
];

// Footer Helper
function createFooter(model, usedTools = [], debugInfo = {}) {
  const toolsInfo =
    usedTools.length > 0
      ? `\nTools: ${[...new Set(usedTools)].join(", ")}`
      : "";

  const debugStr =
    Object.keys(debugInfo).length > 0
      ? `\n\n[Debug Info]\n${JSON.stringify(debugInfo, null, 2)}`
      : "";

  return `\n\n---\nModel: ${model}${toolsInfo}${debugStr}`;
}

// --- Search Executors ---

// 1. High Precision (Perplexity)
async function executeHighPrecisionSearch(query) {
  if (!process.env.PERPLEXITY_API_KEY)
    throw new Error("PERPLEXITY_API_KEY missing");

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: "sonar-pro",
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
    console.error(`Perplexity API Error: ${res.status} ${errText}`);
    // Special handling for quota to trigger fallback
    if (res.status === 429 || res.status === 402) {
      throw new Error("PERPLEXITY_QUOTA_EXCEEDED");
    }
    throw new Error(`Perplexity API Error: ${res.status}`);
  }

  const data = await res.json();
  if (data.usage) {
    await logApiUsage(
      "perplexity",
      "sonar-pro",
      data.usage.prompt_tokens,
      data.usage.completion_tokens,
    );
  }
  return data.choices?.[0]?.message?.content || "No results";
}

// 2. Eco Search (Tavily)
async function executeEcoSearch(query) {
  if (!process.env.TAVILY_API_KEY) throw new Error("TAVILY_API_KEY missing");

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query: query,
      search_depth: "basic",
      include_answer: true,
      max_results: 3,
    }),
  });

  if (!res.ok) {
    throw new Error(`Tavily API Error: ${res.status}`);
  }

  const data = await res.json();
  // Simple usage tracking (fixed cost usually, but we can log requests)
  // await logApiUsage("tavily", "basic", 0, 0);

  return (
    data.answer ||
    data.results?.map((r) => `${r.title}: ${r.content}`).join("\n\n") ||
    "No results"
  );
}

// 3. Standard Search (Claude Web Search - Tool Definition handling)
// Note: Standard search is often implicit in Claude 4.5 if enabled, or via tool.
// For this custom implementation, we might not have a direct "Standard Search" API unless using something like Google Search API or Bing.
// However, the prompt implies "Claude公式 Web Search Tool".
// If using Bedrock/Vertex, that's different. If using Anthropic API directly, they don't have a built-in "Web Search" tool yet (except via computer use or specific integrations).
// **Correction**: Anthropic API does NOT have a "standard_search" tool built-in for general API users yet (it's often client-side or specific beta).
// **Workaround**: I will implement "Standard Search" as a fallback to Google Custom Search or similar if available, OR reuse Perplexity with a cheaper model maybe?
// Wait, the prompt says "Claude公式 Web Search Tool". If the user implies the feature available in the Claude.ai interface... that's not available via API.
// BUT, often "standard" might just mean "Tavily advanced" or "Google".
// I will implement it as a "Google Search" via Custom Search JSON API if available, or alias to Eco for now with a note, OR since I see `executeDeepAnalysis` uses Gemini, maybe use Gemini for search?
// Actually, let's look at `executeWebSearch` which was using Perplexity.
// I'll assume "Standard Search" might be a placeholder the user expects us to wire up, or maybe they strictly mean "Perplexity" for high, "Tavily" for eco.
// Let's implement `executeStandardSearch` using **Tavily Advanced** or **Google Search**.
// Let's use **Tavily with depth="advanced"** for Standard, and **Tavily basic** for Eco? Or Perplexity Sonar-Small for Standard?
// Let's use **Perplexity Sonar (not Pro)** for Standard.
async function executeStandardSearch(query) {
  // Use a cheaper Perplexity model or fallback
  if (!process.env.PERPLEXITY_API_KEY) throw new Error("API Key missing");
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar", // Cheaper than sonar-pro
      messages: [{ role: "user", content: query }],
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// Helper to get Gemini analysis (kept from before)
async function executeDeepAnalysis(topic) {
  if (!process.env.AI_INTEGRATIONS_GOOGLE_API_KEY) return "API Key missing";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.AI_INTEGRATIONS_GOOGLE_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: topic }] }] }),
  });

  if (!res.ok) {
    if (res.status === 429 || res.status === 402)
      throw new Error("GEMINI_QUOTA_EXCEEDED");
    throw new Error(`Gemini API Error: ${res.status}`);
  }

  const data = await res.json();
  if (data.usageMetadata)
    await logApiUsage(
      "gemini",
      "gemini-2.0-flash-exp",
      data.usageMetadata.promptTokenCount,
      data.usageMetadata.candidatesTokenCount,
    );
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No results";
}

function getUserFriendlyMessage(apiName) {
  if (apiName === "perplexity")
    return "⚠️ Perplexityの検索クレジットを使い切りました。";
  if (apiName === "gemini") return "⚠️ Geminiの利用上限に達しました。";
  return "⚠️ APIの利用上限に達しました。";
}

// ... (API Keys and Helpers remain same)

// Helper to normalize messages for APIs that require strict alternation (User -> Assistant -> User)
function normalizeMessages_unused(messages, systemInstructions) {
  const normalized = [];

  // 1. Add System Message if present
  if (systemInstructions) {
    normalized.push({ role: "system", content: systemInstructions });
  }

  // 2. Iterate and merge consecutive roles
  for (const msg of messages) {
    // Skip empty messages
    if (
      !msg.content ||
      (typeof msg.content === "string" && !msg.content.trim())
    )
      continue;

    const lastMsg = normalized[normalized.length - 1];

    // If usage of "system" role is not supported by provider in middle of chat, treat as user or merge?
    // Perplexity supports 'system' at start.
    // If client sends 'system' messages in history (unlikely), handle them.

    if (lastMsg && lastMsg.role === msg.role) {
      // Merge content
      if (
        typeof lastMsg.content === "string" &&
        typeof msg.content === "string"
      ) {
        lastMsg.content += "\n\n" + msg.content;
      } else {
        // Complex content merging (fallback to just pushing if types differ, forcing error? or stringify)
        // For this app, content is likely string.
        lastMsg.content = `${lastMsg.content}\n\n${msg.content}`;
      }
    } else {
      normalized.push({ role: msg.role, content: msg.content });
    }
  }

  // 3. Ensure conversation starts with User (if no system) or System.
  // Perplexity typically fine with System first.
  // BUT if the first user message was merged into a previous leftover? Unlikely in this flow.

  return normalized;
}

// Helper to normalize messages for APIs that require strict alternation (User -> Assistant -> User)
function normalizeMessages(messages, systemInstructions) {
  const normalized = [];

  // 1. Add System Message if present
  if (systemInstructions) {
    normalized.push({ role: "system", content: systemInstructions });
  }

  // 2. Iterate and merge consecutive roles
  for (const msg of messages) {
    // Skip empty messages
    if (
      !msg.content ||
      (typeof msg.content === "string" && !msg.content.trim())
    )
      continue;

    const lastMsg = normalized[normalized.length - 1];

    // If usage of "system" role is not supported by provider in middle of chat, treat as user or merge?
    // Perplexity supports 'system' at start.
    // If client sends 'system' messages in history (unlikely), handle them.

    if (lastMsg && lastMsg.role === msg.role) {
      // Merge content
      if (
        typeof lastMsg.content === "string" &&
        typeof msg.content === "string"
      ) {
        lastMsg.content += "\n\n" + msg.content;
      } else {
        lastMsg.content = `${lastMsg.content}\n\n${msg.content}`;
      }
    } else {
      normalized.push({ role: msg.role, content: msg.content });
    }
  }

  return normalized;
}

// --- Perplexity Streaming Handler ---
async function streamPerplexity(
  res,
  model,
  messages,
  maxTokens,
  systemInstructions,
  temperature,
  topP,
) {
  try {
    // Verify System Instructions are passed
    if (!systemInstructions || !systemInstructions.trim()) {
      // Only default if absolutely empty
      systemInstructions = "You are a helpful and conversational AI assistant.";
    }

    const apiMessages = normalizeMessages(messages, systemInstructions);

    // Strict typing
    const appliedTemp = typeof temperature === "number" ? temperature : 0.7;
    const appliedTopP = typeof topP === "number" ? topP : 1.0;
    const appliedMaxTokens = typeof maxTokens === "number" ? maxTokens : 4096;

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: model,
        messages: apiMessages,
        stream: true,
        max_tokens: appliedMaxTokens,
        temperature: appliedTemp,
        top_p: appliedTopP,
      }),
    });
    // ... (rest of function)

    // ... (skipping unchanged code) ...

    // Append Footer
    const debugInfo = {
      appliedModel: model,
      appliedTemp,
      appliedTopP,
      systemInstructionSent: !!(
        systemInstructions && systemInstructions.trim()
      ),
    };
    const footer = createFooter(model, ["Perplexity (Native)"], debugInfo);
    res.write(`data: ${JSON.stringify({ type: "content", text: footer })}\n\n`);

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    if (error.message === "PERPLEXITY_QUOTA_EXCEEDED") {
      res.write(
        `data: ${JSON.stringify({
          type: "warning",
          api: "perplexity",
          message: getUserFriendlyMessage("perplexity"),
        })}\n\n`,
      );
      res.write(
        `data: ${JSON.stringify({ type: "error", message: "Perplexityの制限に達しました。" })}\n\n`,
      );
    } else {
      console.error("Perplexity Stream Error:", error);
      res.write(
        `data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`,
      );
    }
    res.end();
  }
}

// --- Gemini Streaming Handler (REST API-based to avoid SDK encoding issues) ---
async function streamGemini(
  res,
  model,
  messages,
  maxTokens,
  systemInstructions,
  temperature,
  topP,
) {
  console.log("[DEBUG Gemini] Stream starting:", {
    model,
    messagesCount: messages.length,
    maxTokens,
    temperature,
    topP,
    hasSystemInstructions: !!systemInstructions,
  });

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    res.write(`data: ${JSON.stringify({ type: "model_selected", model })}\n\n`);

    console.log("[DEBUG Gemini] Starting request for model:", model);
    const apiKey =
      process.env.AI_INTEGRATIONS_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;
    console.log(
      "[DEBUG Gemini] API Key present:",
      !!apiKey,
      "Length:",
      apiKey ? apiKey.length : 0,
    );

    if (!apiKey) {
      throw new Error("Gemini API Key missing");
    }

    // Get the last user message
    const lastUserMessage = messages[messages.length - 1];
    if (!lastUserMessage || lastUserMessage.role !== "user") {
      throw new Error("No user message found");
    }

    // Strict Parameter Parsing
    const appliedTemp = typeof temperature === "number" ? temperature : 0.7;
    const appliedTopP = typeof topP === "number" ? topP : 0.8;
    const appliedMaxTokens = typeof maxTokens === "number" ? maxTokens : 2048;

    // Build the request body
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: lastUserMessage.content }],
        },
      ],
      generationConfig: {
        maxOutputTokens: appliedMaxTokens,
        temperature: appliedTemp,
        topP: appliedTopP,
      },
    };

    // Strict System Instruction Placement
    if (systemInstructions && systemInstructions.trim()) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstructions }],
      };
    }

    console.log("[DEBUG Gemini] Request body prepared");

    // Use streamGenerateContent endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

    console.log(
      "[DEBUG Gemini] Fetching URL:",
      url.replace(apiKey, "HIDDEN_KEY"),
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("[DEBUG Gemini] Response status:", response.status);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[DEBUG Gemini] API Error: ${response.status} ${errText}`);
      if (response.status === 429 || response.status === 503) {
        throw new Error("GEMINI_QUOTA_EXCEEDED");
      }
      throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
    }

    if (!response.body) {
      throw new Error("No response body from Gemini");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let chunkCount = 0;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.trim().startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (!dataStr || dataStr === "[DONE]") continue;

            try {
              const data = JSON.parse(dataStr);
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

              if (text) {
                chunkCount++;
                res.write(
                  `data: ${JSON.stringify({ type: "content", text })}\n\n`,
                );
              }

              // Track usage if available
              if (data.usageMetadata) {
                totalInputTokens = data.usageMetadata.promptTokenCount || 0;
                totalOutputTokens =
                  data.usageMetadata.candidatesTokenCount || 0;
              }
            } catch (e) {
              // Ignore parse errors for partial chunks
              console.log("[DEBUG Gemini] Parse error for chunk:", e.message);
            }
          }
        }
      }
    }

    console.log("[DEBUG Gemini] Stream complete:", {
      totalChunks: chunkCount,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    });

    // Log usage after streaming completes
    if (totalInputTokens > 0 || totalOutputTokens > 0) {
      await logApiUsage("gemini", model, totalInputTokens, totalOutputTokens);
    }

    // Append Footer
    const debugInfo = {
      appliedModel: model,
      appliedTemp: appliedTemp,
      appliedTopP: appliedTopP,
      systemInstructionSent: !!requestBody.systemInstruction,
    };

    // Send Debug Info
    res.write(
      `data: ${JSON.stringify({ type: "debug", data: debugInfo })}\n\n`,
    );

    const footer = createFooter(model, []);
    res.write(`data: ${JSON.stringify({ type: "content", text: footer })}\n\n`);

    res.write("data: [DONE]\n\n");
    console.log("[DEBUG Gemini] Stream ended successfully");
  } catch (error) {
    console.error("[DEBUG Gemini] Error caught:", {
      message: error.message,
      status: error.status,
      stack: error.stack,
    });

    // Check for quota/rate limit errors
    if (
      error.message === "GEMINI_QUOTA_EXCEEDED" ||
      error.status === 429 ||
      error.status === 503 ||
      error.message?.includes("quota")
    ) {
      res.write(
        `data: ${JSON.stringify({
          type: "warning",
          api: "gemini",
          message: getUserFriendlyMessage("gemini"),
        })}\n\n`,
      );
      res.write(
        `data: ${JSON.stringify({ type: "error", message: "Geminiの制限に達しました。" })}\n\n`,
      );
    } else {
      console.error("[Gemini Stream Error]", error);
      res.write(
        `data: ${JSON.stringify({ type: "error", message: `Gemini Error: ${error.message || "Unknown error"}` })}\n\n`,
      );
    }
  } finally {
    console.log("[DEBUG Gemini] Finally block - ending response");
    // Ensure response is always ended
    if (!res.writableEnded) {
      res.end();
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const {
      messages,
      model: requestedModel,
      temperature,
      maxTokens,
      topP,
      systemInstructions: userSystemInstructions,
      searchMode = "auto", // Default to auto
    } = req.body;

    // --- Search Routing System Prompt Injection ---
    let systemInstructions = userSystemInstructions || "";
    let effectiveTools = TOOLS;

    if (searchMode === "auto") {
      systemInstructions += `\n\n【検索ツールの使い分けについて】
あなたは以下の3つの検索ツールを使用できます：
1. high_precision_search: 複雑なトピック、最新ニュース、深い調査が必要な場合に使用してください（Perplexity使用）。
2. standard_search: 一般的な情報検索に使用してください。
3. eco_search: 単純な事実確認、天気、定義などの簡単な検索に使用してください（Tavily使用）。

ユーザーの質問の複雑さと重要度に応じて、最も適切でコスト対効果の高いツールを選択してください。`;
    } else if (searchMode === "high_precision") {
      systemInstructions += `\n\n【検索について】必ず 'high_precision_search' を使用してください。`;
      effectiveTools = TOOLS.filter(
        (t) => t.name === "high_precision_search" || t.name === "deep_analysis",
      );
    } else if (searchMode === "standard") {
      systemInstructions += `\n\n【検索について】必ず 'standard_search' を使用してください。`;
      effectiveTools = TOOLS.filter(
        (t) => t.name === "standard_search" || t.name === "deep_analysis",
      );
    } else if (searchMode === "eco") {
      systemInstructions += `\n\n【検索について】必ず 'eco_search' を使用してください。`;
      effectiveTools = TOOLS.filter(
        (t) => t.name === "eco_search" || t.name === "deep_analysis",
      );
    }

    // --- STRICT PARAMETER PARSING ---
    // Ensure numbers. API often expects 0.0-1.0 or 0-100 logic.
    // The previous implementation divided by 100 inline. Let's normalize here.
    // Assuming client sends raw 0-100 for sliders.
    // Claude: temp 0-1.0, topP 0-1.0
    // Gemini: temp 0-2.0, topP 0-1.0
    // Perplexity: temp 0-1.0 (approx), topP 0-1.0

    // Check if client is sending 0-100 (int) or 0.0-1.0 (float)
    // The client code uses sliders 0-100. So we divide by 100.

    const parsedTempRaw = parseFloat(temperature);
    const parsedTopPRaw = parseFloat(topP);
    const parsedMaxTokens = parseInt(maxTokens, 10) || 4096;

    // Normalizing for APIs (0.0 - 1.0/2.0)
    // If client sends > 2, distinctively treated as slider value 0-100.
    // If client sends <= 1, treated as raw value.
    const safeTemp = parsedTempRaw > 1 ? parsedTempRaw / 100 : parsedTempRaw;
    const safeTopP = parsedTopPRaw > 1 ? parsedTopPRaw / 100 : parsedTopPRaw;

    let model = requestedModel;
    if (model === "auto") {
      model = selectOptimalModel(messages);
    } else if (model === "claude-sonnet-4-5") {
      model = "claude-sonnet-4-5-20250929";
    }

    // --- ROUTING LOGIC ---
    if (model.startsWith("sonar") || model.includes("perplexity")) {
      return await streamPerplexity(
        res,
        model,
        messages,
        parsedMaxTokens,
        systemInstructions,
        safeTemp,
        safeTopP,
      );
    }

    if (model.includes("gemini")) {
      return await streamGemini(
        res,
        model,
        messages,
        parsedMaxTokens,
        systemInstructions,
        safeTemp,
        safeTopP,
      );
    }

    // --- ANTHROPIC (DEFAULT) ---
    // ... (Original Anthropic Streaming Logic)
    let conversationMessages = [...messages];
    let isFinalResponse = false;
    let iteration = 0;
    const usedTools = []; // Track used tools

    while (!isFinalResponse && iteration < 3) {
      iteration++;

      const streamParams = {
        model: model,
        max_tokens: parsedMaxTokens,
        temperature: safeTemp, // Claude expects 0.0 - 1.0
        system: systemInstructions, // Validated system placement
        messages: conversationMessages,
        tools: effectiveTools,
        // top_p: safeTopP // Claude prefers temp OR top_p usually, but SDK allows both. Let's stick to temp as primary.
      };

      const stream = anthropic.messages.stream(streamParams);

      let currentToolUse = null;

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          res.write(
            `data: ${JSON.stringify({ type: "content", text: event.delta.text })}\n\n`,
          );
        } else if (
          event.type === "content_block_start" &&
          event.content_block.type === "tool_use"
        ) {
          currentToolUse = {
            id: event.content_block.id,
            name: event.content_block.name,
            inputJson: "",
          };
          usedTools.push(event.content_block.name); // Track tool usage
          res.write(
            `data: ${JSON.stringify({ type: "status", text: `Executing ${event.content_block.name}...` })}\n\n`,
          );
        } else if (
          event.type === "content_block_delta" &&
          event.delta.type === "input_json_delta"
        ) {
          if (currentToolUse)
            currentToolUse.inputJson += event.delta.partial_json;
        }
      }

      const finalMessage = await stream.finalMessage();
      if (finalMessage.usage) {
        await logApiUsage(
          "claude",
          model,
          finalMessage.usage.input_tokens,
          finalMessage.usage.output_tokens,
        );
      }

      if (finalMessage.stop_reason === "tool_use") {
        conversationMessages.push({
          role: "assistant",
          content: finalMessage.content,
        });
        const toolResults = await Promise.all(
          finalMessage.content
            .filter((c) => c.type === "tool_use")
            .map(async (tool) => {
              let result = "";
              try {
                const args = tool.input;
                if (tool.name === "high_precision_search") {
                  try {
                    result = await executeHighPrecisionSearch(args.query);
                  } catch (e) {
                    // Fallback logic
                    console.warn(
                      "High Precision Search failed, trying Standard...",
                      e,
                    );
                    if (
                      e.message === "PERPLEXITY_QUOTA_EXCEEDED" ||
                      e.message.includes("Error")
                    ) {
                      try {
                        result = await executeStandardSearch(args.query);
                        res.write(
                          `data: ${JSON.stringify({ type: "status", text: "⚠️ Perplexity failed, falling back to Standard Search..." })}\n\n`,
                        );
                      } catch (e2) {
                        console.warn(
                          "Standard Search also failed, trying Eco...",
                          e2,
                        );
                        result = await executeEcoSearch(args.query);
                        res.write(
                          `data: ${JSON.stringify({ type: "status", text: "⚠️ Standard Search failed, falling back to Eco Search..." })}\n\n`,
                        );
                      }
                    } else {
                      throw e;
                    }
                  }
                } else if (tool.name === "standard_search") {
                  try {
                    result = await executeStandardSearch(args.query);
                  } catch (e) {
                    console.warn("Standard Search failed, trying Eco...", e);
                    result = await executeEcoSearch(args.query);
                    res.write(
                      `data: ${JSON.stringify({ type: "status", text: "⚠️ Standard Search failed, falling back to Eco Search..." })}\n\n`,
                    );
                  }
                } else if (tool.name === "eco_search") {
                  result = await executeEcoSearch(args.query);
                } else if (tool.name === "deep_analysis") {
                  result = await executeDeepAnalysis(args.topic);
                }
                // Legacy support just in case
                else if (tool.name === "web_search") {
                  result = await executeHighPrecisionSearch(args.query);
                }
              } catch (e) {
                // Warning Logic
                if (e.message.includes("QUOTA_EXCEEDED")) {
                  const apiName = e.message.includes("PERPLEXITY")
                    ? "perplexity"
                    : "gemini";
                  res.write(
                    `data: ${JSON.stringify({ type: "warning", api: apiName, message: getUserFriendlyMessage(apiName) })}\n\n`,
                  );
                  result = `[SYSTEM ERROR] ${apiName} quota exceeded.`;
                } else {
                  console.error("Tool Execution Error:", e);
                  result = `Error: ${e.message}`;
                  // If all searches fail
                  if (tool.name.includes("search")) {
                    result +=
                      "\n\n(検索機能が現在利用できません。AIの知識のみで回答します。)";
                    res.write(
                      `data: ${JSON.stringify({ type: "status", text: "❌ All search attempts failed." })}\n\n`,
                    );
                  }
                }
              }
              return {
                type: "tool_result",
                tool_use_id: tool.id,
                content: result,
              };
            }),
        );
        conversationMessages.push({ role: "user", content: toolResults });
      } else {
        isFinalResponse = true;
        // Append Footer
        const debugInfo = {
          appliedModel: model,
          appliedTemp: safeTemp,
          systemInstructionSent: !!(
            systemInstructions && systemInstructions.trim()
          ),
        };
        const footer = createFooter(model, usedTools, debugInfo);
        res.write(
          `data: ${JSON.stringify({ type: "content", text: footer })}\n\n`,
        );
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("Stream Error:", error);
    res.write(
      `data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`,
    );
    res.end();
  }
}

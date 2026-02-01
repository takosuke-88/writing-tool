import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

// Initialize Anthropic client
const apiKey =
  process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ||
  process.env.ANTHROPIC_API_KEY;

const anthropic = new Anthropic({
  apiKey: apiKey,
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
    if (!apiKey) {
      console.error("[API Error] API key is not configured");
      return res.status(500).json({ error: "API key not configured" });
    }

    const {
      messages,
      model,
      temperature,
      maxTokens,
      topP,
      systemInstructions,
    } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    // Convert client messages to Anthropic format
    // Filter out error messages or empty content if necessary
    const apiMessages = messages.map((msg: any) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    }));

    console.log(
      `[API] Calling Claude (${model}) with ${apiMessages.length} messages`,
    );

    const response = await anthropic.messages.create({
      model: model || "claude-3-5-sonnet-20240620", // Default to Sonnet
      max_tokens: maxTokens || 4096,
      temperature: (temperature || 70) / 100, // Convert 0-200 to 0.0-2.0
      top_p: (topP || 100) / 100, // Convert 0-100 to 0.0-1.0
      system: systemInstructions,
      messages: apiMessages,
    });

    const content = response.content[0];
    const text = content.type === "text" ? content.text : "";

    res.json({
      role: "assistant",
      content: text,
    });
  } catch (error) {
    console.error("[API Error] Chat completion failed:", error);
    res.status(500).json({
      error: "Failed to generate response",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

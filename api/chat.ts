import type { VercelRequest, VercelResponse } from "@vercel/node";

const apiKey =
  process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ||
  process.env.ANTHROPIC_API_KEY;

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

    // Map internal model IDs to actual Anthropic API model names
    let apiModel = model;
    if (model === "claude-sonnet-4-5") {
      apiModel = "claude-3-5-sonnet-20241022"; // Use latest 3.5 Sonnet
    } else if (!model) {
      apiModel = "claude-3-5-sonnet-20241022";
    }

    // Convert client messages to Anthropic format
    const apiMessages = messages.map((msg: any) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    }));

    console.log(`[API] Calling Claude API (${apiModel}) via fetch...`);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: apiModel,
        max_tokens: maxTokens || 4096, // Must be provided
        temperature: (temperature || 70) / 100,
        top_p: (topP || 100) / 100,
        system: systemInstructions,
        messages: apiMessages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[API Error] Claude API error (${response.status}):`,
        errorText,
      );
      throw new Error(`Claude API Error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const content = data.content[0];
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

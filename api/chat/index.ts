import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Extract parameters from request body
    const {
      messages,
      model,
      temperature,
      maxTokens,
      topP,
      systemInstructions,
    } = req.body;

    // Map model name if needed
    const apiModel = model || "claude-sonnet-4-5-20250929";

    // Build request body
    const requestBody: any = {
      model: apiModel,
      max_tokens: maxTokens || 2048,
      messages: messages,
    };

    // Add optional parameters if provided
    if (temperature !== undefined) {
      requestBody.temperature = temperature / 100; // Convert 0-200 to 0.0-2.0
    }

    if (topP !== undefined) {
      requestBody.top_p = topP / 100; // Convert 0-100 to 0.0-1.0
    }

    if (systemInstructions) {
      requestBody.system = systemInstructions;
    }

    console.log("[API] Calling Claude with:", {
      model: apiModel,
      max_tokens: requestBody.max_tokens,
      temperature: requestBody.temperature,
      top_p: requestBody.top_p,
      hasSystem: !!systemInstructions,
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Claude API Error:", error);
      return res.status(response.status).json(error);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error: any) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message });
  }
}

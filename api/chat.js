export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Debug: Check if API key exists
    // Debug: Check if API key exists
    console.log(
      "Claude API Key:",
      process.env.ANTHROPIC_API_KEY ? "存在" : "なし",
    );
    console.log(
      "Perplexity API Key:",
      process.env.PERPLEXITY_API_KEY ? "存在" : "なし",
    );

    // Extract parameters from request body
    const {
      messages,
      model,
      temperature,
      maxTokens,
      topP,
      systemInstructions,
    } = req.body;

    // Determine API provider and configuration
    let apiUrl = "https://api.anthropic.com/v1/messages";
    let headers = {
      "content-type": "application/json",
    };
    let body = {};

    const isPerplexity = model === "llama-3.1-sonar-small-128k-online";

    if (isPerplexity) {
      apiUrl = "https://api.perplexity.ai/chat/completions";
      headers["Authorization"] = `Bearer ${process.env.PERPLEXITY_API_KEY}`;

      // Convert messages to OpenAI format (role: 'system' for instructions)
      const completionMessages = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      if (systemInstructions) {
        completionMessages.unshift({
          role: "system",
          content: systemInstructions,
        });
      }

      body = {
        model: "llama-3.1-sonar-small-128k-online",
        messages: completionMessages,
        temperature: temperature !== undefined ? temperature / 100 : 0.7,
        max_tokens: maxTokens || 2048,
        top_p: topP !== undefined ? topP / 100 : 1,
        return_citations: false,
        return_images: false,
        return_related_questions: false,
      };
    } else {
      // Default to Claude API
      headers["x-api-key"] = process.env.ANTHROPIC_API_KEY;
      headers["anthropic-version"] = "2023-06-01";

      const apiModel = model || "claude-sonnet-4-5-20250929";

      body = {
        model: apiModel,
        max_tokens: maxTokens || 2048,
        messages: messages,
      };

      if (temperature !== undefined) {
        body.temperature = temperature / 100;
      }

      if (systemInstructions) {
        body.system = systemInstructions;
      }
    }

    console.log(
      "[API] Calling Provider:",
      isPerplexity ? "Perplexity" : "Anthropic",
      "with model:",
      isPerplexity ? body.model : body.model,
    );

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Claude API Error:", error);
      return res.status(response.status).json(error);
    }

    const data = await response.json();

    // Normalize response to maintain compatibility with client
    // Client expects: { content: [ { text: "..." } ] } or { content: "..." }
    if (isPerplexity) {
      // Perplexity (OpenAI format): choices[0].message.content
      const content = data.choices?.[0]?.message?.content || "";
      return res.status(200).json({
        content: [{ text: content }],
      });
    }

    // Anthropic format is already compatible
    return res.status(200).json(data);
  } catch (error) {
    console.error("Server Error:", error);
    const message = error.message || "Unknown error";
    return res.status(500).json({ error: message });
  }
}

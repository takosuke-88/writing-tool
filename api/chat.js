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
    console.log(
      "Gemini API Key:",
      process.env.GEMINI_API_KEY ? "存在" : "なし",
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

    const isPerplexity = model === "sonar-pro";

    if (isPerplexity) {
      apiUrl = "https://api.perplexity.ai/chat/completions";
      headers["Authorization"] = `Bearer ${process.env.PERPLEXITY_API_KEY}`;

      // Simplify messages for Perplexity to avoid "user or tool message(s) should alternate" error
      // Only send system instructions + the last user message
      const lastUserMessage = messages[messages.length - 1];
      const completionMessages = [];

      if (systemInstructions) {
        completionMessages.push({
          role: "system",
          content: systemInstructions,
        });
      }

      if (lastUserMessage) {
        completionMessages.push({
          role: lastUserMessage.role, // Should be "user"
          content: lastUserMessage.content,
        });
      }

      console.log(
        "[Perplexity] Formatted messages:",
        JSON.stringify(completionMessages, null, 2),
      );

      body = {
        model: "sonar-pro",
        messages: completionMessages,
        temperature: temperature !== undefined ? temperature / 100 : 0.7,
        max_tokens: maxTokens || 2048,
        top_p: topP !== undefined ? topP / 100 : 1,
        return_citations: false,
        return_images: false,
        return_related_questions: false,
      };
    } else if (model === "gemini-2.0-flash") {
      // Gemini API
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

      // Gemini expects: { contents: [ { role: "user"|"model", parts: [{ text: "..." }] } ], systemInstruction: ... }
      const geminiContents = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      body = {
        contents: geminiContents,
        generationConfig: {
          temperature: temperature !== undefined ? temperature / 100 : 0.7,
          maxOutputTokens: maxTokens || 2048,
          topP: topP !== undefined ? topP / 100 : 0.95,
        },
      };

      if (systemInstructions) {
        body.systemInstruction = {
          parts: [{ text: systemInstructions }],
        };
      }
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
      model === "gemini-2.0-flash"
        ? "Gemini"
        : isPerplexity
          ? "Perplexity"
          : "Anthropic",
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

    if (model === "gemini-2.0-flash") {
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return res.status(200).json({
        content: [{ text: text }],
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

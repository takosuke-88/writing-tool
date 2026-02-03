export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Debug: Check if API key exists
    console.log("API Key:", process.env.ANTHROPIC_API_KEY ? "存在" : "なし");
    console.log("API Key length:", process.env.ANTHROPIC_API_KEY?.length || 0);

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
    const apiModel = model || "claude-sonnet-4-5-20250929"; // Claude 4.5 Sonnet latest

    // Build request body
    const requestBody = {
      model: apiModel,
      max_tokens: maxTokens || 2048,
      messages: messages,
    };

    // Add optional parameters if provided
    if (temperature !== undefined) {
      requestBody.temperature = temperature / 100; // Convert 0-200 to 0.0-2.0
    }

    // Note: Claude API does not allow both temperature and top_p
    // We only use temperature for now
    // if (topP !== undefined) {
    //   requestBody.top_p = topP / 100; // Convert 0-100 to 0.0-1.0
    // }

    if (systemInstructions) {
      requestBody.system = systemInstructions;
    }

    console.log("[API] Calling Claude with:", {
      model: apiModel,
      max_tokens: requestBody.max_tokens,
      temperature: requestBody.temperature,
      top_p: requestBody.top_p,
      hasSystem: !!systemInstructions,
      messagesCount: messages?.length || 0,
    });

    // Debug: Log the full request body (without sensitive data)
    console.log(
      "[API] Full request body:",
      JSON.stringify(
        {
          ...requestBody,
          messages: messages?.map((m) => ({
            role: m.role,
            contentLength: m.content?.length,
          })),
        },
        null,
        2,
      ),
    );

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
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
    return res.status(200).json(data);
  } catch (error) {
    console.error("Server Error:", error);
    const message = error.message || "Unknown error";
    return res.status(500).json({ error: message });
  }
}

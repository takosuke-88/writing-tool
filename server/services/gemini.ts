import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.AI_INTEGRATIONS_GOOGLE_API_KEY!);

export async function callGemini(prompt: string, model = "gemini-2.5-flash-preview-09-2025") {
  try {
    const modelInstance = genAI.getGenerativeModel({ model });
    const result = await modelInstance.generateContent(prompt);
    return result.response.text();
  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw new Error(`Gemini API failed: ${error.message || 'Unknown error'}`);
  }
}

export async function* streamGemini(
  model: string,
  messages: Array<{ role: string; content: string }>,
  systemInstructions?: string,
  temperature?: number,
  maxTokens?: number
) {
  try {
    const modelInstance = genAI.getGenerativeModel({
      model,
      systemInstruction: systemInstructions,
      generationConfig: {
        temperature: temperature ? temperature / 100 : undefined,
        maxOutputTokens: maxTokens,
      },
    });

    // Convert messages to Gemini format
    const geminiMessages = messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // Stream the response
    const result = await modelInstance.generateContentStream({
      contents: geminiMessages,
    });

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  } catch (error: any) {
    console.error("Gemini Stream Error:", error);
    throw new Error(`Gemini API failed: ${error.message || 'Unknown error'}`);
  }
}

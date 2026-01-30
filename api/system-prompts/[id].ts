import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../server/storage";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const { id } = req.query;
  const promptId = id as string;

  if (req.method === "GET") {
    try {
      const prompt = await storage.getSystemPrompt(promptId);
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
  } else if (req.method === "PUT") {
    try {
      const { name, promptText } = req.body;
      const prompt = await storage.updateSystemPrompt(promptId, {
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
  } else if (req.method === "DELETE") {
    try {
      const prompt = await storage.getSystemPrompt(promptId);
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
      await storage.deleteSystemPrompt(promptId);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting system prompt:", error);
      res.status(500).json({ error: "システムプロンプトの削除に失敗しました" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}

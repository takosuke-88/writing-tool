import { storage } from "../../server/storage";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  const conversationId = parseInt(id as string, 10);

  if (isNaN(conversationId)) {
    return res.status(400).json({ error: "Invalid ID" });
  }

  if (req.method === "GET") {
    try {
      const conv = await storage.getConversation(conversationId);
      if (!conv) return res.status(404).json({ error: "Not found" });
      return res.status(200).json(conv);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else if (req.method === "PATCH") {
    try {
      const conv = await storage.updateConversation(conversationId, req.body);
      if (!conv) return res.status(404).json({ error: "Not found" });
      return res.status(200).json(conv);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else if (req.method === "DELETE") {
    try {
      await storage.deleteConversation(conversationId);
      return res.status(200).json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

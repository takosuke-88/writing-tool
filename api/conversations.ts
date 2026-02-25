import { storage } from "../server/storage";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    try {
      const convs = await storage.getConversations();
      return res.status(200).json(convs);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else if (req.method === "POST") {
    try {
      const conv = await storage.createConversation(req.body);
      return res.status(200).json(conv);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

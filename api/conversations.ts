import { getConversations, createConversation } from "./_lib/storage.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    try {
      const convs = await getConversations();
      return res.status(200).json(convs);
    } catch (e: any) {
      console.error("GET /api/conversations error:", e);
      return res.status(500).json({ error: e.message });
    }
  } else if (req.method === "POST") {
    try {
      const conv = await createConversation(req.body);
      return res.status(200).json(conv);
    } catch (e: any) {
      console.error("POST /api/conversations error:", e);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

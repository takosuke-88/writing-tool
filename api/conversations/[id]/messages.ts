import { addMessage } from "../../../_lib/storage";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  const conversationId = parseInt(id as string, 10);

  if (isNaN(conversationId)) {
    return res.status(400).json({ error: "Invalid conversation ID" });
  }

  if (req.method === "POST") {
    try {
      const message = await addMessage({
        conversationId,
        role: req.body.role,
        content: req.body.content,
      });
      return res.status(200).json(message);
    } catch (e: any) {
      console.error(`POST /api/conversations/${id}/messages error:`, e);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

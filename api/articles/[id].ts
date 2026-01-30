import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../server/storage";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const { id } = req.query;
  const articleId = parseInt(id as string);

  if (isNaN(articleId)) {
    return res.status(400).json({ error: "無効なIDです" });
  }

  if (req.method === "GET") {
    try {
      const article = await storage.getArticle(articleId);
      if (!article) {
        return res.status(404).json({ error: "記事が見つかりません" });
      }
      res.json(article);
    } catch (error) {
      console.error("Error fetching article:", error);
      res.status(500).json({ error: "記事の取得に失敗しました" });
    }
  } else if (req.method === "DELETE") {
    try {
      await storage.deleteArticle(articleId);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting article:", error);
      res.status(500).json({ error: "記事の削除に失敗しました" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}

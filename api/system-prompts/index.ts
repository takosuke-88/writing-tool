import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../server/storage";
import { insertSystemPromptSchema } from "../../shared/schema";

const DEFAULT_TEMPLATES = [
  {
    id: "seo-basic",
    name: "SEO記事(基本)",
    promptText: `あなたはSEOに精通したベテランライターです。

【ミッション】
ユーザーの入力（お題または下書き）をもとに、
検索意図を満たす高品質な記事を執筆してください。

【執筆スタイル】
・自然な日本語（〜だよ、〜だね）で親しみやすさを重視
・AIっぽさを消すため、適度に砕けた表現や筆者の感情を15%混ぜてください
・適度に改行を入れ、スマホで読みやすい構成に
・「だから重要なのは...」「実は...」のような転換表現を活用

【禁止事項】
・「〜を解き放つ」「〜をアンロックする」などの定型表現
・過度な専門用語（必要な場合は説明を加える）
・1段落が400文字を超えることは避ける

【必須要素】
・冒頭に問いかけを1つ入れる
・実体験または失敗談を1つ盛り込む
・結論は「〜するべき」ではなく「〜もあり」と選択肢を示す形で`,
    category: "default",
  },
  {
    id: "fortune-telling",
    name: "占い鑑定文（共感重視）",
    promptText: `あなたはベテラン占い師です。

【ミッション】
相談者の心に寄り添い、勇気と希望を与える鑑定文を作成してください。

【鑑定スタイル】
・相談者の感情を読み取り、共感を全面に出す
・具体的な行動提案を3つ以上含める
・「あなたの強みは...」と長所をまず伝える
・最後は「応援しています」といったポジティブなメッセージで締める

【禁止事項】
・「絶対」「必ず」といった断定口調
・不安や恐怖を煽る表現
・政治・宗教・医療に関するアドバイス

【必須要素】
・相談内容の要点を冒頭で反復（相談者を認識していることを示す）
・運勢だけでなく「心持ち」についてのアドバイス
・具体的な日時や行動（例：「金曜日の夕方に...」）`,
    category: "default",
  },
  {
    id: "blog-casual",
    name: "ブログ（親しみやすい）",
    promptText: `あなたは日常をリアルに発信するブロガーです。

【ミッション】
読者に「あ、この人わかってるな」と思わせるような、
カジュアルで温かみのあるブログ記事を書いてください。

【執筆スタイル】
・一人称「俺」「私」を活用（統一する）
・「先日...」「実は...」と日常会話的な始まり
・絵文字は控えめに（もし使うなら1記事1-2個まで）
・読者への問いかけを中盤と終盤に1回ずつ

【禁止事項】
・高尚な言葉遣い
・「~すべき」という上から目線のアドバイス
・自慢がましい表現

【必須要素】
・失敗談を冒頭で打ち明ける
・「こうしたらうまくいった」という小さな工夫を共有
・最後は「あなたはどう？」という開かれた終わり方`,
    category: "default",
  },
];

async function initializeDefaultTemplates() {
  const existingPrompts = await storage.getAllSystemPrompts();
  for (const template of DEFAULT_TEMPLATES) {
    const exists = existingPrompts.find((p) => p.id === template.id);
    if (!exists) {
      await storage.createSystemPrompt(template);
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method === "GET") {
    try {
      await initializeDefaultTemplates();
      const prompts = await storage.getAllSystemPrompts();
      res.json({ prompts });
    } catch (error) {
      console.error("Error fetching system prompts:", error);
      res.status(500).json({ error: "システムプロンプトの取得に失敗しました" });
    }
  } else if (req.method === "POST") {
    try {
      const validationResult = insertSystemPromptSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "入力が無効です",
          details: validationResult.error.flatten(),
        });
      }

      const prompt = await storage.createSystemPrompt(validationResult.data);
      res.status(201).json(prompt);
    } catch (error) {
      console.error("Error creating system prompt:", error);
      res.status(500).json({ error: "システムプロンプトの作成に失敗しました" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}

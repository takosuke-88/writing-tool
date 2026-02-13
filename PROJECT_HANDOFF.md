# PROJECT_HANDOFF.md

## 1. プロジェクト概要

このプロジェクトは、AIを活用した**高機能ライティング支援ツール**です。SEO記事の作成、ブログ執筆、さらには占い鑑定文の作成まで、多様なライティングタスクをAIがサポートします。

### 主な機能

- **AIチャット機能**: Claude, Gemini, Perplexity等の最新モデルを切り替えて対話が可能。
- **記事生成ウィザード**: SEO記事、ブログ、占いなど、テンプレートを選択してパラメータを入力するだけで記事を自動生成。
- **Web検索連携**: Perplexity (またはTavily) を用いた「eco_search」「high_precision_search」機能により、最新情報を踏まえた回答が可能。
- **ハイブリッド構成**: 通常のチャットボットUIと、長文生成用の記事作成ツールが統合されています。
- **データ永続化**: 会話履歴や生成した記事はローカルストレージおよびデータベース（開発環境では簡易ストア）に保存されます。

### 技術スタック

- **Frontend**: React (Vite), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js (Express), Drizzle ORM
- **Database**: PostgreSQL (本番), MemStorage (開発/モック)
- **AI Integration**: Anthropic SDK, Google Generative AI SDK, Perplexity API REST

## 2. ディレクトリ構造

```
/
├── api/                # AIチャットロジック (Vercel Serverless Functions互換)
│   └── chat.js         # チャット処理の核心（モデル振り分け、ツール実行、フォーマット整形）
├── client/             # フロントエンド (React)
│   ├── src/
│   │   ├── components/ # UIコンポーネント (ChatArea, Sidebar等)
│   │   ├── pages/      # ページコンポーネント
│   │   ├── lib/        # ユーティリティ (APIクライアント等)
│   │   └── App.tsx     # フロントエンドのエントリーポイント
├── server/             # バックエンド (Express)
│   ├── index.ts        # サーバーエントリーポイント
│   ├── routes.ts       # APIルート定義 (/api/generate-article 等)
│   └── storage.ts      # データアクセス層
├── shared/             # 前後共通の型定義・スキーマ
│   └── schema.ts       # Drizzle ORMスキーマ & Zodバリデーション
└── script/             # ユーティリティスクリプト
    └── build.ts        # ビルドスクリプト
```

- **エントリーポイント (Server)**: `server/index.ts`
- **エントリーポイント (Client)**: `client/src/main.tsx` -> `client/src/App.tsx`

## 3. 環境変数・API設定

`.env` ファイルに以下の変数を設定してください。

### 必須APIキー

- `AI_INTEGRATIONS_ANTHROPIC_API_KEY`: Anthropic (Claude) 用
- `AI_INTEGRATIONS_GOOGLE_API_KEY`: Google (Gemini) 用
- `PERPLEXITY_API_KEY`: Perplexity (検索/推論) 用

### サーバー設定

- `NODE_ENV`: development / production
- `PORT`: 5002 (デフォルト)
- `DATABASE_URL`: PostgreSQL接続URL (設定しない場合はオンメモリで動作)

## 4. セットアップ手順

### インストール

```bash
npm install
```

### 開発サーバー起動

バックエンドとフロントエンドを同時に起動します。

```bash
npm run dev
```

- Frontend: `http://localhost:5174`
- Backend: `http://localhost:5002`

## 5. 現在の課題・未完了タスク

### 課題

1. **チャットフォーマット**: ユーザー独自のフォーマット（署名、区切り線）を強制するため、`api/chat.js` に複雑なロジックが含まれています。モデルが勝手に署名を書こうとする問題をシステムプロンプトで抑制中。
2. **APIルートの混在**: `server/routes.ts` (Express) と `api/chat.js` (Serverless Function形式) が混在しており、ローカルでの動作確認時に特別なルーティングを行っています。
3. **検索機能の安定性**: Perplexity等の外部APIエラー時のフォールバック処理を実装済みですが、完全ではありません。

### 最近の修正

- チャット回答末尾のフォーマットを厳格化（`---` 区切り、`Search Model` / `Model` 表記の統一）。
- `api/chat.js` での改行コード（`\n\n`）修正によるMarkdown表示崩れの解消。

## 6. 重要な設計思想・ルール

### System Instructions

- **場所**: `api/chat.js` (チャット用) および `server/routes.ts` (記事生成用)
- **チャット**: ユーザーの「Role & Goal」設定を最優先し、検索コマンド（`eco_search`等）の出力隠蔽を徹底しています。
- **記事生成**: SEO記事、占い、ブログなど、テンプレートごとに詳細なペルソナ（「ベテランライター」「占い師」等）が定義されています。

### コード規約

- **型安全性**: `shared/schema.ts` で定義した型を前後端で共有し、Zodで厳密にバリデーションする。
- **UIコンポーネント**: shadcn/ui をベースにカスタマイズ。
- **絶対パス**: インポートには `@/` (client/src) や `@shared/` (shared) を使用。

### 特記事項

- **Hybrid Search**: ユーザーの質問内容に応じて、自動的に検索ツール（High Precision / Eco / Standard）を使い分けるロジックが `api/chat.js` に実装されています。

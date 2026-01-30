# Writing Tool - Claude API 記事作成アプリ

Claude API を使用した記事自動生成アプリケーションです。SEO 記事、占い鑑定文、ブログ記事など、様々なスタイルの文章を AI が生成します。

## 🌟 機能

- **記事自動生成**: Claude API (Sonnet 4.5) による高品質な記事作成
- **カスタムプロンプト**: 用途に応じたシステムプロンプトの作成・管理
- **デフォルトテンプレート**: SEO 記事、占い鑑定文、ブログ記事の3つのテンプレート
- **文字数制御**: 指定した文字数以内での記事生成
- **記事管理**: 生成した記事の保存・閲覧・削除

## 🚀 技術スタック

- **フロントエンド**: React + TypeScript + Vite
- **バックエンド**: Vercel Serverless Functions
- **AI**: Claude API (Anthropic)
- **スタイリング**: Tailwind CSS + shadcn/ui
- **データベース**: Drizzle ORM + PostgreSQL

## 📦 セットアップ

### 前提条件

- Node.js 20 以上
- Claude API キー ([console.anthropic.com](https://console.anthropic.com/) から取得)

### ローカル開発

1. **リポジトリのクローン**:

   ```bash
   git clone https://github.com/YOUR_USERNAME/writing-tool.git
   cd writing-tool
   ```

2. **依存関係のインストール**:

   ```bash
   npm install
   ```

3. **環境変数の設定**:

   ```bash
   cp .env.example .env
   ```

   `.env` ファイルを編集して API キーを設定:

   ```env
   AI_INTEGRATIONS_ANTHROPIC_API_KEY=sk-ant-your-api-key-here
   AI_INTEGRATIONS_ANTHROPIC_BASE_URL=https://api.anthropic.com
   PORT=5000
   NODE_ENV=development
   ```

4. **開発サーバーの起動**:

   ```bash
   npm run dev
   ```

   ブラウザで `http://localhost:5000` を開きます。

## 🌐 Vercel へのデプロイ

詳細な手順は [DEPLOYMENT.md](./DEPLOYMENT.md) を参照してください。

### クイックスタート

1. GitHub にリポジトリを Push
2. [Vercel](https://vercel.com) でプロジェクトをインポート
3. 環境変数を設定:
   - `AI_INTEGRATIONS_ANTHROPIC_API_KEY`
   - `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`
   - `NODE_ENV=production`
4. デプロイ

## 📁 プロジェクト構成

```
writing-tool/
├── api/                          # Vercel Serverless Functions
│   ├── generate-article.ts       # 記事生成 API
│   ├── articles/
│   │   ├── index.ts              # 記事一覧取得
│   │   └── [id].ts               # 個別記事操作
│   └── system-prompts/
│       ├── index.ts              # プロンプト一覧・作成
│       └── [id].ts               # 個別プロンプト操作
├── client/                       # フロントエンド
│   ├── src/
│   │   ├── components/           # React コンポーネント
│   │   ├── lib/                  # ユーティリティ
│   │   └── main.tsx              # エントリーポイント
│   └── index.html
├── server/                       # サーバーサイド (ローカル開発用)
│   ├── routes.ts                 # Express ルート
│   ├── storage.ts                # データストレージ
│   └── index.ts                  # サーバーエントリー
├── shared/                       # 共有型定義
│   └── schema.ts                 # Zod スキーマ
├── .env.example                  # 環境変数テンプレート
├── vercel.json                   # Vercel 設定
└── package.json
```

## 🔧 利用可能なスクリプト

- `npm run dev`: 開発サーバーを起動
- `npm run build`: 本番ビルドを作成
- `npm run check`: TypeScript 型チェック
- `npm run db:push`: データベーススキーマを適用

## ⚠️ 注意事項

### データの永続性

現在の構成では、Vercel の Serverless 環境でファイルベースのストレージを使用しています。**再デプロイ時にデータがリセット**されます。

本番環境で永続的なデータ保存が必要な場合は、以下への移行を検討してください:

- Vercel Postgres
- Supabase
- PlanetScale

## 📄 ライセンス

MIT

## 🤝 コントリビューション

プルリクエストを歓迎します。大きな変更の場合は、まず Issue を開いて変更内容を議論してください。

## 📞 サポート

問題が発生した場合は、[Issues](https://github.com/YOUR_USERNAME/writing-tool/issues) で報告してください。

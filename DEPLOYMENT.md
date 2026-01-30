# Vercel デプロイメントガイド

このドキュメントでは、Claude API を使った記事作成アプリを GitHub 経由で Vercel にデプロイする手順を説明します。

## 📋 前提条件

- GitHub アカウント
- Vercel アカウント ([vercel.com](https://vercel.com) で無料登録可能)
- Claude API キー ([console.anthropic.com](https://console.anthropic.com/) から取得)

## 🚀 デプロイ手順

### 1. GitHub リポジトリへの Push

#### 1-1. ローカルで環境変数を設定

まず、ローカル開発用に `.env` ファイルを作成します:

```bash
cp .env.example .env
```

`.env` ファイルを編集して、Claude API キーを設定:

```env
AI_INTEGRATIONS_ANTHROPIC_API_KEY=sk-ant-your-actual-api-key-here
AI_INTEGRATIONS_ANTHROPIC_BASE_URL=https://api.anthropic.com
PORT=5000
NODE_ENV=development
```

> ⚠️ **重要**: `.env` ファイルは `.gitignore` に含まれているため、Git にコミットされません。

#### 1-2. GitHub リポジトリを作成

GitHub で新しいリポジトリを作成します:

1. [github.com](https://github.com) にアクセス
2. 右上の「+」→「New repository」をクリック
3. リポジトリ名を入力 (例: `writing-tool`)
4. 「Create repository」をクリック

#### 1-3. ローカルリポジトリを GitHub に Push

```bash
# Git の初期化 (まだの場合)
git init

# すべてのファイルをステージング
git add .

# コミット
git commit -m "Initial commit: Vercel deployment ready"

# GitHub リポジトリをリモートとして追加
git remote add origin https://github.com/YOUR_USERNAME/writing-tool.git

# Push
git branch -M main
git push -u origin main
```

### 2. Vercel プロジェクトのセットアップ

#### 2-1. Vercel にログイン

1. [vercel.com](https://vercel.com) にアクセス
2. GitHub アカウントでログイン

#### 2-2. 新しいプロジェクトをインポート

1. ダッシュボードで「Add New...」→「Project」をクリック
2. GitHub リポジトリ一覧から `writing-tool` を選択
3. 「Import」をクリック

#### 2-3. プロジェクト設定

**Framework Preset**: `Other` (自動検出されない場合)

**Build & Development Settings**:

- **Build Command**: `npm run build`
- **Output Directory**: `dist/public`
- **Install Command**: `npm install`

**Root Directory**: `.` (デフォルトのまま)

### 3. 環境変数の設定

プロジェクト設定画面で「Environment Variables」セクションに移動し、以下の環境変数を追加:

| Name                                 | Value                             |
| ------------------------------------ | --------------------------------- |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY`  | `sk-ant-your-actual-api-key-here` |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | `https://api.anthropic.com`       |
| `NODE_ENV`                           | `production`                      |

> 💡 **ヒント**: 環境変数は「Production」「Preview」「Development」の3つの環境すべてにチェックを入れることを推奨します。

### 4. デプロイ

1. 「Deploy」ボタンをクリック
2. ビルドプロセスが完了するまで待機 (通常 2-3 分)
3. デプロイが成功すると、本番 URL が表示されます (例: `https://writing-tool.vercel.app`)

## 🔄 継続的デプロイ

GitHub の `main` ブランチに Push すると、Vercel が自動的に再デプロイします:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

## 🧪 デプロイ後の確認

デプロイが完了したら、以下を確認してください:

### ✅ チェックリスト

1. **フロントエンドの表示**: 本番 URL にアクセスして、UI が正しく表示されることを確認
2. **記事生成機能**: プロンプトを入力して、Claude API が正常に動作することを確認
3. **システムプロンプト**: デフォルトテンプレートが表示されることを確認
4. **記事の保存と取得**: 生成した記事が保存され、一覧表示されることを確認

### ⚠️ 注意事項

**データの永続性について**:

現在の構成では、ファイルベースのストレージを使用しています。Vercel の Serverless 環境では、**再デプロイ時にデータがリセット**されます。

本番運用で永続的なデータ保存が必要な場合は、以下のいずれかへの移行を検討してください:

- **Vercel Postgres**: Vercel が提供するマネージド PostgreSQL
- **Supabase**: オープンソースの Firebase 代替
- **PlanetScale**: MySQL 互換のサーバーレスデータベース

## 🐛 トラブルシューティング

### ビルドエラーが発生する場合

1. **ローカルでビルドを確認**:

   ```bash
   npm run build
   ```

2. **型チェックを実行**:

   ```bash
   npm run check
   ```

3. **依存関係を再インストール**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### API が動作しない場合

1. **Vercel ダッシュボードでログを確認**:
   - プロジェクト → 「Deployments」→ 最新のデプロイ → 「Functions」タブ

2. **環境変数が正しく設定されているか確認**:
   - プロジェクト → 「Settings」→ 「Environment Variables」

3. **API キーの有効性を確認**:
   - [console.anthropic.com](https://console.anthropic.com/) で API キーが有効か確認

## 📚 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Claude API Documentation](https://docs.anthropic.com/)

## 🔐 セキュリティのベストプラクティス

1. **API キーを絶対にコミットしない**: `.env` ファイルは `.gitignore` に含まれています
2. **環境変数を使用**: すべての機密情報は Vercel の環境変数で管理
3. **API キーの定期的なローテーション**: セキュリティのため、定期的に API キーを更新
4. **レート制限の設定**: 必要に応じて Claude API の使用量制限を設定

## 💰 コスト管理

- **Vercel**: Hobby プランは無料 (月間 100GB 帯域幅、100GB-Hours の実行時間)
- **Claude API**: 使用量ベースの課金。[料金ページ](https://www.anthropic.com/pricing)で確認

使用量を監視するには:

- **Vercel**: ダッシュボード → 「Usage」
- **Claude API**: [console.anthropic.com](https://console.anthropic.com/) → 「Usage」

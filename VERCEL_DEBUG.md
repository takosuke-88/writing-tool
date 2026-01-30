# Vercel デプロイ後のデバッグガイド

## 🔍 現在の状況

✅ サイトは表示されている  
❓ API 呼び出しが動作しているか不明

## 📝 環境変数の確認

### 使用している環境変数名

現在のコードは以下の環境変数をサポートしています（優先順位順）:

1. **`AI_INTEGRATIONS_ANTHROPIC_API_KEY`** (Replit 形式)
2. **`ANTHROPIC_API_KEY`** (標準形式、推奨)

### Vercel での設定確認手順

1. Vercel ダッシュボードにアクセス
2. プロジェクトを選択
3. **Settings** → **Environment Variables** を開く
4. 以下のいずれかが設定されているか確認:

| 変数名               | 値の例                      | 必須                        |
| -------------------- | --------------------------- | --------------------------- |
| `ANTHROPIC_API_KEY`  | `sk-ant-api03-...`          | ✅ はい                     |
| `ANTHROPIC_BASE_URL` | `https://api.anthropic.com` | ⚠️ 任意（デフォルト値あり） |

または

| 変数名                               | 値の例                      | 必須    |
| ------------------------------------ | --------------------------- | ------- |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY`  | `sk-ant-api03-...`          | ✅ はい |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | `https://api.anthropic.com` | ⚠️ 任意 |

### ⚠️ 重要な注意点

- 環境変数を追加・変更した後は、**必ず再デプロイ**が必要です
- Vercel の環境変数は、デプロイ時にビルドに組み込まれます
- 環境変数の変更は即座には反映されません

## 🐛 デバッグ方法

### 1. Vercel Function Logs を確認

1. Vercel ダッシュボード → プロジェクト
2. **Deployments** タブ → 最新のデプロイをクリック
3. **Functions** タブを開く
4. `api/generate-article` をクリック
5. ログを確認

**確認すべきログ出力**:

```
[API Debug] Environment check: {
  hasApiKey: true,
  apiKeyLength: 108,
  apiKeyPrefix: 'sk-ant-',
  baseURL: 'https://api.anthropic.com',
  nodeEnv: 'production'
}
```

### 2. ブラウザの開発者ツールで確認

1. サイトを開く
2. F12 キーで開発者ツールを開く
3. **Console** タブを確認
4. **Network** タブを開く
5. 記事生成を試す
6. `/api/generate-article` リクエストを確認

**正常な場合**:

- Status: `200 OK`
- Response: JSON with `article`, `characterCount`, etc.

**エラーの場合**:

- Status: `500 Internal Server Error`
- Response: エラーメッセージ

## ❌ よくあるエラーと対策

### エラー 1: 500 エラー - API キーが設定されていない

**症状**:

```json
{
  "error": "API キーが設定されていません",
  "details": "環境変数 ANTHROPIC_API_KEY または AI_INTEGRATIONS_ANTHROPIC_API_KEY を設定してください"
}
```

**原因**:

- Vercel に環境変数が設定されていない
- 環境変数名が間違っている

**対策**:

1. Vercel ダッシュボード → Settings → Environment Variables
2. `ANTHROPIC_API_KEY` を追加（値は `sk-ant-` で始まる API キー）
3. **Redeploy** ボタンをクリックして再デプロイ

---

### エラー 2: 500 エラー - 認証エラー

**症状**:

```json
{
  "error": "記事の生成に失敗しました",
  "details": "authentication_error: Invalid API Key"
}
```

**原因**:

- API キーが無効または期限切れ
- API キーの値が間違っている（スペースや改行が含まれている）

**対策**:

1. [console.anthropic.com](https://console.anthropic.com/) で API キーを確認
2. 必要に応じて新しい API キーを生成
3. Vercel の環境変数を更新（前後のスペースに注意）
4. 再デプロイ

---

### エラー 3: 500 エラー - レート制限

**症状**:

```json
{
  "error": "記事の生成に失敗しました",
  "details": "rate_limit_error: Rate limit exceeded"
}
```

**原因**:

- Claude API の使用量制限に達した
- 短時間に大量のリクエストを送信した

**対策**:

1. [console.anthropic.com](https://console.anthropic.com/) で使用量を確認
2. 数分待ってから再試行
3. 必要に応じてプランをアップグレード

---

### エラー 4: 500 エラー - データベース接続エラー

**症状**:

```json
{
  "error": "記事の生成に失敗しました",
  "details": "connect ECONNREFUSED ..."
}
```

**原因**:

- データベースに接続できない
- データベースの環境変数が設定されていない

**対策**:

1. 現在はファイルベースのストレージを使用しているため、このエラーは発生しにくい
2. もし発生した場合は、`server/db.ts` の設定を確認

---

### エラー 5: CORS エラー

**症状**:
ブラウザのコンソールに以下のようなエラー:

```
Access to fetch at 'https://your-app.vercel.app/api/generate-article'
from origin 'https://your-app.vercel.app' has been blocked by CORS policy
```

**原因**:

- CORS ヘッダーが正しく設定されていない

**対策**:

- 現在のコードには CORS プリフライトの処理が含まれているため、通常は発生しません
- もし発生した場合は、`vercel.json` の `headers` 設定を確認

---

## 🧪 テスト手順

### 1. 簡単なテスト

1. サイトにアクセス
2. プロンプト入力欄に「テスト」と入力
3. 文字数を「100」に設定
4. 「生成」ボタンをクリック
5. 結果を確認

**期待される動作**:

- 数秒〜数十秒で記事が生成される
- 生成された記事が表示される
- 文字数が表示される

### 2. ログの確認

Vercel Function Logs で以下のログが表示されることを確認:

```
[API Debug] Environment check: { hasApiKey: true, ... }
[API] Calling Claude API...
[API] Claude API response received
```

### 3. エラーが発生した場合

1. ブラウザの開発者ツールでエラーメッセージを確認
2. Vercel Function Logs で詳細なエラーを確認
3. このドキュメントの「よくあるエラーと対策」を参照

---

## 🔧 環境変数の設定方法（詳細）

### Vercel ダッシュボードでの設定

1. [vercel.com](https://vercel.com) にログイン
2. プロジェクトを選択
3. **Settings** タブをクリック
4. 左サイドバーから **Environment Variables** を選択
5. **Add New** をクリック
6. 以下を入力:
   - **Name**: `ANTHROPIC_API_KEY`
   - **Value**: `sk-ant-api03-...` (実際の API キー)
   - **Environment**: `Production`, `Preview`, `Development` すべてにチェック
7. **Save** をクリック
8. **Deployments** タブに戻る
9. 最新のデプロイの右側にある **...** メニューをクリック
10. **Redeploy** を選択

### Vercel CLI での設定（オプション）

```bash
# Vercel CLI をインストール
npm i -g vercel

# ログイン
vercel login

# 環境変数を設定
vercel env add ANTHROPIC_API_KEY

# プロンプトに従って API キーを入力
# 環境を選択: Production, Preview, Development

# 再デプロイ
vercel --prod
```

---

## 📊 デバッグチェックリスト

- [ ] Vercel に環境変数 `ANTHROPIC_API_KEY` が設定されている
- [ ] 環境変数の値が `sk-ant-` で始まっている
- [ ] 環境変数設定後に再デプロイした
- [ ] Vercel Function Logs で `[API Debug]` ログが表示される
- [ ] `hasApiKey: true` と表示される
- [ ] ブラウザの開発者ツールで Network タブを確認した
- [ ] `/api/generate-article` のレスポンスを確認した

---

## 🆘 それでも解決しない場合

1. **Vercel Function Logs の全文をコピー**
2. **ブラウザの開発者ツールの Network タブのレスポンスをコピー**
3. **環境変数の設定状況を確認**（値は伏せて、設定されているかどうかのみ）
4. これらの情報を提供してください

---

## 🎯 デバッグコードの削除（本番運用時）

デバッグが完了したら、以下のコードを削除することを推奨します:

`api/generate-article.ts` の 7-15 行目:

```typescript
console.log("[API Debug] Environment check:", {
  hasApiKey: !!apiKey,
  apiKeyLength: apiKey?.length || 0,
  apiKeyPrefix: apiKey?.substring(0, 7) || "none",
  baseURL: baseURL,
  nodeEnv: process.env.NODE_ENV,
});
```

ただし、エラーログ（`console.error`）は残しておくことを推奨します。

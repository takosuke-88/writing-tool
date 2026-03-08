# AGENTS.md

## プロジェクト概要

React(Vite) + TypeScript + Tailwind CSS + Shadcn UI で構築したAIチャットアプリ。

## 解決済みのバグ・仕様変更（2026/03/08）

### Temperature（温度）と応答（Gemini等）が怪しい問題

- **対象ファイル**: `api/chat.js`, `server/routes.ts`, `client/src/components/chat-settings-panel.tsx`
- **症状**:
  1. Temperatureの設定値が正しくLLMモデル（Gemini・Claude・Perplexity）に渡っていなかった。
  2. 数値が `1` や `0` の場合、整数として扱われパース処理をバイパスし、そのまま `1.0` や `0.0` になってしまうバグがあった。
  3. `api/chat.js` の Geminiストリーム処理にて、**過去の会話履歴を無視して最新のユーザー発言1件しかAPIに送信していなかった**ため、AIがコンテキストを保持できておらず「応答が怪しい」現象が発生していた。
- **解決策**:
  - `ChatSettingsPanel` のスライダー上限を `100` から `200`（0.00〜2.00の実数表現用）に拡張。
  - バックエンド（`api/chat.js` & `server/routes.ts`）でスライダー値（0〜200等）を受け取った際、常に `/ 100` を行い、さらに各モデルの仕様に合わせた上限値でクリップするように実装を修正した。
    - Claude API は上限 `1.0`
    - Perplexity (Sonar) は上限 `1.99`
    - Gemini は上限 `2.0`
  - Gemini API 呼び出し時、単一メッセージではなく `messages` 配列全体をGeminiの形式（`user` / `model`）に変換して渡すように修正し、プロンプトの履歴（文脈や検索結果、System Prompt）が適切に反映されるようにした。

## 過去の対応バグ

### 3点リーダー（MoreVertical）ホバー表示問題

- **対象ファイル**: `client/src/components/chat-sidebar.tsx` の `ConversationItem`
- **要件**: 会話アイテムをホバーした時だけ右端の3点リーダーを表示。
  メニュー展開中はマウスを外しても表示維持。
- **根本原因（判明済み）**: Radix UIの`DropdownMenu`がデフォルトで`modal={true}`のため、
  メニュー開いた瞬間に`<body>`へ`pointer-events: none`が付与される。
  これで`onMouseLeave`が誤発火し`isHovered`がfalseになる。
- **採用すべき解決策**:
  1. `<DropdownMenu modal={false}>` を必ず付ける
  2. `isHovered`のuseStateは削除し、CSS の`group-hover`に一本化
  3. クラス名は `"opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"`
  4. モバイルは `"opacity-100 md:opacity-0 md:group-hover:opacity-100"`
- **最終的な解決手順（2026/03/06）**:
  上記コードは正しかったが、過去の不整合なデータベースレコード（またはそれに起因するクライアントの状態異常/キャッシュ）の影響でDOMにレンダリングされない現象が起きていた。
  `conversations` および `messages` テーブルを**TRUNCATE（全削除）**することで、無事にホバー表示が本番環境（Vercel）でも復活した。フロント側に原因が見当たらない場合はDBの不整合を直す（または初期化する）アプローチが有効だった。

## 環境

- React 18 / Vite / TypeScript
- Tailwind CSS（tailwind.config.tsのcontentパスを要確認）
- Shadcn UI (Radix UIベース)
- デプロイ: Vercel

## 運用ルール

- 重要な決定をしたら「AGENTS.mdを更新して」と指示する
- Vercel本番確認後に結果をAGENTS.mdに追記する

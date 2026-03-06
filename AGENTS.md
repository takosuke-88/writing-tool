# AGENTS.md

## プロジェクト概要

React(Vite) + TypeScript + Tailwind CSS + Shadcn UI で構築したAIチャットアプリ。

## 現在対応中のバグ

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

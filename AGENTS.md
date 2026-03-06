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
- **現状**: 上記を試したが本番（Vercel）でまだ不安定。
  Tailwindの`content`パスのパージ問題も疑っている。

## 環境

- React 18 / Vite / TypeScript
- Tailwind CSS（tailwind.config.tsのcontentパスを要確認）
- Shadcn UI (Radix UIベース)
- デプロイ: Vercel

## 運用ルール

- 重要な決定をしたら「AGENTS.mdを更新して」と指示する
- Vercel本番確認後に結果をAGENTS.mdに追記する

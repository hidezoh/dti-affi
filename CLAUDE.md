# dti-affi — Claude Code ガイド

**回答は必ず日本語で行う**

## 技術スタック
Hono 4 (SSR) + Cloudflare Pages/Workers, TypeScript 5, Tailwind CSS v4, Meilisearch Cloud, CSV処理 (csv-parse)

## 必須コマンド
| コマンド | 用途 |
|---------|------|
| `npm run lint` | Oxlint によるリント |
| `npm run format` | Biome によるフォーマット |
| `npm test` | Vitest によるテスト実行 |
| `npx tsc --noEmit` | TypeScript 型チェック |
| `npm run build` | CSS ビルド + Wrangler ドライラン |

## ワークフロー
1. **Plan** — 要件理解、既存コード確認
2. **Implement** — 型定義 → lib → ルート → コンポーネント → テスト
3. **Verify** — `npm run lint && npx tsc --noEmit && npm test && npm run build`

## 品質ゲート（Stop Hook で自動実行）
`npm run lint && npx tsc --noEmit && npm test`

## 詳細ドキュメント
- [コード品質要件](docs/claude/coding-standards.md)
- [Hono SSR 開発ルール](docs/claude/hono-ssr-guide.md)
- [Meilisearch / D1 ガイド](docs/claude/meilisearch-guide.md)
- [ワークフロー・Git・Issue管理](docs/claude/workflow.md)
- [コードレビュー観点](docs/claude/review-checklist.md)
- [実行環境ガイド](docs/claude/environment.md)
- [MCP・スキル活用](docs/claude/skills.md)

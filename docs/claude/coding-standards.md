# コード品質要件

## TypeScript
- 型安全性を重視し、`any`型の使用は最小限に留める
- 適切な型定義を実装

## Hono JSX
- Hono JSX（React互換）でコンポーネントを実装
- サーバーサイドでの完全レンダリング（クライアントJSは最小限）
- 非同期処理では`async/await`を適切に使用

## エラーハンドリング
- 適切なエラーハンドリングを実装する
- ユーザーフレンドリーなエラーメッセージ

## コメント
- コメントは日本語で記述
- 実装の意図を明確にする

## テスト
- 新機能実装時は対応するテストコードも必ず作成する

## デバッグ
- デバッグ用コードは `console.log` を使用
- 本番では削除または条件付きで実行

## 環境変数
- ローカル開発: `.env` の使用
- デプロイ: Cloudflare Pages / Workers の環境変数設定
- 必要な環境変数: `MEILISEARCH_HOST`, `MEILISEARCH_SEARCH_API_KEY`, `MEILISEARCH_ADMIN_API_KEY`

## Pre-commit Hook（Lefthook）
- コミット前に `lefthook.yml` の内容を把握すること
- `biome check`（import順序整理＋lint）と `biome format`（整形のみ）は別物
- **コミット前は `npx @biomejs/biome check --write src/` で修正する**（`npm run format` だけでは不十分）

## 外部SDKの型定義確認
- 外部ライブラリのコンストラクタオプション等を推測で書かない
- `node_modules/<pkg>/dist/types/` の型定義ファイルを先に確認する
- 例: Meilisearch SDK の `Config` 型には `timeout` プロパティがある（`requestConfig` は存在しない）

## 実装完了時のチェックリスト
1. `npx @biomejs/biome check --write src/` でフォーマット＋import順序を修正
2. `npm run lint` でエラー・警告がないことを確認
3. `npm run build` でビルドが成功することを確認
4. 不要なインポートやデバッグコードの削除
5. 実装内容の動作確認

# dti-affi

アフィリエイト管理アプリケーション。Hono SSR + Cloudflare Pages で構築。

## 技術スタック

- **Hono** — SSR フレームワーク（hono/jsx）
- **Cloudflare Pages / Workers** — ホスティング・エッジ実行
- **Meilisearch Cloud** — 全文検索エンジン（日本語形態素解析対応）
- **TypeScript 5**
- **Tailwind CSS v4**

## セットアップ

```bash
npm install
cp .env.example .env
```

`.env` に以下の環境変数を設定:

```
MEILISEARCH_HOST=https://ms-xxxxx.meilisearch.io
MEILISEARCH_ADMIN_API_KEY=<管理用APIキー>
MEILISEARCH_SEARCH_API_KEY=<検索用APIキー>
```

### Meilisearch の初期化

```bash
# インデックス作成・設定
npm run meilisearch:setup

# CSVデータの投入
npm run meilisearch:sync
```

`data/` ディレクトリにCSVファイルを配置してから `meilisearch:sync` を実行してください。

## 開発

```bash
npm run dev
```

Wrangler の開発サーバーが起動します（デフォルト: http://localhost:8787）。

## ビルド・デプロイ

```bash
# ビルド（Tailwind CSS + Wrangler dry-run）
npm run build

# Cloudflare Pages にデプロイ
npm run deploy
```

本番環境の環境変数は Cloudflare ダッシュボードで設定してください。

## プロジェクト構成

```
src/
  index.tsx          # Hono エントリポイント（SSR ルーティング）
  components/        # JSX コンポーネント
  lib/               # Meilisearch クライアント等
  styles/            # Tailwind CSS 入力ファイル
  types/             # 型定義
scripts/
  setup-meilisearch.ts    # インデックス初期化
  sync-to-meilisearch.ts  # CSV → Meilisearch データ投入
public/              # 静的ファイル
data/                # CSV データファイル
```

## npm scripts

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | ビルド |
| `npm run deploy` | Cloudflare Pages デプロイ |
| `npm run lint` | ESLint 実行 |
| `npm run meilisearch:setup` | Meilisearch インデックス初期化 |
| `npm run meilisearch:sync` | CSV データを Meilisearch に同期 |

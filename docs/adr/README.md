# Architecture Decision Records (ADR)

技術的意思決定を [Michael Nygard 形式](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) で記録する。

## 運用ルール

- ADRは**不変（immutable）** — 決定を覆す場合は新しいADRで「Supersedes ADR-XXXX」と記載
- Status: `Accepted` / `Superseded` / `Deprecated`
- ファイル名: `NNNN-<slug>.md`（例: `0001-hono-ssr-cloudflare-pages.md`）

## テンプレート

[template.md](./template.md)

## インデックス

| # | タイトル | Status | 日付 |
|---|---------|--------|------|
| 0001 | [Hono SSR + Cloudflare Pages採用](./0001-hono-ssr-cloudflare-pages.md) | Accepted | 2025-01 |
| 0002 | [Meilisearch Cloud採用](./0002-meilisearch-over-alternatives.md) | Accepted | 2025-02 |
| 0003 | [Oxlint + Biome採用](./0003-oxlint-biome-over-eslint-prettier.md) | Accepted | 2026-03 |
| 0004 | [Vitest採用](./0004-vitest-for-testing.md) | Accepted | 2026-03 |

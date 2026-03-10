# ADR-0003: Oxlint + Biome 採用（ESLint + Prettier 置換）

## Status

Accepted

## Context

[Harness Engineering Best Practices 2026](https://nyosegawa.github.io/posts/harness-engineering-best-practices-2026/) に基づき、PostToolUse hookでのリアルタイムリント実行を実現するため、高速なリンター/フォーマッターが必要。

ESLintは重すぎてhookでの毎回実行は体感ペナルティが大きい。

## Decision

ESLint + Prettier を Oxlint + Biome に置き換える。

- **Oxlint**: Rust製で50-100倍高速なリンター
- **Biome**: Prettier互換のフォーマッター（Rust製）

## Consequences

**メリット:**
- PostToolUse hookで毎回のファイル編集時にリント/フォーマット実行が現実的に
- CI/CDのリントステップも高速化
- 設定がシンプル（`.oxlintrc.json`, `biome.json`）

**デメリット:**
- Oxlintのルールセットがtypescript-eslintと完全互換でない
- ESLintプラグインエコシステムが利用不可
- Biomeは一部のPrettierオプションに未対応

関連Issue: #37

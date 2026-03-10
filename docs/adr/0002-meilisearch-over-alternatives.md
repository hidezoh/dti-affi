# ADR-0002: Meilisearch Cloud 採用

## Status

Accepted

## Context

動画コンテンツの全文検索（日本語形態素解析対応）が必要。候補を評価した。

- **Groonga on Lightsail**: 高い日本語対応力だが、インフラ管理コストが高い（詳細: [lightsail-groonga-evaluation.md](../lightsail-groonga-evaluation.md)）
- **Elasticsearch**: 高機能だが、運用コスト・複雑性が高い
- **Meilisearch Cloud**: マネージドサービス、日本語トークナイザー対応、RESTful API

## Decision

Meilisearch Cloud（Build Plan）を採用する。

- 日本語形態素解析に対応（v1.6以降のCJKトークナイザー）
- マネージドサービスでインフラ管理不要
- SDKが充実（JavaScript/TypeScript）
- CSVバッチ投入に適したAPI設計

## Consequences

**メリット:**
- インフラ管理ゼロ（Groonga/Lightsailと比較）
- 高速な検索レスポンス（typo-tolerant）
- シンプルなSDK統合

**デメリット:**
- Build Planの容量制限あり
- Groongaほどの日本語検索精度は得られない可能性
- ベンダーロックイン（ただしOSSなので自前ホスティング可能）

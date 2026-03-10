# ADR-0004: Vitest 採用

## Status

Accepted

## Context

テストフレームワークの選定。プロジェクトは `"type": "module"`（ESModules）で構成されており、Cloudflare Workers との統合テストも将来的に必要。

候補: Jest, Vitest, Node.js test runner

## Decision

Vitest を採用する。

- ESModulesネイティブ対応（Jestの設定地獄を回避）
- Jest互換APIで移行コストが最小（import文の変更のみ）
- `@cloudflare/vitest-pool-workers` による将来的なWorkers統合テスト対応
- Vite/esbuildベースで高速実行

## Consequences

**メリット:**
- ESM/CJSの互換性問題を回避
- Jest互換なので学習コストゼロ
- Workers環境でのテスト実行が将来対応可能
- 高速（Viteのモジュール変換を活用）

**デメリット:**
- Jestほどのエコシステム成熟度はない
- 一部のJest固有プラグインが使えない

関連Issue: #38

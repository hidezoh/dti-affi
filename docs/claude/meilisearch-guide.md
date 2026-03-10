# Meilisearch / Cloudflare D1 ガイド

## 実装前の確認事項

- **Meilisearchインデックス確認**: `npx tsx scripts/setup-meilisearch.ts` でインデックス設定を確認
- **データ同期**: `npx tsx scripts/sync-to-meilisearch.ts` でCSVデータをMeilisearchに投入
- **D1スキーマ確認**: Wrangler CLIまたはCloudflareダッシュボードで確認
- データ分析時は既存のデータ構造を理解してから実装を開始

## Serena MCPの活用

### 実装前の必須ステップ
1. **プロジェクト分析**: `mcp__serena__onboarding` を実行し、プロジェクトの全体構造を理解する
2. **コンテキスト把握**: `mcp__serena__read_file` を使用して正確なコンテキストを取得
3. **パターン検索**: `mcp__serena__search_for_pattern` でセマンティックな検索を実行
4. **構造理解**: `mcp__serena__list_dir` でプロジェクト構造を把握

### 高度な分析
- **影響範囲分析**: コード変更の依存関係を特定
- **非推奨関数検出**: プロジェクト全体での使用箇所を確認
- **一貫性チェック**: 既存パターンとの整合性を確認
- **脆弱性検出**: 危険なパターンの使用箇所を特定

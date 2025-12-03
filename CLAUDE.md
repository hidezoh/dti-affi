# Claude Code プロジェクトガイド

このドキュメントは、dti-affiプロジェクトにおけるClaude Codeの動作と開発ガイドラインを定義します。

## 📚 プロジェクト概要

**プロジェクト名**: dti-affi
**技術スタック**:
- Next.js 16.0.6 (App Router)
- React 19.2.0
- TypeScript 5
- Tailwind CSS v4
- SQLite3 (better-sqlite3)
- CSV処理 (csv-parse)

**プロジェクトの目的**: アフィリエイト管理アプリケーション

---

## 🌐 基本設定

### 言語とコミュニケーション
- **回答は必ず日本語で行う**
- 説明はわかりやすい表現で具体的に記述する
- 実装時は段階的にタスクを分解し、進捗を明確にする

---

## 🔧 Serena MCPの活用

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

---

## 🛠️ 実装前の必須チェック

### 品質チェック
1. `npm run lint` を実行し、既存のエラーを確認
2. エラーがある場合は先に修正してから新しい実装を開始
3. 実装後も `npm run lint` で品質を確認

### データベースの確認
- **スキーマ確認**: `sqlite3 data.db ".schema"` でテーブル構造を確認
- **データ確認**: `sqlite3 data.db "SELECT * FROM テーブル名 LIMIT 10;"` でサンプルデータを表示
- **テーブル一覧**: `sqlite3 data.db ".tables"` で全テーブルを確認
- データ分析時は既存のデータ構造を理解してから実装を開始
- 新規テーブル作成時は既存スキーマとの整合性を保つ

---

## 📋 Next.js 16開発ルール

### 実装順序
Next.js 16アプリケーションの実装時は以下の順序で作業する：

1. **依存関係の確認・追加** (`package.json`)
2. **型定義の実装** (`types/`, `interfaces/`)
3. **サーバーサイドAPIの実装** (`app/api/`)
4. **コンポーネントの実装** (`components/`)
5. **ページの実装** (`app/`)
6. **ユーティリティ関数の実装** (`lib/`, `utils/`)
7. **設定の調整** (`next.config.ts`)
8. **テストコードの作成**
9. **統合とテスト実行**

### ベストプラクティス
- **App Router**: 必ず使用する
- **Server Components**: デフォルトとし、必要な場合のみClient Componentsを使用
- **データフェッチング**: Server Componentsで行う
- **スタイリング**: Tailwind CSSを活用
- **SEO**: メタデータの設定を考慮

---

## ✅ コード品質要件

### TypeScript
- 型安全性を重視し、`any`型の使用は最小限に留める
- 適切な型定義を実装

### React
- Server ComponentsとClient Componentsを適切に使い分ける
- リアクティブなデータは`useState`、`useEffect`を適切に使用
- 非同期処理では`async/await`を適切に使用

### エラーハンドリング
- 適切なエラーハンドリングを実装する
- ユーザーフレンドリーなエラーメッセージ

### コメント
- コメントは日本語で記述
- 実装の意図を明確にする

---

## 🗄️ アフィリエイト管理アプリケーション固有の考慮事項

### データベース
- SQLite3データベースとの連携を適切に実装
- 新規テーブル作成時は既存スキーマとの整合性を保つ
- マイグレーションスクリプトは慎重に設計

### データ処理
- CSVデータのインポート処理の最適化
- データ分析とレポート生成の実装
- パフォーマンスを考慮した実装

### UI/UX
- レスポンシブデザインの実装
- ユーザビリティの向上

---

## 🎯 実装時のベストプラクティス

### テスト
- 新機能実装時は対応するテストコードも必ず作成する

### デバッグ
- デバッグ用コードは `console.log` を使用
- 本番では削除または条件付きで実行

### 環境変数
- 環境変数の適切な管理
- `.env.local` の使用

---

## ✔️ 実装完了時のチェックリスト

1. ✅ `npm run lint` でエラー・警告がないことを確認
2. ✅ `npm run build` でビルドが成功することを確認
3. ✅ 不要なインポートやデバッグコードの削除
4. ✅ 実装内容の動作確認

---

## 🔀 プルリクエスト実装時の特別な考慮事項

### ブランチワークフロー
1. プルリクエストのソースブランチを特定・チェックアウト
2. そのブランチで実装作業を実行
3. 実装完了後、プッシュ前に必ず以下を実行：
   - `git fetch origin` で最新の状態を取得
   - `git status` で現在の状態を確認
   - リモートに新しい変更がある場合は `git pull origin <ブランチ名>` を実行
4. 同じブランチにコミット・プッシュ
5. プッシュエラーが発生した場合は `git push --force-with-lease` を使用
6. これによりプルリクエストが自動的に更新される

### 実装時の注意
- 既存コードへの影響を最小限に抑える
- 破壊的変更がある場合は事前に警告する
- 段階的なコミットで変更履歴を明確にする
- 実装完了後は必ず動作テストの結果を報告する

---

## 📝 Issue管理・サブタスク作成

### Issue作成の手順
コメントでサブタスクIssue作成を依頼された場合：

1. `mcp__github__create_issue` でサブタスクIssueを作成
2. 適切なタイトルと詳細な説明を設定
3. 親タスク（元のIssueやPR）への参照を含める
4. 適切なラベルやアサインを設定
5. 作成したIssue番号を返信で報告

### Issue作成時の必須項目
- **明確で具体的なタイトル**
- **実装内容の詳細説明**
- **受け入れ条件（Acceptance Criteria）**
- **関連Issue/PRへの参照リンク**
- **適切な優先度ラベル**

### サブタスクの分類例
- `enhancement`: 新機能追加
- `bug`: バグ修正
- `documentation`: ドキュメント更新
- `testing`: テスト関連
- `refactor`: リファクタリング

### ラベルの推奨
- タイプ: `bug`, `enhancement`, `documentation`, `refactor`
- 優先度: `critical`, `high`, `medium`, `low`

---

## 🚨 エラー対応

### 一般的なエラー対応
- ビルドエラーや実行時エラーが発生した場合は、詳細な原因分析を行う
- 解決策を複数提示し、最適な方法を推奨する
- 必要に応じて関連ドキュメントや参考リンクも提供する

### Issue作成エラー対応手順
1. 権限エラーの場合は `mcp__github__create_issue` を使用
2. ネットワークエラーの場合は再試行
3. バリデーションエラーの場合は入力内容を修正

### Gitプッシュエラー対応手順
1. エラーメッセージを確認し、原因を特定
2. `git fetch origin` で最新状態を取得
3. `git status` で競合状況を確認
4. 必要に応じて `git pull origin <ブランチ名>` で最新変更をマージ
5. 競合が発生した場合は適切に解決
6. 再度コミット・プッシュを実行
7. 安全が確認できれば `--force-with-lease` オプションを使用

---

## 🔍 コードレビュー観点

### 1. プロセス管理の観点
- このPRは設計書や要件定義に基づいているか
- 重要な技術的意思決定がある場合、その理由は明確か
- 変更の影響範囲は適切に考慮されているか

### 2. 技術品質の観点
- コード品質とベストプラクティスの遵守
- 潜在的なバグや問題点の特定
- パフォーマンスに関する考慮事項
- セキュリティ上の懸念事項
- テストカバレッジと品質

### 3. アーキテクチャの観点
- Next.js 16のベストプラクティスに従っているか
- App Routerの適切な使用
- Server ComponentsとClient Componentsの適切な使い分け
- TypeScriptの型安全性の確保
- Tailwind CSSの適切な活用
- 既存のコードスタイルと一貫性があるか

### 4. 個人開発における注意点
- 実装が先行しすぎていないか（設計の考慮は十分か）
- 将来の拡張性を考慮しているか
- 技術的負債を生んでいないか

### 5. Next.js 16/React/TypeScript固有の観点
- Server ComponentsとClient Componentsの適切な使い分け
- TypeScriptの型定義が適切か
- Reactフックの適切な使用
- 適切なエラーハンドリングがされているか
- SSR/SSGの考慮事項

### 6. アフィリエイト管理アプリケーション固有の観点
- SQLite3データベースとの連携が適切か
- CSVデータ処理の実装が適切か
- データ分析機能の実装が適切か
- パフォーマンスの考慮
- ユーザビリティの向上

### 7. データベース変更のレビュー観点
データベース関連の変更がある場合は、以下を確認：
- `sqlite3 data.db ".schema"` でスキーマを確認
- `sqlite3 data.db ".tables"` でテーブル一覧を確認
- マイグレーションスクリプトの妥当性
- 既存データとの互換性
- インデックスの適切な設定
- 外部キー制約の整合性

---

## 🛠️ MCPツールの使用方法

### GitHub Issue関連
- **Issue作成**: `mcp__github__create_issue`
  - `title`: 必須、明確で具体的なタイトル
  - `body`: 詳細な説明、受け入れ条件、関連リンク
  - `labels`: 適切なラベル
  - `assignees`: 担当者の指定（必要に応じて）

- **Issue更新**: `mcp__github__update_issue`
  - `issue_number`: 更新対象のIssue番号
  - 更新内容の指定

- **Issue一覧**: `mcp__github__list_issues`
  - 既存Issueの確認
  - 重複チェック

- **Issue詳細**: `mcp__github__get_issue`
  - 特定Issueの詳細取得
  - 関連情報の確認

### Serena MCP関連
- **プロジェクト分析**: `mcp__serena__onboarding`
  - プロジェクトの全体構造と技術スタックを理解
  - 実装開始前の必須ステップ

- **ファイル読み取り**: `mcp__serena__read_file`
  - 特定ファイルの内容を正確に取得
  - コンテキストを理解した上での実装

- **セマンティック検索**: `mcp__serena__search_for_pattern`
  - コードパターンや関数の使用箇所を特定
  - 依存関係の影響範囲を分析

- **ディレクトリ一覧**: `mcp__serena__list_dir`
  - プロジェクト構造の把握
  - 適切なファイル配置の確認

---

## 📚 参考資料

### プロジェクト内のドキュメント
- [README.md](./README.md) - プロジェクト概要
- [.github/workflows/claude.yml](./.github/workflows/claude.yml) - Claude Code設定
- [.github/workflows/claude-code-review.yml](./.github/workflows/claude-code-review.yml) - レビュー設定

### 技術スタックドキュメント
- [Next.js 16 Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [better-sqlite3 Documentation](https://github.com/WiseLibs/better-sqlite3)

---

**最終更新**: 2025年12月3日

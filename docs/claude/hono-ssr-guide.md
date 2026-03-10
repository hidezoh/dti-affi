# Hono SSR 開発ルール

## 実装順序

Hono SSRアプリケーションの実装時は以下の順序で作業する：

1. **依存関係の確認・追加** (`package.json`)
2. **型定義の実装** (`src/types/`)
3. **Meilisearchクライアント・ユーティリティの実装** (`src/lib/`)
4. **ルートの実装** (`src/index.tsx`)
5. **コンポーネントの実装** (`src/components/`)
6. **テストコードの作成**
7. **統合とテスト実行**

## ベストプラクティス

- **Hono SSR**: Cloudflare Workers上でサーバーサイドレンダリング
- **データフェッチング**: Honoルートハンドラ内でMeilisearch SDKを使用
- **スタイリング**: Tailwind CSSを活用
- **SEO**: SSRによるHTML返却で検索エンジンクローラビリティを確保
- **ルーティング**: Honoのルーティング機能を使用（`src/index.tsx`）
- **環境変数**: Cloudflare Worker Bindings（`c.env`）経由で取得

## アフィリエイト管理固有の考慮事項

### データベース・検索エンジン
- Meilisearch Cloudを検索・動画データの取得に使用
- Cloudflare D1をクリックログ等の永続データに使用
- Meilisearchインデックス設定の変更は `scripts/setup-meilisearch.ts` で管理

### データ処理
- CSVデータのインポート処理の最適化
- データ分析とレポート生成の実装
- パフォーマンスを考慮した実装

### UI/UX
- レスポンシブデザインの実装
- ユーザビリティの向上

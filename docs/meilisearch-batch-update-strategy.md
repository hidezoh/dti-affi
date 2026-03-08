# Meilisearch + Cloudflare構成でのバッチ処理戦略

**関連Issue**: [#6 D案（アフィリエイトリダイレクト）のインフラコスト最適化](https://github.com/hidezoh/dti-affi/issues/6)

---

## 📋 現在のバッチ処理

**現在の構成**:
```
CSV files → ingest-data.js → SQLite (data.db)
```

**処理内容**:
- `data/`ディレクトリ内のCSVファイルを読み込み
- 119,176件の動画データをSQLiteに`INSERT OR REPLACE`
- ローカル環境で実行

---

## 🔄 Meilisearch + Cloudflare構成でのデータ更新戦略

### アーキテクチャ概要

```
[CSV files]
    ↓
[ローカル/CI環境]
    ↓
┌─────────────────────────────────────┐
│   バッチ処理スクリプト                    │
├─────────────────────────────────────┤
│ 1. CSVパース                          │
│ 2. データ変換・検証                      │
│ 3. Meilisearch API呼び出し             │
│ 4. Cloudflare D1更新（オプション）        │
└─────────────────────────────────────┘
    ↓                    ↓
[Meilisearch Cloud]  [Cloudflare D1]
  (検索インデックス)      (メタデータ)
```

---

## ✅ 可能な実装アプローチ

### 方法1: ローカル環境からのバッチ更新（推奨）

**最もシンプルで現在の運用に近い方法**

#### 実装例

```javascript
// scripts/sync-to-meilisearch.js
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { MeiliSearch } from 'meilisearch';

// Meilisearch接続設定
const client = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST, // 'https://ms-xxxxx.meilisearch.io'
  apiKey: process.env.MEILISEARCH_ADMIN_API_KEY
});

const INDEX_NAME = 'videos';

async function syncToMeilisearch() {
  const DATA_DIR = path.join(process.cwd(), 'data');
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.csv'));

  console.log(`Found ${files.length} CSV files.`);

  // インデックス取得または作成
  const index = client.index(INDEX_NAME);

  let allDocuments = [];

  // 全CSVファイルからデータを読み込み
  for (const file of files) {
    console.log(`Processing ${file}...`);
    const content = fs.readFileSync(path.join(DATA_DIR, file));
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true
    });

    for (const record of records) {
      if (!record.movie_id) continue;

      // Meilisearch用にドキュメント整形
      allDocuments.push({
        id: record.movie_id, // プライマリキー
        site_id: record.site_id,
        site_name: record.site_name,
        title: record.title,
        actress: record.actress,
        description: record.description,
        release_date: record.release_date,
        sample_url: record.sample_url,
        aff_link: record.aff_link,
        original_id: record.original_id,
        sample_movie_url_2: record.sample_movie_url_2,
        provider_name: record.provider_name
      });
    }
  }

  console.log(`Total documents to sync: ${allDocuments.length}`);

  // バッチ更新（最大1000件ずつ推奨）
  const BATCH_SIZE = 1000;
  for (let i = 0; i < allDocuments.length; i += BATCH_SIZE) {
    const batch = allDocuments.slice(i, i + BATCH_SIZE);
    console.log(`Syncing batch ${i / BATCH_SIZE + 1}...`);

    // addDocumentsOrReplace: 既存IDは更新、新規IDは追加
    const task = await index.addDocumentsOrReplace(batch);
    console.log(`Task enqueued: ${task.taskUid}`);
  }

  console.log('Sync complete! Waiting for indexing...');
}

syncToMeilisearch().catch(console.error);
```

#### package.jsonにスクリプト追加

```json
{
  "scripts": {
    "sync:meilisearch": "node scripts/sync-to-meilisearch.js"
  },
  "dependencies": {
    "meilisearch": "^0.35.0"
  }
}
```

#### 実行方法

```bash
# 環境変数設定
export MEILISEARCH_HOST="https://ms-xxxxx.meilisearch.io"
export MEILISEARCH_ADMIN_API_KEY="your-admin-api-key"

# バッチ実行
npm run sync:meilisearch
```

**メリット**:
- ✅ 現在のingest-data.jsと同様の運用
- ✅ CSVファイルを直接読み込める
- ✅ 実装がシンプル
- ✅ ローカル開発環境で即座に実行可能

**デメリット**:
- ⚠️ ローカル環境からの実行が必要
- ⚠️ ネットワーク経由でのアップロード（119,176件で数分）

---

### 方法2: GitHub Actionsでの自動化

**CSVファイルのコミット時に自動的にMeilisearchを更新**

#### GitHub Actions設定例

```yaml
# .github/workflows/sync-meilisearch.yml
name: Sync Meilisearch

on:
  push:
    paths:
      - 'data/*.csv'
    branches:
      - main
  workflow_dispatch: # 手動実行も可能

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          lfs: true # CSVファイルがLFS管理の場合

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Sync to Meilisearch
        env:
          MEILISEARCH_HOST: ${{ secrets.MEILISEARCH_HOST }}
          MEILISEARCH_ADMIN_API_KEY: ${{ secrets.MEILISEARCH_ADMIN_API_KEY }}
        run: npm run sync:meilisearch

      - name: Notify completion
        run: echo "Meilisearch sync completed!"
```

**メリット**:
- ✅ 完全自動化
- ✅ CSVコミット時に自動更新
- ✅ 実行ログがGitHub Actionsで確認可能
- ✅ 手動実行も可能（workflow_dispatch）

**デメリット**:
- ⚠️ GitHub Actionsの実行時間制限（無料プランで月2,000分）

---

### 方法3: Cloudflare Workers Cronでの定期更新（Honoアプリ内）

**Honoアプリのscheduledハンドラとして定期的にMeilisearchを更新**

#### Cloudflare Workers Cron実装例

```typescript
// Honoアプリのexportにscheduledハンドラを追加
// src/index.tsx
export default {
  fetch: app.fetch, // Honoアプリのfetchハンドラ
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // 1. R2からCSVファイルを取得（事前にアップロード済み）
    const csvFiles = await env.R2_BUCKET.list({ prefix: 'data/' });

    const allDocuments = [];

    for (const file of csvFiles.objects) {
      const csvContent = await env.R2_BUCKET.get(file.key);
      const text = await csvContent?.text();

      // CSVパース処理
      const records = parseCSV(text);
      allDocuments.push(...records);
    }

    // 2. Meilisearchに同期
    const response = await fetch(
      `${env.MEILISEARCH_HOST}/indexes/videos/documents`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.MEILISEARCH_ADMIN_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(allDocuments),
      }
    );

    console.log(`Sync completed: ${response.status}`);
  },
};
```

#### wrangler.tomlでスケジュール設定

```toml
[triggers]
crons = ["0 2 * * *"] # 毎日午前2時に実行
```

**メリット**:
- ✅ 完全サーバーレス
- ✅ 定期的な自動更新
- ✅ Cloudflareエコシステム内で完結

**デメリット**:
- ⚠️ CSVファイルを事前にR2にアップロードする必要がある
- ⚠️ Workers実行時間制限（CPU time）

---

## 🎯 推奨アプローチ

### Phase 1: ローカルバッチ処理（即座導入）

**現在の運用との互換性を保ちながら移行**

1. **データ投入フロー**:
   ```
   DTI Cashからダウンロード
   → data/ディレクトリに配置
   → npm run sync:meilisearch（ローカル実行）
   → Meilisearch Cloudに反映
   ```

2. **実装タスク**:
   - ✅ `scripts/sync-to-meilisearch.js`の作成
   - ✅ `meilisearch` npmパッケージのインストール
   - ✅ 環境変数設定（`.env.local`）
   - ✅ 初回データ投入（119,176件）

3. **データ更新頻度**:
   - 月1回程度の手動実行で十分（現在のCSV更新頻度に依存）

### Phase 2: GitHub Actions自動化（運用安定後）

**CSVコミット時の自動同期**

1. **ワークフロー追加**:
   - `.github/workflows/sync-meilisearch.yml`作成
   - GitHub Secretsに認証情報を設定

2. **運用フロー**:
   ```
   CSVダウンロード
   → Gitにコミット
   → GitHub Actions自動実行
   → Meilisearch自動更新
   ```

---

## 🔧 Cloudflare D1との併用（オプション）

**メタデータの二重管理戦略**

### データ配置戦略

| データ種別 | Meilisearch | Cloudflare D1 |
|-----------|-------------|---------------|
| **全文検索用** | ✅ 全フィールド | - |
| **メタデータ** | ✅ 検索対象 | ✅ バックアップ |
| **お気に入り** | - | ✅ ユーザーデータ |
| **アクセスログ** | - | ✅ 統計用 |

### バッチ処理での同期

```javascript
async function syncBoth() {
  // 1. Meilisearchに同期
  await syncToMeilisearch(documents);

  // 2. Cloudflare D1にも同期（オプション）
  await syncToCloudflareD1(documents);
}
```

**メリット**:
- ✅ Meilisearchダウン時のフォールバック
- ✅ D1で統計処理やユーザーデータ管理

**デメリット**:
- ⚠️ データの二重管理
- ⚠️ 同期処理の複雑化

---

## 💰 コスト影響

### Meilisearch Cloud料金

**Build Plan ($30/月)**:
- ドキュメント数: 最大100万件（119,176件は余裕）
- 検索リクエスト: 日量10万件
- **バッチ更新**: 無制限（APIコール数に含まれない）

### バッチ更新の実行コスト

| 実行環境 | コスト | 実行時間 |
|---------|--------|---------|
| **ローカル実行** | ¥0 | 3-5分（119,176件） |
| **GitHub Actions** | ¥0（無料枠内） | 5-10分 |
| **Cloudflare Workers** | ¥0（無料枠内） | 1-3分 |

**結論**: バッチ処理による追加コストは**ほぼゼロ**

---

## 📊 パフォーマンス比較

| 項目 | 現在（SQLite） | Meilisearch |
|------|--------------|-------------|
| **データ投入方法** | INSERT OR REPLACE | addDocumentsOrReplace |
| **バッチサイズ** | トランザクション | 1000件/バッチ |
| **投入時間（119,176件）** | 数秒 | 3-5分 |
| **インデックス構築** | 手動（CREATE INDEX） | 自動 |
| **検索パフォーマンス** | 2-8秒（未最適化） | 約50ms |

---

## ✅ 実装チェックリスト

### Phase 1: 基本バッチ処理

- [ ] Meilisearch Cloudアカウント作成
- [ ] `meilisearch` npmパッケージインストール
- [ ] `scripts/sync-to-meilisearch.js`作成
- [ ] 環境変数設定（`.env.local`に追加）
- [ ] インデックス設定（日本語形態素解析）
- [ ] 初回データ投入テスト
- [ ] 全データ投入（119,176件）
- [ ] 検索機能の動作確認

### Phase 2: GitHub Actions自動化（オプション）

- [ ] `.github/workflows/sync-meilisearch.yml`作成
- [ ] GitHub Secretsに認証情報設定
- [ ] CSVコミットでのトリガーテスト
- [ ] 手動実行（workflow_dispatch）テスト

---

## 🎯 結論

**Meilisearch + Cloudflare構成でも、現在と同様のバッチ処理によるデータ更新は完全に可能です。**

### 推奨実装

1. **短期（Phase 1）**: ローカル実行のバッチスクリプト
   - `npm run sync:meilisearch`で手動実行
   - 現在の運用フローを維持

2. **中期（Phase 2）**: GitHub Actions自動化
   - CSVコミット時の自動同期
   - 完全自動化による運用効率化

**追加コスト**: ほぼゼロ（Meilisearch Cloud料金に含まれる）
**実装工数**: 1-2日（基本バッチ処理）

---

**作成日**: 2025年12月5日
**更新日**: 2026年3月8日（Hono SSR構成への変更を反映）
**関連ドキュメント**: [Issue #6検討経緯まとめ](./issue-6-discussion-summary.md)

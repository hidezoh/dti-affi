# Issue #6 実装ロードマップ：アフィリエイトリダイレクト機能強化

**Issue**: [#6 インフラコスト最適化・スケーラビリティ対策：D案（アフィリエイトリダイレクト機能強化）実装計画](https://github.com/hidezoh/dti-affi/issues/6)  
**作成日**: 2026年3月2日  
**ステータス**: Phase 1 実装待ち  

---

## 📋 実装プランの概要

Issue #6の検討結果を受け、段階的なインフラ移行とリダイレクト機能強化の実装計画を定めます。

### 🎯 基本戦略

```
Phase 1: 緊急対応（現在の性能問題解決）
         ↓
Phase 2: Meilisearch + Cloudflare移行（検索品質向上）
         ↓  
Phase 3: 高性能・高可用性対応（事業拡大対応）
```

### 🚨 現在の重要課題

**検索性能の致命的問題**:
- 現在の応答時間: **2-8秒**（LIKE検索、119,000件データ）
- Vercelタイムアウト: 10秒制限
- ユーザー離脱率: 高（検索体験の悪化）

**技術的制約**:
- ❌ SQLite: Vercel環境で利用不可
- ❌ better-sqlite3: 本番環境で動作しない
- ✅ 外部DB/検索サービス: 必須

---

## 🗺️ 段階的実装計画

### Phase 1: 緊急対応（即座実装）

#### **目標**
- 現在の2-8秒検索を緊急改善
- コスト: ¥0（無料範囲内）
- 期間: 1-2週間

#### **実装アプローチ**
**現状維持 + 最小限の最適化**

```typescript
// 実装例: 検索結果キャッシュによる高速化
const searchCache = new Map();

export async function searchVideosWithCache(query: string, limit = 20): Promise<Video[]> {
  const cacheKey = `${query}:${limit}`;
  
  // キャッシュからの取得
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }
  
  // 既存のLIKE検索（タイムアウト対策）
  try {
    const results = await Promise.race([
      searchVideos(query, limit),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Search timeout')), 5000)
      )
    ]);
    
    // 結果をキャッシュ（5分間）
    searchCache.set(cacheKey, results);
    setTimeout(() => searchCache.delete(cacheKey), 300000);
    
    return results;
  } catch (error) {
    // タイムアウト時は部分結果を返す
    return searchVideosPartial(query, Math.min(limit, 5));
  }
}
```

#### **実装タスク**
- [ ] 検索結果キャッシュ機能
- [ ] タイムアウト対策
- [ ] 部分結果表示機能
- [ ] エラーハンドリング強化

**期待効果**:
- ✅ 頻繁な検索の高速化（キャッシュヒット時）
- ✅ タイムアウトエラーの回避
- ✅ コスト: ¥0

### Phase 2: Meilisearch + Cloudflare移行（推奨実装）

#### **目標**
- 検索品質とパフォーマンスの根本的改善
- 応答時間: **50ms以内**
- 日本語検索精度: **良好**
- コスト: 約**¥5,000/月**

#### **アーキテクチャ設計**

```
[ユーザー] → [Cloudflare Pages] → [Cloudflare Workers]
                                       ↓
              [Meilisearch Cloud] ← [検索API Worker]
                    ↕
              [Cloudflare D1] ← [データ管理Worker]
                    ↕
              [Cloudflare KV] ← [キャッシュWorker]
```

#### **データベース設計（Cloudflare D1）**

```sql
-- 動画メタデータテーブル
CREATE TABLE videos (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  site_name TEXT NOT NULL,
  title TEXT NOT NULL,
  actress TEXT,
  description TEXT,
  release_date TEXT,
  sample_url TEXT,
  aff_link TEXT NOT NULL,
  original_id TEXT,
  sample_movie_url_2 TEXT,
  provider_name TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- クリックログテーブル（リダイレクト機能用）
CREATE TABLE click_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id TEXT NOT NULL,
  site_id TEXT,
  clicked_at TEXT NOT NULL DEFAULT (datetime('now')),
  user_agent TEXT,
  referer TEXT,
  ip_hash TEXT,
  FOREIGN KEY (video_id) REFERENCES videos(id)
);

-- ユーザーテーブル（お気に入り機能用）
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  provider TEXT,  -- 'google', 'line', 'twitter'
  provider_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- お気に入りテーブル
CREATE TABLE user_favorites (
  user_id INTEGER,
  video_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, video_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (video_id) REFERENCES videos(id)
);

-- インデックス作成
CREATE INDEX idx_videos_title ON videos(title);
CREATE INDEX idx_videos_actress ON videos(actress);
CREATE INDEX idx_videos_site ON videos(site_id);
CREATE INDEX idx_videos_release_date ON videos(release_date);
CREATE INDEX idx_click_logs_video_id ON click_logs(video_id);
CREATE INDEX idx_click_logs_clicked_at ON click_logs(clicked_at);
```

#### **Meilisearch設定**

```json
{
  "settings": {
    "languages": ["japanese"],
    "searchableAttributes": [
      "title",
      "actress", 
      "description",
      "site_name",
      "provider_name"
    ],
    "displayedAttributes": [
      "id",
      "title",
      "actress",
      "description", 
      "site_name",
      "aff_link",
      "sample_url",
      "release_date"
    ],
    "filterableAttributes": [
      "site_id",
      "actress",
      "site_name", 
      "provider_name",
      "release_date"
    ],
    "sortableAttributes": [
      "release_date",
      "title"
    ],
    "rankingRules": [
      "words",
      "typo", 
      "proximity",
      "attribute",
      "exactness",
      "release_date:desc"
    ],
    "synonyms": {
      "アダルト": ["エロ", "成人向け"],
      "動画": ["ビデオ", "映像", "コンテンツ"],
      "女優": ["アイドル", "モデル", "パフォーマー"]
    }
  }
}
```

#### **実装タスク**

**1. インフラ構築（1週間）**
- [ ] Cloudflareアカウント・プロジェクト作成
- [ ] Meilisearch Cloudアカウント・インスタンス作成
- [ ] Cloudflare D1データベース作成
- [ ] Cloudflare Workers開発環境構築

**2. データ移行（3-4日）**
- [ ] SQLiteデータエクスポート（119,000件）
- [ ] Cloudflare D1へのデータインポート
- [ ] Meilisearchへの検索データ投入
- [ ] データ整合性確認

**3. 検索API実装（1週間）**
```typescript
// 検索Worker実装例
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    // Meilisearch検索
    const searchResults = await fetch(`${env.MEILISEARCH_HOST}/indexes/videos/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.MEILISEARCH_KEY}`
      },
      body: JSON.stringify({
        q: query,
        limit,
        attributesToRetrieve: [
          'id', 'title', 'actress', 'site_name', 'aff_link', 'sample_url'
        ]
      })
    });
    
    const results = await searchResults.json();
    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

**4. リダイレクト機能実装（3-4日）**
```typescript
// リダイレクトWorker実装例
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const videoId = url.pathname.split('/').pop();
    
    // D1から動画情報取得
    const { results } = await env.DB.prepare(
      'SELECT aff_link FROM videos WHERE id = ?'
    ).bind(videoId).all();
    
    if (results.length === 0) {
      return new Response('Video not found', { status: 404 });
    }
    
    // クリックログ記録（非同期）
    await env.DB.prepare(`
      INSERT INTO click_logs (video_id, user_agent, referer, ip_hash)
      VALUES (?, ?, ?, ?)
    `).bind(
      videoId,
      request.headers.get('User-Agent'),
      request.headers.get('Referer'),
      await hashIP(request.headers.get('CF-Connecting-IP'))
    ).run();
    
    // リダイレクト実行
    return Response.redirect(results[0].aff_link, 302);
  }
};
```

**5. フロントエンド統合（3-4日）**
- [ ] Next.js → Cloudflare Pages移行
- [ ] 検索APIとの統合
- [ ] リダイレクト機能の統合
- [ ] レスポンシブデザイン対応

**6. ソーシャルログイン実装（1週間）**
- [ ] LINE Login実装
- [ ] Google OAuth実装  
- [ ] Twitter OAuth実装
- [ ] お気に入り機能実装

#### **マイグレーション戦略**

**段階的移行（Zero Downtime）**:
1. **検索API先行移行**: Meilisearch検索を並行稼働
2. **A/Bテスト**: 新検索と既存検索の比較
3. **段階的切り替え**: ユーザーごとに新検索に移行
4. **完全移行**: 既存システム停止

### Phase 3: 高性能・高可用性対応（将来実装）

#### **目標**
- 月間100万PV対応
- 99.99%の可用性
- コスト効率の最適化

#### **拡張計画**
- Algoliaへの移行（最高品質の検索）
- マルチリージョンデプロイ
- 高度な分析・レポート機能
- 音声検索機能
- リアルタイムレコメンデーション

---

## 💰 コスト管理計画

### Phase 1: 無料運用継続
- Vercel Hobby: ¥0
- 既存SQLite: ¥0
- **合計**: **¥0/月**

### Phase 2: Meilisearch + Cloudflare
- Meilisearch Cloud (Build): ¥4,350/月
- Cloudflare Workers: ¥0（無料枠内）
- Cloudflare Pages: ¥0
- Cloudflare D1/KV/R2: ¥0（無料枠内）
- **合計**: **約¥5,000/月**

### Phase 3: 高性能化
- Algolia Pro: ¥15,000-25,000/月
- または Meilisearch拡張: ¥8,000-15,000/月
- **合計**: **¥15,000-25,000/月**

---

## 📊 パフォーマンス目標

### 現在（Phase 0）
- 検索応答時間: 2-8秒 ❌
- 同時ユーザー: 1-2人 ❌  
- 日本語検索精度: 60-70% ⚠️
- 可用性: 99.9% ✅

### Phase 1目標
- 検索応答時間: 1-3秒 ⚠️（キャッシュヒット時）
- 同時ユーザー: 3-5人 ⚠️
- 日本語検索精度: 60-70% ⚠️
- 可用性: 99.9% ✅

### Phase 2目標  
- 検索応答時間: **50ms以内** ✅
- 同時ユーザー: **100人以上** ✅
- 日本語検索精度: **良好** ✅（形態素解析）
- 可用性: **99.99%** ✅

### Phase 3目標
- 検索応答時間: **10-20ms** ✅
- 同時ユーザー: **1000人以上** ✅
- 日本語検索精度: **95%** ✅
- 可用性: **99.99%** ✅

---

## ⚠️ リスク管理

### 技術的リスク

**Phase 1**:
- リスク: キャッシュ効果の限定性
- 対策: Phase 2への早期移行準備

**Phase 2**:  
- リスク: Meilisearch Cloudの依存
- 対策: バックアップ検索システムの準備
- リスク: データ移行時の整合性
- 対策: 段階的移行とロールバック計画

**Phase 3**:
- リスク: 高額なインフラコスト
- 対策: 収益ベースの段階的拡張

### ビジネスリスク

**収益との連動**:
- Phase 1→2移行条件: 月間収益¥10,000以上
- Phase 2→3移行条件: 月間収益¥30,000以上

**ユーザー体験の保証**:
- 移行時のダウンタイム最小化
- 検索品質の継続的改善
- フィードバック収集と対応

---

## 🎯 成功指標（KPI）

### ユーザー体験指標
- **検索応答時間**: Phase 2で50ms以内
- **検索精度**: ユーザー満足度調査で80%以上
- **コンバージョン率**: クリック率15%以上維持

### 技術指標  
- **可用性**: 99.99%以上
- **エラー率**: 0.1%以下
- **検索スループット**: 秒間100クエリ以上

### ビジネス指標
- **コスト効率**: 売上に対するインフラコスト20%以下  
- **スケール効率**: ユーザー数増加に対する線形コスト増加
- **ROI**: Phase 2投資回収期間6ヶ月以内

---

## 📅 実装スケジュール

### Phase 1: 緊急対応（2週間）
```
Week 1: 検索キャッシュ実装
Week 2: タイムアウト対策・テスト
```

### Phase 2: Meilisearch移行（6-8週間）
```
Week 1-2: インフラ構築・データ移行
Week 3-4: 検索API実装・統合
Week 5-6: フロントエンド移行・テスト
Week 7-8: ソーシャルログイン・本番リリース
```

### Phase 3: 高性能化（将来）
```
収益目標達成後に実施（6ヶ月後目安）
```

---

## 🔧 開発・運用体制

### 必要スキルセット
- **フロントエンド**: Next.js → Cloudflare Pages移行
- **バックエンド**: Cloudflare Workers, D1, Meilisearch API
- **DevOps**: Cloudflare環境構築、デプロイ自動化
- **データベース**: SQLite → D1移行、Meilisearch設定

### 品質保証
- **テスト**: 検索精度テスト、負荷テスト、統合テスト
- **監視**: Cloudflare Analytics, Meilisearch監視
- **アラート**: エラー率、応答時間、可用性

---

## 📚 関連ドキュメント

- [Issue #6 検討経緯まとめ](./issue-6-discussion-summary.md)
- [アフィリエイトリダイレクト機能 要件定義書](./requirements/affiliate-redirect-requirements.md)
- [データ分析戦略](./requirements/data-analysis-strategy.md)
- [Meilisearch バッチ更新戦略](./meilisearch-batch-update-strategy.md)

---

**作成者**: Claude Code  
**最終更新**: 2026年3月2日  
**ステータス**: 実装準備完了  
**次のアクション**: Phase 1緊急対応の開始
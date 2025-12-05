# アフィリエイトリダイレクト機能 要件定義書

## 1. 概要

### 1.1 目的
本機能は、サイト訪問者をアフィリエイトサイトへ効果的に誘導し、クリック数を追跡・分析することで、アフィリエイト収益の最大化を図る。

### 1.2 背景
現在の実装では、動画詳細ページから直接アフィリエイトリンク（`aff_link`）へ遷移しているが、以下の課題がある：
- クリック数の追跡ができない
- どの動画・サイトからの誘導が効果的か分析できない
- 直接リンクのため、アフィリエイトリンクの変更に柔軟に対応できない

### 1.3 スコープ
| 項目 | 範囲 |
|------|------|
| 対象サイト | DTI Cashアフィリエイト（19サイト） |
| 対象ユーザー | サイト訪問者全員 |
| 対象ページ | 動画詳細ページ、検索結果、トップページ |

---

## 2. 機能要件

### 2.1 データ取得処理

#### 2.1.1 動画データ取得
| 機能ID | FR-001 |
|--------|--------|
| 機能名 | 動画一覧取得 |
| 説明 | 新着動画を指定件数取得する |
| 入力 | limit: number（デフォルト: 24） |
| 出力 | Video[]（動画配列） |
| 備考 | 既存の`getLatestVideos()`を使用 |

| 機能ID | FR-002 |
|--------|--------|
| 機能名 | 動画詳細取得 |
| 説明 | IDを指定して動画詳細を取得する |
| 入力 | id: string |
| 出力 | Video \| undefined |
| 備考 | 既存の`getVideoById()`を使用 |

| 機能ID | FR-003 |
|--------|--------|
| 機能名 | 動画検索 |
| 説明 | キーワードで動画を検索する |
| 入力 | query: string, limit: number |
| 出力 | Video[]（検索結果） |
| 備考 | タイトル・女優名で検索 |

#### 2.1.2 クリック統計取得（新規）
| 機能ID | FR-004 |
|--------|--------|
| 機能名 | クリック統計取得 |
| 説明 | 動画別・サイト別のクリック数を取得する |
| 入力 | period: 'day' \| 'week' \| 'month' \| 'all' |
| 出力 | ClickStats[] |
| 備考 | 新規実装が必要 |

### 2.2 データ表示機能

#### 2.2.1 動画一覧表示
| 機能ID | FR-010 |
|--------|--------|
| 機能名 | トップページ動画表示 |
| 説明 | 新着動画をグリッド形式で表示する |
| 表示項目 | サムネイル、タイトル、女優名、公開日 |
| レイアウト | レスポンシブグリッド（1→2→3→4列） |
| 備考 | 既存の`VideoCard`コンポーネントを使用 |

#### 2.2.2 動画詳細表示
| 機能ID | FR-011 |
|--------|--------|
| 機能名 | 動画詳細ページ表示 |
| 説明 | 選択した動画の詳細情報を表示する |
| 表示項目 | タイトル、女優名、説明、公開日、サンプル動画、サイト名 |
| CTAボタン | 「今すぐ見る」ボタン（アフィリエイトリンク） |
| 備考 | 既存の`/video/[id]/page.tsx`を拡張 |

#### 2.2.3 検索結果表示
| 機能ID | FR-012 |
|--------|--------|
| 機能名 | 検索結果表示 |
| 説明 | 検索キーワードにマッチした動画を表示する |
| 表示項目 | 検索キーワード、件数、動画一覧 |
| 備考 | 既存実装を使用 |

### 2.3 アフィリエイトリダイレクト機能（新規）

#### 2.3.1 リダイレクトAPI
| 機能ID | FR-020 |
|--------|--------|
| 機能名 | アフィリエイトリダイレクト |
| 説明 | 内部リンクからアフィリエイトサイトへリダイレクトする |
| エンドポイント | `/api/redirect/[videoId]` |
| HTTPメソッド | GET |
| 処理フロー | 1. videoIdから動画情報取得<br>2. クリックログ記録<br>3. aff_linkへ302リダイレクト |
| レスポンス | 302 Redirect |

#### 2.3.2 クリックログ記録
| 機能ID | FR-021 |
|--------|--------|
| 機能名 | クリックログ記録 |
| 説明 | アフィリエイトリンククリック時にログを記録する |
| 記録項目 | video_id, site_id, clicked_at, user_agent, referer, ip_hash |
| 備考 | 個人を特定できる情報は保存しない（IPはハッシュ化） |

#### 2.3.3 クリック統計API
| 機能ID | FR-022 |
|--------|--------|
| 機能名 | クリック統計API |
| 説明 | クリック統計データを取得するAPI |
| エンドポイント | `/api/stats/clicks` |
| クエリパラメータ | period, site_id, group_by |
| レスポンス | JSON形式の統計データ |

---

## 3. 非機能要件

### 3.1 パフォーマンス
| 項目 | 要件 |
|------|------|
| ページ読み込み時間 | 3秒以内（初回表示） |
| リダイレクト応答時間 | 100ms以内 |
| 検索応答時間 | 500ms以内 |
| 同時接続数 | 100リクエスト/秒 |

### 3.2 セキュリティ
| 項目 | 要件 |
|------|------|
| 個人情報 | IPアドレスはハッシュ化して保存 |
| リダイレクトURL | データベースに登録されたURLのみ許可 |
| SQLインジェクション | プリペアドステートメント使用 |
| XSS | 出力エスケープ処理 |

### 3.3 可用性
| 項目 | 要件 |
|------|------|
| 稼働率 | 99%以上 |
| データバックアップ | 日次（SQLiteファイル） |

### 3.4 ユーザビリティ
| 項目 | 要件 |
|------|------|
| レスポンシブ対応 | モバイル・タブレット・デスクトップ |
| アクセシビリティ | WCAG 2.1 Level A準拠 |

---

## 4. データ設計

### 4.1 既存テーブル: videos
```sql
-- 既存スキーマ（変更なし）
CREATE TABLE videos (
  id TEXT PRIMARY KEY,
  site_id TEXT,
  site_name TEXT,
  title TEXT,
  actress TEXT,
  description TEXT,
  release_date TEXT,
  sample_url TEXT,
  aff_link TEXT,
  original_id TEXT,
  sample_movie_url_2 TEXT,
  provider_name TEXT
);
```

### 4.2 新規テーブル: click_logs
```sql
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

-- インデックス
CREATE INDEX idx_click_logs_video_id ON click_logs(video_id);
CREATE INDEX idx_click_logs_site_id ON click_logs(site_id);
CREATE INDEX idx_click_logs_clicked_at ON click_logs(clicked_at);
```

### 4.3 ビュー: click_stats_daily
```sql
CREATE VIEW click_stats_daily AS
SELECT
  date(clicked_at) as date,
  video_id,
  site_id,
  COUNT(*) as click_count
FROM click_logs
GROUP BY date(clicked_at), video_id, site_id;
```

---

## 5. API設計

### 5.1 リダイレクトAPI

#### エンドポイント
```
GET /api/redirect/[videoId]
```

#### リクエスト例
```
GET /api/redirect/abc123
```

#### レスポンス
```http
HTTP/1.1 302 Found
Location: https://affiliate-site.com/path?param=value
```

#### エラーレスポンス
```json
{
  "error": "Video not found",
  "code": "VIDEO_NOT_FOUND"
}
```

### 5.2 クリック統計API

#### エンドポイント
```
GET /api/stats/clicks
```

#### クエリパラメータ
| パラメータ | 型 | 説明 | デフォルト |
|-----------|-----|------|-----------|
| period | string | 集計期間（day/week/month/all） | week |
| site_id | string | サイトIDでフィルタ | - |
| group_by | string | グループ化項目（video/site/date） | date |

#### レスポンス例
```json
{
  "period": "week",
  "total_clicks": 1234,
  "data": [
    {
      "date": "2025-12-03",
      "click_count": 156,
      "top_videos": [
        { "video_id": "abc123", "title": "...", "clicks": 45 }
      ]
    }
  ]
}
```

---

## 6. 画面設計

### 6.1 動画詳細ページ（変更箇所）

#### CTAボタン変更
```
変更前: href={video.aff_link}
変更後: href={/api/redirect/${video.id}}
```

#### 追加表示項目
- クリック数（任意）
- 人気度インジケーター（任意）

### 6.2 管理ダッシュボード（将来拡張）
- 日別クリック数グラフ
- サイト別クリック数
- 人気動画ランキング

---

## 7. 実装計画

### Phase 1: 基盤実装
1. `click_logs`テーブル作成
2. リダイレクトAPI実装（`/api/redirect/[videoId]`）
3. 動画詳細ページのCTAリンク変更

### Phase 2: 統計機能
1. クリック統計API実装
2. `click_stats_daily`ビュー作成
3. 統計データ取得関数実装

### Phase 3: UI拡張（将来）
1. 管理ダッシュボード
2. 人気動画表示
3. レコメンデーション機能

---

## 8. 受け入れ条件

### 8.1 リダイレクト機能
- [ ] `/api/redirect/[videoId]`でアフィリエイトサイトにリダイレクトされる
- [ ] 存在しないvideoIdの場合、適切なエラーレスポンスが返る
- [ ] リダイレクト時にクリックログが記録される
- [ ] リダイレクト応答時間が100ms以内

### 8.2 クリックログ
- [ ] video_id, site_id, clicked_at, user_agent, referer, ip_hashが記録される
- [ ] IPアドレスは生値でなくハッシュ化されている
- [ ] インデックスが適切に設定されている

### 8.3 統計API
- [ ] 日別・週別・月別の統計が取得できる
- [ ] サイト別でフィルタリングできる
- [ ] 動画別・サイト別・日別でグループ化できる

### 8.4 UI
- [ ] 動画詳細ページのCTAがリダイレクトAPIを経由する
- [ ] ユーザー体験に悪影響がない（リダイレクト遅延なし）

---

## 9. 用語定義

| 用語 | 説明 |
|------|------|
| DTI Cash | アフィリエイトプラットフォーム |
| aff_link | アフィリエイトリンク（各動画の購入ページURL） |
| CTA | Call To Action（行動喚起ボタン） |
| click_logs | クリックログテーブル |

---

## 10. 参考資料

- [広告素材取得マニュアル](/docs/ad-tips.md)
- [データ管理ガイド](/data/README.md)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

## 改訂履歴

| バージョン | 日付 | 変更内容 | 担当 |
|-----------|------|---------|------|
| 1.0 | 2025-12-03 | 初版作成 | Claude |

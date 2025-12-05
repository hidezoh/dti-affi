# ドキュメント

このディレクトリには、プロジェクトのドキュメントを格納しています。

## ドキュメント一覧

### [ad-tips.md](./ad-tips.md)

広告素材取得マニュアル（マークダウン版）

**内容**：
- 19サイトの広告素材（画像ZIP・動画埋め込みコード）取得方法
- URLパターン変換ルール
- サイト別の詳細手順

**原本**: [data/裏技(Ad tips).pdf](../data/裏技(Ad%20tips).pdf)

**関連Issue**: [#3 広告素材取得機能の実装](https://github.com/hidezoh/dti-affi/issues/3)

---

### [issue-6-discussion-summary.md](./issue-6-discussion-summary.md)

検索インフラ検討の経緯まとめ

**内容**：
- Issue #6における検索インフラの技術検討プロセス
- LIKE検索からSQLite FTS5、Convex、Meilisearch + Cloudflareまでの評価経緯
- 日本語全文検索の課題と各ソリューションの比較
- コスト・性能・日本語対応の観点での分析結果

**データ規模**: 119,176件の動画レコード、138MB SQLiteデータベース

**関連Issue**: [#6 D案（アフィリエイトリダイレクト）のインフラコスト最適化](https://github.com/hidezoh/dti-affi/issues/6)

---

## ドキュメント管理方針

- **マークダウン形式**: 通常のGit管理（LFS使用なし）
- **原本資料**: PDFなど大容量ファイルは`data/`ディレクトリでLFS管理
- **バージョン管理**: Gitで履歴を追跡可能

## 関連ディレクトリ

- [/](../): プロジェクトルート
- [data/](../data/): データファイル（CSV、DB、PDF原本）
- [src/](../src/): ソースコード

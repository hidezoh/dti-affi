# データ管理について

## 概要

このディレクトリには、DTI Affiliateアプリケーションで使用する各種データファイルを格納しています。
大容量ファイルはGit LFS (Large File Storage)で管理されています。

## Git LFS管理ファイル

以下のファイルはGit LFSで管理され、リポジトリクローン時はポインタのみダウンロードされます：

- **data.db** (約137MB): SQLiteデータベース本体
  - アフィリエイトデータの集計・分析用データ
  - テーブル構成: `/Users/katouhideyuki/development/dti-affi/CLAUDE.md`参照

- **\*.csv** (合計約123MB): CSVデータファイル群
  - DTI Cashからダウンロードしたアフィリエイトレポート
  - インポート処理で`data.db`に取り込まれる

- **\*.pdf** (約2.7MB): 参考資料・マニュアル原本
  - `裏技(Ad tips).pdf`: 広告素材取得マニュアル原本
  - マークダウン版は`docs/ad-tips.md`を参照

## 初回セットアップ

リポジトリをクローンした後、LFSファイルをダウンロードします：

```bash
# Git LFSがインストールされていない場合
brew install git-lfs  # macOS
# または apt-get install git-lfs  # Linux

# LFSファイルをダウンロード
git lfs pull
```

## データファイルの更新

データファイルを更新した場合は、通常のGit操作で管理できます：

```bash
# ファイルを追加
git add data/

# コミット
git commit -m "update: data files"

# プッシュ（LFSファイルも自動的にアップロード）
git push
```

## データベース操作

SQLiteデータベースの確認・操作コマンド：

```bash
# テーブル一覧
sqlite3 data.db ".tables"

# スキーマ確認
sqlite3 data.db ".schema"

# サンプルデータ確認
sqlite3 data.db "SELECT * FROM テーブル名 LIMIT 10;"

# SQLファイル実行
sqlite3 data.db < script.sql
```

## ストレージ容量

GitHub LFSの無料枠：
- ストレージ: 1GB
- 帯域幅: 1GB/月

現在の使用状況：
- 約268MB (data.db + CSV + PDF)

## 注意事項

- **本番データ**: このディレクトリのデータは本番データです
- **個人情報**: アフィリエイトデータには収益情報が含まれるため、外部共有時は注意
- **バックアップ**: 重要なデータは定期的にバックアップを推奨
- **LFS制限**: 大量のデータ追加時はLFS容量に注意

## 開発時のヒント

### データベースのバックアップ

```bash
# バックアップ作成
cp data.db data.db.backup

# 特定時点に復元
git checkout <commit-hash> -- data.db
git lfs pull
```

### CSVインポート

アプリケーションのCSVインポート機能を使用：

1. DTI Cashからレポートをダウンロード
2. `data/`ディレクトリに配置
3. アプリケーションのインポート機能で取り込み

## 関連ドキュメント

- [CLAUDE.md](/CLAUDE.md): プロジェクト全体のガイド
- [広告素材取得マニュアル](../docs/ad-tips.md): 19サイトの広告素材取得方法
- [GitHub Issue #3](https://github.com/hidezoh/dti-affi/issues/3): 広告素材取得機能の実装計画

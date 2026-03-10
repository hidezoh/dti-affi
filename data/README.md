# データ管理について

## 概要

このディレクトリには、DTI Affiliateアプリケーションで使用する各種データファイルを格納しています。
大容量ファイルはGit LFS (Large File Storage)で管理されています。

## Git LFS管理ファイル

以下のファイルはGit LFSで管理され、リポジトリクローン時はポインタのみダウンロードされます：

- **\*.csv** (合計約123MB): CSVデータファイル群
  - DTI Cashからダウンロードしたアフィリエイトレポート
  - `npm run meilisearch:sync` でMeilisearch Cloudに投入される

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

## Meilisearch データ投入

CSVデータをMeilisearch Cloudに投入する手順：

```bash
# インデックス設定の初期化
npm run meilisearch:setup

# CSVデータの投入
npm run meilisearch:sync
```

## ストレージ容量

GitHub LFSの無料枠：
- ストレージ: 1GB
- 帯域幅: 1GB/月

現在の使用状況：
- 約126MB (CSV + PDF)

## 注意事項

- **本番データ**: このディレクトリのデータは本番データです
- **個人情報**: アフィリエイトデータには収益情報が含まれるため、外部共有時は注意
- **バックアップ**: 重要なデータは定期的にバックアップを推奨
- **LFS制限**: 大量のデータ追加時はLFS容量に注意

## CSVインポート

1. DTI Cashからレポートをダウンロード
2. `data/`ディレクトリに配置
3. `npm run meilisearch:sync` でMeilisearchに投入

## 関連ドキュメント

- [CLAUDE.md](/CLAUDE.md): プロジェクト全体のガイド
- [広告素材取得マニュアル](../docs/ad-tips.md): 19サイトの広告素材取得方法
- [GitHub Issue #3](https://github.com/hidezoh/dti-affi/issues/3): 広告素材取得機能の実装計画

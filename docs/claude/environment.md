# 実行環境の認知と対応

## 環境の判別方法

Claude Codeは3つの異なる環境で実行される。各環境の特性を理解し、適切に対応すること。

| 判別条件 | 環境 |
|---------|------|
| `$CCR_TEST_GITPROXY=1` かつ `remote.origin.url` が `127.0.0.1` | **claude.ai/code**（リモートコンテナ） |
| `$GITHUB_ACTIONS=true` | **GitHub Actions** |
| 上記いずれでもない | **ローカル環境** |

## claude.ai/code（リモートコンテナ）

- **Git**: ローカルプロキシ（`127.0.0.1:*`）経由でGitHub接続
- **外部HTTPS**: エグレスプロキシ経由（`HTTPS_PROXY`環境変数で設定済み）
- **Git LFS**: Gitプロキシが LFS Batch APIに未対応（HTTP 502）。以下の回避策が必要：
  ```bash
  git config lfs.url https://github.com/hidezoh/dti-affi.git/info/lfs
  git config http.https://github.com/.proxy "$HTTPS_PROXY"
  git lfs pull
  ```
- **環境変数**: `.env`がコンテナにプリセット済み（Meilisearch APIキー等）
- **永続性**: セッション終了でファイルシステムはリセットされる
- **npm**: プロキシ設定済み（`npm_config_proxy`）、`npm install`/`npm run`は通常通り動作
- **制約**: `apt-get`でパッケージ追加可能だが、セッション間で永続しない

## GitHub Actions

- **Git LFS**: `actions/checkout@v4`の`lfs: true`オプションで取得可能
- **環境変数**: GitHub Secretsから取得（`${{ secrets.MEILISEARCH_HOST }}`等）
- **永続性**: ジョブ終了でリセット
- **npm**: 通常通り動作

## ローカル環境

- **Git LFS**: `git lfs install` + `git lfs pull`で取得
- **環境変数**: `.env`ファイルを手動作成（`.env.example`を参照）
- **永続性**: 永続的
- **npm**: 通常通り動作

## 環境に依存しない原則

- **「この環境ではできない」と即断しない** — プロキシ設定や回避策を調査してから判断する
- **「ローカルで実行してください」と丸投げしない** — 現在の環境で実行可能かまず試みる
- **環境固有の制約を発見したら、このセクションに追記する**

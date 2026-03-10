# MCP・カスタムスキル活用ガイドライン

## MCPツールの使用方法

### GitHub Issue関連
- **Issue作成**: `mcp__github__create_issue`（title, body, labels, assignees）
- **Issue更新**: `mcp__github__update_issue`（issue_number + 更新内容）
- **Issue一覧**: `mcp__github__list_issues`（既存確認・重複チェック）
- **Issue詳細**: `mcp__github__get_issue`（詳細取得・関連情報確認）

### Serena MCP関連
- **プロジェクト分析**: `mcp__serena__onboarding`
- **ファイル読み取り**: `mcp__serena__read_file`
- **セマンティック検索**: `mcp__serena__search_for_pattern`
- **ディレクトリ一覧**: `mcp__serena__list_dir`

## 導入済みカスタムスキル

プロジェクトの `.claude/skills/` ディレクトリに配置。

| 技術 | スキルソース | 用途 |
|------|------------|------|
| Cloudflare | dmmulroy/cloudflare-skill | Workers, Pages, KV, D1, R2の包括的リファレンス |
| Cloudflare | cloudflare/skills (公式) | Agents SDK, MCP サーバー, Wrangler CLI |
| Hono | yusukebe/hono-skill (公式) | Hono CLI連携、ドキュメント検索 |
| Hono | jezweb/claude-skills (hono-routing) | ルーティング、ミドルウェア、型安全RPC |
| Meilisearch | terminalskills/meilisearch | REST/SDK連携、ファセット、ランキングルール |
| Meilisearch | civitai/meilisearch-admin | インデックス管理、ヘルスチェック、統計情報 |

## スキル活用のガイドライン

1. **実装前にスキルを参照**: Hono/CF/Meilisearch関連の実装前に、対応するスキルの `SKILL.md` を確認する
2. **エラー解決にスキルを活用**: よくあるエラーパターンと解決策がスキルに収録されている
3. **スキルの重複に注意**: 各技術につきプライマリスキルを1つ選び、冗長なコンテキストトークン消費を避ける

## スキルのインストール・更新

```bash
# Cloudflare（コミュニティ最人気）
curl -fsSL https://raw.githubusercontent.com/dmmulroy/cloudflare-skill/main/install.sh | bash

# Cloudflare（公式）
npx skills add https://github.com/cloudflare/skills --skill cloudflare

# Hono（公式・作者）
/plugin marketplace add yusukebe/hono-skill && /plugin install hono-skill@hono

# Hono（高品質ルーティング）
/plugin marketplace add jezweb/claude-skills && /plugin install all@jezweb-skills

# Meilisearch（汎用）
npx -y @lobehub/market-cli skills install terminalskills-skills-meilisearch --agent claude-code

# Meilisearch（管理）
npx -y @lobehub/market-cli skills install civitai-civitai-meilisearch-admin --agent claude-code
```

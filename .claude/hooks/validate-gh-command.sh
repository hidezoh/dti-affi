#!/bin/bash
# PreToolUse hook: 複数行の gh コマンドをブロック
#
# 背景:
#   allowedTools の Bash(gh*) パターンで * は改行にマッチしない。
#   エージェントが gh pr create --body "$(cat <<EOF ...)" のように
#   複数行コマンドを構築すると「This command requires approval」エラーになる。
#
# 対策:
#   gh コマンドに --body（--body-file ではなく）が含まれる場合にブロックし、
#   正しい手順（Write + --body-file）をエージェントに返す。

INPUT="${CLAUDE_TOOL_INPUT:-$(cat)}"

# gh コマンドで --body を使用（--body-file は除外）した場合にブロック
if echo "$INPUT" | grep -q 'gh pr create' && \
   echo "$INPUT" | grep -qE '\-\-body[= ]' && \
   ! echo "$INPUT" | grep -q '\-\-body-file'; then
  cat <<'HOOK_JSON'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"gh pr create --body は改行を含むと Bash(gh*) パターンにマッチせず権限エラーになります。以下の手順で実行してください:\n1. Write(\"/tmp/pr-body.md\", \"## 概要\\n...\\n\\nCloses #Issue番号\")\n2. gh pr create --title \"タイトル\" --body-file /tmp/pr-body.md --base main\n※ gh pr create は必ず1行で書いてください"}}
HOOK_JSON
  exit 0
fi

exit 0

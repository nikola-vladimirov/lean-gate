#!/usr/bin/env bash
# PostToolUse on Write/Edit: when Claude edits a doc or a test file, point it at the matching guard, once per session.
# Also flags an em dash in any text file it wrote (the user's rule is none). Silent otherwise, and for the reference copies.
input=$(cat)
field() { printf '%s' "$input" | tr -d '\n' | sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p"; }
raw=$(field file_path | sed 's/\\\\/\//g')
f=$(printf '%s' "$raw" | tr 'A-Z' 'a-z')
session=$(field session_id | tr -cd 'A-Za-z0-9-')
[ -n "$f" ] && [ -n "$session" ] || exit 0

msg=""
case "$f" in
  */reference/*|*/builder/*|*/reverse/*) ;;  # third-party copies keep their own punctuation
  *.md|*.sh|*.php|*.js|*.ts|*.json|*.txt|*.yml|*.yaml)
    if [ -f "$raw" ] && grep -q $'\xe2\x80\x94' "$raw"; then
      msg="lean-project: $raw contains an em dash. The user's rule is none: use a colon, a comma or parentheses instead. Fix it before you finish."
    fi ;;
esac

kind=""
case "$f" in
  */reference/*) ;;
  *.md) kind=docs ;;
  *test_*.py|*_test.go|*test.php|*.test.ts|*.test.tsx|*.test.js|*.spec.js|*.spec.ts|*/tests/*|*/__tests__/*|*/spec/*) kind=test ;;
esac

if [ -n "$kind" ]; then
  state_dir=${CLAUDE_PLUGIN_DATA:-${TMPDIR:-/tmp}/lean-project}
  mkdir -p "$state_dir" 2>/dev/null || exit 0
  find "$state_dir" -name 'guard-*' -mtime +7 -exec rm -f {} + 2>/dev/null
  marker="$state_dir/guard-$kind-$session"
  if [ ! -f "$marker" ]; then
    touch "$marker"
    ref="${CLAUDE_PLUGIN_ROOT:-$(dirname "$0")/..}/skills/lean-project/reference/guard-skills"
    if [ "$kind" = docs ]; then
      guard="lean-project: you are editing docs. Before you finish, check every function, flag, endpoint and config key they name against the code. Read only $ref/docs-guard.md for the method."
    else
      guard="lean-project: you are editing tests. Before you finish, check them against the test rules. Read only $ref/test-guard.md for the method."
    fi
    msg="${msg:+$msg }$guard"
  fi
fi

[ -n "$msg" ] || exit 0
printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"%s"}}\n' "$msg"
exit 0

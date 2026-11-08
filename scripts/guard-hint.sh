#!/usr/bin/env bash
# PostToolUse on Write/Edit: when Claude edits a doc or a test file, point it at the matching guard, once per session.
. "$(dirname "$0")/gate-on.sh"; gate_on guard_hints || exit 0
# The em dash check is lean-gate's no-em-dashes rule, not this hook. Silent otherwise, and for the reference copies.
input=$(cat)
field() { printf '%s' "$input" | tr -d '\n' | sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p"; }
raw=$(field file_path | sed 's/\\\\/\//g')
f=$(printf '%s' "$raw" | tr 'A-Z' 'a-z')
session=$(field session_id | tr -cd 'A-Za-z0-9-')
[ -n "$f" ] && [ -n "$session" ] || exit 0

msg=""

kind=""
case "$f" in
  */reference/*) ;;
  *.md) kind=docs ;;
  *test_*.py|*_test.go|*test.php|*.test.ts|*.test.tsx|*.test.js|*.spec.js|*.spec.ts|*/tests/*|*/__tests__/*|*/spec/*) kind=test ;;
esac

if [ -n "$kind" ]; then
  state_dir=${CLAUDE_PLUGIN_DATA:-${TMPDIR:-/tmp}/lean-gate}
  mkdir -p "$state_dir" 2>/dev/null || exit 0
  find "$state_dir" -name 'guard-*' -mtime +7 -exec rm -f {} + 2>/dev/null
  marker="$state_dir/guard-$kind-$session"
  if [ ! -f "$marker" ]; then
    touch "$marker"
    ref="${CLAUDE_PLUGIN_ROOT:-$(dirname "$0")/..}/skills/lean-gate/reference/guard-skills"
    if [ "$kind" = docs ]; then
      guard="lean-gate: you are editing docs. Before you finish, check every function, flag, endpoint and config key they name against the code. Read only $ref/docs-guard.md for the method."
    else
      guard="lean-gate: you are editing tests. Before you finish, check them against the test rules. Read only $ref/test-guard.md for the method."
    fi
    msg="${msg:+$msg }$guard"
  fi
fi

[ -n "$msg" ] || exit 0
msg=$(printf '%s' "$msg" | sed 's/\\/\\\\/g; s/"/\\"/g')
printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"%s"}}\n' "$msg"
exit 0

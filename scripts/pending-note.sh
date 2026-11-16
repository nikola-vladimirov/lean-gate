#!/usr/bin/env bash
# UserPromptSubmit hook: hand Claude the end-of-turn misses the gate saved last turn (state file, tests, PHPCS, push
# after tag). Those rules run after the turn, so they cannot deny; without this only the person saw a toast. Read once.
# No switch of its own: the gate writes a note only for a rule at warn or block, so mode off or a rule off means none.
input=$(cat)
session=$(printf '%s' "$input" | tr -d '\n' | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | tr -cd 'A-Za-z0-9-')
[ -n "$session" ] || exit 0
dir="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/lean-gate/pending"
f="$dir/$session.txt"
find "$dir" -name '*.txt' -mtime +7 -exec rm -f {} + 2>/dev/null
[ -s "$f" ] || exit 0
msg=$(head -c 2000 "$f" | tr -d '\000-\037' | sed 's/\\/\\\\/g; s/"/\\"/g')
rm -f "$f"
printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"%s"}}\n' "$msg"
exit 0

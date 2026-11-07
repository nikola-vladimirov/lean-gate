#!/usr/bin/env bash
# UserPromptSubmit hook: once the conversation's context passes the limit, nudge (the user and Claude)
. "$(dirname "$0")/gate-on.sh"; gate_on context_nudge || exit 0
# to update the state file and start a fresh session. Silent below the limit; then once per step.
# Context size = input + cache tokens of the latest main-thread reply in the transcript.
input=$(cat)
field() { printf '%s' "$input" | tr -d '\n' | sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p"; }
transcript=$(field transcript_path | sed 's/\\\\/\//g')
session=$(field session_id | tr -cd 'A-Za-z0-9-')
[ -f "$transcript" ] && [ -n "$session" ] || exit 0

usage=$(tail -n 300 "$transcript" | grep '"usage"' | grep -v '"isSidechain":true' | tail -n 1)
num() { printf '%s' "$usage" | grep -o "\"$1\":[0-9]*" | head -n 1 | grep -o '[0-9]*$'; }
ctx=$(( $(num input_tokens || echo 0) + $(num cache_creation_input_tokens || echo 0) + $(num cache_read_input_tokens || echo 0) ))

# lean-gate owns the limit: the project file beats the global one; the plugin option is only the fallback.
gate_limit() { sed -n 's/.*"context_limit"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p' "$1" 2>/dev/null | head -n 1; }
cwd0=$(field cwd | sed 's/\\\\/\//g')
limit=$(gate_limit "$cwd0/.lean-project.json"); [ -n "$limit" ] || limit=$(gate_limit "$HOME/.claude/lean-project.json")
limit=${limit:-${CLAUDE_PLUGIN_OPTION_CONTEXT_LIMIT:-300000}}
step=${CLAUDE_PLUGIN_OPTION_REMIND_EVERY:-50000}
case "$limit$step" in *[!0-9]*|'') exit 0 ;; esac
[ "$ctx" -ge "$limit" ] && [ "$step" -gt 0 ] || exit 0

state_dir=${CLAUDE_PLUGIN_DATA:-${TMPDIR:-/tmp}/lean-project}
mkdir -p "$state_dir" 2>/dev/null || exit 0
find "$state_dir" -name 'nudge-*' -mtime +7 -exec rm -f {} + 2>/dev/null
bucket=$(( (ctx - limit) / step ))
last=$(cat "$state_dir/nudge-$session" 2>/dev/null || echo -1)
[ "$bucket" -gt "$last" ] || exit 0
echo "$bucket" > "$state_dir/nudge-$session"

k=$(( ctx / 1000 ))
cwd=$(field cwd | sed 's/\\\\/\//g')
project=$(basename "$cwd")
# Claude opens the dialog with start_session (offer card): the user picks "New session" or "Do it here".
# The brief stays short so the fresh session reads only the index and state file, not the whole project again.
printf '{"systemMessage":"lean-project: this conversation is about %sk tokens, and every turn re-sends all of it. Finish the current step, update the state file, then offer a new session.","hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"lean-project: context is about %sk tokens (limit %s). Finish the step in hand and update the project state file (Now, In progress, Next) so a fresh session can resume from it alone. Then call mcp__ccd_session__start_session with initiation own_initiative, context fresh, title Resume %s, and a brief of at most 120 words that names only: the project index file, the state file, the next step from the state file, and the rule that the new session reads those two files first, uses lean-project map for any code and does not reread files they do not name. Do not begin a new large task in this session."}}\n' "$k" "$k" "$limit" "$project"

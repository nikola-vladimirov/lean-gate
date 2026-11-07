#!/usr/bin/env bash
# SessionEnd hook: write the handoff draft of a real session (two or more user messages) to a dated file for review.
. "$(dirname "$0")/gate-on.sh"; gate_on session_drafts || exit 0
# No model call. Write-once: an existing draft is never overwritten. The folder is the plugin setting
# session_drafts_dir (for example a folder in an Obsidian vault), or the plugin data folder when unset.
input=$(cat)
field() { printf '%s' "$input" | tr -d '\n' | sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p"; }
transcript=$(field transcript_path | sed 's/\\\\/\//g')
session=$(field session_id | tr -cd 'A-Za-z0-9-')
cwd=$(field cwd | sed 's/\\\\/\//g')
[ -f "$transcript" ] && [ -d "$cwd" ] || exit 0
users=$(grep '"type":"user"' "$transcript" | grep -vc tool_result)
[ "$users" -ge 2 ] || exit 0

dir=${CLAUDE_PLUGIN_OPTION_SESSION_DRAFTS_DIR:-}
[ -n "$dir" ] || dir="${CLAUDE_PLUGIN_DATA:-${TMPDIR:-/tmp}/lean-project}/sessions"
mkdir -p "$dir" 2>/dev/null || exit 0
out="$dir/$(date +%F)-${session:0:8}.md"
[ -e "$out" ] && exit 0
root=$(cd "$(dirname "$0")/.." && pwd)
draft=$(cd "$cwd" && bash "$root/bin/lean-project" handoff 2>/dev/null)
{ echo "# Session draft $(date +%F) ${session:0:8}"; echo "Project: $(basename "$cwd")"; echo; echo "$draft"; } > "$out"
exit 0

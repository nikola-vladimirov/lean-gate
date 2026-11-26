#!/usr/bin/env bash
# lean-gate controls every shell helper: `gate_on <name>` fails when the gate is off or the helper is switched off.
# Names: startup_notes, context_nudge, guard_hints, session_drafts. The project file beats the global one; unset means on.

gate_val() { [ -f "$1" ] && tr -d '\n' < "$1" | sed -n -E "s/.*\"$2\"[[:space:]]*:[[:space:]]*(true|false|\"[a-z]*\").*/\1/p" | head -n 1; }
gate_project_file() { echo "$1/.lean-gate.json"; }
gate_on() {
  local g="$HOME/.claude/lean-gate.json" v f
  [ "$(gate_val "$g" mode)" = '"off"' ] && return 1
  for f in "$(gate_project_file "$PWD")" "$g"; do
    v=$(gate_val "$f" "$1")
    [ -n "$v" ] && { [ "$v" = true ]; return; }
  done
  return 0
}
# Paths compared case-insensitively with forward slashes; Git Bash's /e/ is e:/, as the registry writes it.
gate_norm() { tr 'A-Z\\' 'a-z/' | sed -E 's#/+#/#g; s#^/([a-z])(/|$)#\1:/#; s#(.)/$#\1#'; }
# The registered project folders (lean-projects.json), one per line, through gate_norm.
gate_projects() { grep -o '"path"[[:space:]]*:[[:space:]]*"[^"]*"' "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/lean-projects.json" 2>/dev/null | sed 's/.*"\([^"]*\)"$/\1/' | gate_norm; }

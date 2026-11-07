#!/usr/bin/env bash
# lean-gate controls every shell helper: `gate_on <name>` fails when the gate is off or the helper is switched off.
# Names: startup_notes, context_nudge, guard_hints, session_drafts. The project file beats the global one; unset means on.
gate_val() { [ -f "$1" ] && tr -d '\n' < "$1" | sed -n "s/.*\"$2\"[[:space:]]*:[[:space:]]*\(true\|false\|\"[a-z]*\"\).*/\1/p" | head -n 1; }
gate_on() {
  local g="$HOME/.claude/lean-project.json" v f
  [ "$(gate_val "$g" mode)" = '"off"' ] && return 1
  for f in "$PWD/.lean-project.json" "$g"; do
    v=$(gate_val "$f" "$1")
    [ -n "$v" ] && { [ "$v" = true ]; return; }
  done
  return 0
}

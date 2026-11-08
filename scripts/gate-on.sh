#!/usr/bin/env bash
# lean-gate controls every shell helper: `gate_on <name>` fails when the gate is off or the helper is switched off.
# Names: startup_notes, context_nudge, guard_hints, session_drafts. The project file beats the global one; unset means on.

# lean-project was the old name. Copy (never move) its settings, memory and plugin data to the new names once, so a
# rollback to the old plugin still finds its own files. Each step runs only while its new target is missing.
gate_migrate() {
  local c="$HOME/.claude" old d f
  [ -e "$c/lean-gate.json" ] || [ ! -f "$c/lean-project.json" ] || cp -p "$c/lean-project.json" "$c/lean-gate.json"
  [ -e "$c/lean-gate/memory" ] || [ ! -d "$c/lean-project/memory" ] || { mkdir -p "$c/lean-gate" && cp -Rp "$c/lean-project/memory" "$c/lean-gate/memory"; }
  d=${CLAUDE_PLUGIN_DATA:-}
  # Only the installed plugin's own folder: cost, gain and the selftest point CLAUDE_PLUGIN_DATA at temp folders.
  case "${d##*/}" in lean-gate-*) ;; *) return 0 ;; esac
  [ ! -e "$d/LESSONS.md" ] || return 0
  old="$c/plugins/data/lean-project-lean-project"
  [ -d "$old" ] || old=$(ls -d "$c"/plugins/data/lean-project-*/ 2>/dev/null | head -n 1)
  [ -n "$old" ] && [ -d "$old" ] || return 0
  mkdir -p "$d" || return 0
  for f in LESSONS.md LESSONS-ARCHIVE.md last-full-review sessions; do [ -e "$old/$f" ] && cp -Rp "$old/$f" "$d/"; done
  return 0
}
gate_migrate

gate_val() { [ -f "$1" ] && tr -d '\n' < "$1" | sed -n "s/.*\"$2\"[[:space:]]*:[[:space:]]*\(true\|false\|\"[a-z]*\"\).*/\1/p" | head -n 1; }
# The project's config file: .lean-gate.json, or the old .lean-project.json when there is no new one.
gate_project_file() { if [ -f "$1/.lean-gate.json" ] || [ ! -f "$1/.lean-project.json" ]; then echo "$1/.lean-gate.json"; else echo "$1/.lean-project.json"; fi; }
gate_on() {
  local g="$HOME/.claude/lean-gate.json" v f
  [ "$(gate_val "$g" mode)" = '"off"' ] && return 1
  for f in "$(gate_project_file "$PWD")" "$g"; do
    v=$(gate_val "$f" "$1")
    [ -n "$v" ] && { [ "$v" = true ]; return; }
  done
  return 0
}

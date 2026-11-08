#!/usr/bin/env bash
# lean-gate controls every shell helper: `gate_on <name>` fails when the gate is off or the helper is switched off.
# Names: startup_notes, context_nudge, guard_hints, session_drafts. The project file beats the global one; unset means on.

# lean-project was the old name. Copy (never move) its settings, memory and plugin data to the new names once, so a
# rollback to the old plugin still finds its own files. Each step runs only while its new target is missing.
gate_migrate() {
  local c="$HOME/.claude" old="" d=${CLAUDE_PLUGIN_DATA:-} f lock ok p
  # Only the installed plugin's own folder: cost, gain and the selftest point CLAUDE_PLUGIN_DATA at temp folders.
  # .migrated, not LESSONS.md, marks it done: an old folder may have no lessons, and a killed copy must resume.
  case "${d##*/}" in lean-gate-*) [ -e "$d/.migrated" ] && d="" ;; *) d="" ;; esac
  if [ -n "$d" ]; then
    old="$c/plugins/data/lean-project-lean-project"
    [ -d "$old" ] || old=$(ls -d "$c"/plugins/data/lean-project-*/ 2>/dev/null | head -n 1)
    [ -n "$old" ] && [ -d "$old" ] || old=""
  fi
  # The usual case, nothing left to copy, takes no lock.
  { [ -e "$c/lean-gate.json" ] || [ ! -f "$c/lean-project.json" ]; } && { [ -e "$c/lean-gate/memory" ] || [ ! -d "$c/lean-project/memory" ]; } && [ -z "$old" ] && return 0
  # Several hooks start at once and cp -R into a folder another hook just made nests it: mkdir is atomic, so one
  # copies and the others skip. A lock older than two minutes is left over from a killed hook.
  lock="$c/.lean-gate-migrating"
  find "$lock" -maxdepth 0 -mmin +2 -exec rmdir {} \; 2>/dev/null
  mkdir "$lock" 2>/dev/null || return 0
  # Each copy goes to a temp name of this process, then mv only while the target is still missing: a hook killed mid-copy
  # leaves no half target. Hooks can still overlap (seen on Linux CI despite the lock), and a mv into a folder that appeared
  # meanwhile lands inside it, so that inner copy is removed: the first copy wins and nothing nests.
  p=${BASHPID:-$$}
  [ -e "$c/lean-gate.json" ] || [ ! -f "$c/lean-project.json" ] || { cp -p "$c/lean-project.json" "$c/.lean-gate.json.$p" && { [ -e "$c/lean-gate.json" ] || mv "$c/.lean-gate.json.$p" "$c/lean-gate.json"; }; rm -f "$c/.lean-gate.json.$p"; }
  [ -e "$c/lean-gate/memory" ] || [ ! -d "$c/lean-project/memory" ] || { mkdir -p "$c/lean-gate" && cp -Rp "$c/lean-project/memory" "$c/lean-gate/.memory.$p" && { [ -e "$c/lean-gate/memory" ] || mv "$c/lean-gate/.memory.$p" "$c/lean-gate/memory"; }; rm -rf "$c/lean-gate/.memory.$p" "$c/lean-gate/memory/.memory.$p"; }
  if [ -n "$old" ] && mkdir -p "$d"; then
    ok=1
    for f in LESSONS.md LESSONS-ARCHIVE.md last-full-review sessions "$old"/setup-nag-*; do
      f=${f##*/}; [ -e "$old/$f" ] && [ ! -e "$d/$f" ] || continue
      { cp -Rp "$old/$f" "$d/.$f.$p" && { [ -e "$d/$f" ] || mv "$d/.$f.$p" "$d/$f"; }; } || ok=""
      rm -rf "$d/.$f.$p" "$d/$f/.$f.$p"
    done
    [ -z "$ok" ] || touch "$d/.migrated"
  fi
  rmdir "$lock" 2>/dev/null
  return 0
}
gate_migrate

gate_val() { [ -f "$1" ] && tr -d '\n' < "$1" | sed -n -E "s/.*\"$2\"[[:space:]]*:[[:space:]]*(true|false|\"[a-z]*\").*/\1/p" | head -n 1; }
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

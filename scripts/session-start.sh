#!/usr/bin/env bash
# SessionStart: lean-gate is always on. Prints the standing rules for every session, the WordPress
. "$(dirname "$0")/gate-on.sh"; gate_on startup_notes || exit 0
# pointer when the working folder is a WordPress project, and a setup line once per project (marked in the data folder).
root=${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}
# startup, resume, clear or compact; a resumed transcript already holds the skill text.
# read -t: the hook input is one JSON line, and a stdin left open (a terminal, a test) must never hang the hook.
hook_in=""; [ -t 0 ] || IFS= read -r -t 2 hook_in 2>/dev/null
src=$(printf '%s' "$hook_in" | sed -n 's/.*"source"[[:space:]]*:[[:space:]]*"\([a-z]*\)".*/\1/p')
# Housekeeping: per-session markers older than 7 days go (setup-nag-* counts per project, so it stays), drafts older than 30 days move to sessions/archive/.
# Only dated draft names move, never over an archived one: the drafts folder can be an Obsidian folder with other notes.
state=${CLAUDE_PLUGIN_DATA:-${TMPDIR:-/tmp}/lean-gate}
find "$state" -maxdepth 1 -type f \( -name 'guard-docs-*' -o -name 'guard-test-*' -o -name 'nudge-*' \) -mtime +7 -exec rm -f {} + 2>/dev/null
drafts=${CLAUDE_PLUGIN_OPTION_SESSION_DRAFTS_DIR:-$state/sessions}
[ -d "$drafts" ] && find "$drafts" -maxdepth 1 -type f -name '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]-*.md' -mtime +30 -exec sh -c 'mkdir -p "$0" && mv -n "$@" "$0"' "$drafts/archive" {} + 2>/dev/null
cat <<'EOF'
lean-gate (always on): read the index and state file first (in a tracker folder, run its start command instead); `lean-gate map` before big files; keep the state file current; reviews are a release gate (`lean-gate review-scope`); WordPress, WooCommerce, Bricks and block-editor code follows WORDPRESS.md.
EOF

wp=""
grep -qs 'Plugin Name:' ./*.php && wp=1
grep -qs 'Theme Name:' style.css && wp=1
[ -f wp-config.php ] || [ -f wp-config-sample.php ] && wp=1
grep -qs 'wordpress\|woocommerce' composer.json && wp=1
if [ -n "$wp" ]; then
  echo "WordPress project detected. Before changing code, read $root/skills/lean-gate/WORDPRESS.md: how to read the docs, check changelogs, best practices, and the security checklist and fixes."
  echo "For WordPress.org submission, read $root/skills/lean-gate/reference/wordpress-agent-skills/wp-plugin-directory-guidelines.md. For static analysis, read reference/wordpress-agent-skills/wp-phpstan.md. Read only the one the task needs."
fi
woo=""
grep -qs 'WooCommerce' ./*.php && woo=1
grep -qs 'woocommerce' composer.json && woo=1
if [ -n "$woo" ]; then
  echo "WooCommerce code detected. For order, product, checkout or payment code, read $root/skills/lean-gate/reference/guard-skills/woo-guard.md first."
fi
# A chosen delegation runner that is down falls back on its own: show what work will use right now.
if [ -f .lean-project ]; then
  now=$("$root/bin/lean-gate" delegate pick 2>/dev/null)
  echo "lean-gate: delegated work goes to ${now:-none} right now (none means Claude does it here)."
fi
# Continuity: one line naming this project's newest session draft (the path only, not its text).
latest=$(bash "$root/bin/lean-gate" sessions 1 --here 2>/dev/null | cut -f3)
[ -n "$latest" ] && echo "lean-gate: this project's newest session draft is $latest. Read it only if the task continues that work."
# Memory: one line (counts, newest note, linked projects); the notes themselves load only on `lean-gate memory recall`.
mem=$(bash "$root/bin/lean-gate" memory index 2>/dev/null)
[ -n "$mem" ] && echo "lean-gate: $mem. Run lean-gate memory recall when the task touches past work."
# Setup: a project with docs or git but no recorded setup, or no delegation choice, gets one line. It is printed in
# up to three sessions per project (a count in the mark file in the plugin data folder), then stops.
needs_setup=""
if [ ! -f .lean-project ] && { [ -f CLAUDE.md ] || [ -d docs ] || [ -f README.md ]; }; then needs_setup=1; fi
if [ ! -f .lean-project-setup ] && { [ -d docs ] || [ -d .git ]; }; then needs_setup=1; fi
mark="$state/setup-nag-$(printf '%s' "$PWD" | cksum | cut -d' ' -f1)"
shown=$(cat "$mark" 2>/dev/null); shown=${shown:-0}
if [ -n "$needs_setup" ] && [ "$shown" -lt 3 ]; then
  echo "lean-gate setup not recorded here: before any plan or code change, run the cards in $root/skills/lean-gate/STARTUP.md, and ask once where delegated work goes (lean-gate delegate set runner <value>)."
  mkdir -p "$(dirname "$mark")" 2>/dev/null && echo $((shown + 1)) > "$mark" 2>/dev/null
fi
# The lean-gate skill itself in project folders (inProject in hooks/register.tsx), so no session edits code before it;
# the gate's lean-gate-first rule counts the marker line as a load.
proj=""
for m in AGENTS.md CLAUDE.md .git README.md package.json composer.json; do [ -e "$m" ] && proj=1; done
[ "$(gate_val "$HOME/.claude/lean-gate.json" scope)" = '"everywhere"' ] && proj=1
[ -n "$proj" ] || { here=$(pwd | gate_norm); gate_projects | awk -v h="$here" '$0 != "" && (h == $0 || index(h, $0 "/") == 1) { f = 1 } END { exit !f }' && proj=1; }
if [ -n "$proj" ] && [ "$src" != resume ] && [ -f "$root/skills/lean-gate/SKILL.md" ]; then
  echo "[lean-gate skill loaded at session start]"
  echo "Base directory for this skill: $root/skills/lean-gate"
  awk '{ sub(/\r$/, "") } NR == 1 && /^---$/ { fm = 1; next } fm { if (/^---$/) fm = 0; next } { print }' "$root/skills/lean-gate/SKILL.md"
fi
exit 0

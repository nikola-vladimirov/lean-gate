#!/usr/bin/env bash
# SessionStart: lean-project is always on. Prints the standing rules for every session, the WordPress
. "$(dirname "$0")/gate-on.sh"; gate_on startup_notes || exit 0
# pointer when the working folder is a WordPress project, and a setup line once per project (marked in the data folder).
root=${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}
cat <<'EOF'
lean-project (always on): read the index and state file first; `lean-project map` before big files; keep the state file current; reviews are a release gate (`lean-project review-scope`); WordPress, WooCommerce, Bricks and block-editor code follows WORDPRESS.md.
EOF

wp=""
grep -qs 'Plugin Name:' ./*.php && wp=1
grep -qs 'Theme Name:' style.css && wp=1
[ -f wp-config.php ] || [ -f wp-config-sample.php ] && wp=1
grep -qs 'wordpress\|woocommerce' composer.json && wp=1
if [ -n "$wp" ]; then
  echo "WordPress project detected. Before changing code, read $root/skills/lean-project/WORDPRESS.md: how to read the docs, check changelogs, best practices, and the security checklist and fixes."
  echo "For WordPress.org submission, read $root/skills/lean-project/reference/wordpress-agent-skills/wp-plugin-directory-guidelines.md. For static analysis, read reference/wordpress-agent-skills/wp-phpstan.md. Read only the one the task needs."
fi
woo=""
grep -qs 'WooCommerce' ./*.php && woo=1
grep -qs 'woocommerce' composer.json && woo=1
if [ -n "$woo" ]; then
  echo "WooCommerce code detected. For order, product, checkout or payment code, read $root/skills/lean-project/reference/guard-skills/woo-guard.md first."
fi
# A chosen delegation runner that is down falls back on its own: show what work will use right now.
if [ -f .lean-project ]; then
  now=$("$root/bin/lean-project" delegate pick 2>/dev/null)
  echo "lean-project: delegated work goes to ${now:-none} right now (none means Claude does it here)."
fi
# Continuity: one line naming this project's newest session draft (the path only, not its text).
latest=$(bash "$root/bin/lean-project" sessions 1 --here 2>/dev/null | cut -f3)
[ -n "$latest" ] && echo "lean-project: this project's newest session draft is $latest. Read it only if the task continues that work."
# Memory: one line (counts, newest note, linked projects); the notes themselves load only on `lean-project memory recall`.
mem=$(bash "$root/bin/lean-project" memory index 2>/dev/null)
[ -n "$mem" ] && echo "lean-project: $mem. Run lean-project memory recall when the task touches past work."
# Setup: a project with docs or git but no recorded setup, or no delegation choice, gets one line. It is printed in
# up to three sessions per project (a count in the mark file in the plugin data folder), then stops.
needs_setup=""
if [ ! -f .lean-project ] && { [ -f CLAUDE.md ] || [ -d docs ] || [ -f README.md ]; }; then needs_setup=1; fi
if [ ! -f .lean-project-setup ] && { [ -d docs ] || [ -d .git ]; }; then needs_setup=1; fi
mark="${CLAUDE_PLUGIN_DATA:-${TMPDIR:-/tmp}/lean-project}/setup-nag-$(printf '%s' "$PWD" | cksum | cut -d' ' -f1)"
shown=$(cat "$mark" 2>/dev/null); shown=${shown:-0}
if [ -n "$needs_setup" ] && [ "$shown" -lt 3 ]; then
  echo "lean-project setup not recorded here: before any plan or code change, run the cards in $root/skills/lean-project/STARTUP.md, and ask once where delegated work goes (lean-project delegate set runner <value>)."
  mkdir -p "$(dirname "$mark")" 2>/dev/null && echo $((shown + 1)) > "$mark" 2>/dev/null
fi
exit 0

#!/usr/bin/env bash
# SessionStart: lean-project is always on. Prints the standing rules for every session, and the WordPress
# pointer when the working folder is a WordPress project (plugin, theme or WordPress install).
cat <<'EOF'
lean-project (always on): read the project's index and state file before editing. Use `lean-project map <file>` and read only the ranges you need. Keep the state file current. Reviews (code, performance, security) are a release gate: at release, run `lean-project review-scope` and review only the files it lists. Testing runs on every change. For WordPress, WooCommerce, Bricks or block-editor code, follow WORDPRESS.md on every change.
EOF

wp=""
grep -qs 'Plugin Name:' ./*.php && wp=1
grep -qs 'Theme Name:' style.css && wp=1
[ -f wp-config.php ] || [ -f wp-config-sample.php ] && wp=1
grep -qs 'wordpress\|woocommerce' composer.json && wp=1
if [ -n "$wp" ]; then
  echo "WordPress project detected. Before changing code, read ${CLAUDE_PLUGIN_ROOT:-.}/skills/lean-project/WORDPRESS.md: how to read the docs, check changelogs, best practices, and the security checklist and fixes."
  echo "For WordPress.org submission, read ${CLAUDE_PLUGIN_ROOT:-.}/skills/lean-project/reference/wordpress-agent-skills/wp-plugin-directory-guidelines.md. For static analysis, read reference/wordpress-agent-skills/wp-phpstan.md. Read only the one the task needs."
fi
woo=""
grep -qs 'WooCommerce' ./*.php && woo=1
grep -qs 'woocommerce' composer.json && woo=1
if [ -n "$woo" ]; then
  echo "WooCommerce code detected. For order, product, checkout or payment code, read ${CLAUDE_PLUGIN_ROOT:-.}/skills/lean-project/reference/guard-skills/woo-guard.md first."
fi
# A chosen delegation runner that is down falls back on its own: show what work will use right now.
if [ -f .lean-project ]; then
  now=$("${CLAUDE_PLUGIN_ROOT:-.}/bin/lean-project" delegate pick 2>/dev/null)
  echo "lean-project: delegated work goes to ${now:-none} right now (none means Claude does it here)."
fi
# Continuity: one line naming this project's newest session draft (the path only, not its text).
root=${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}
latest=$(bash "$root/bin/lean-project" sessions 1 --here 2>/dev/null | cut -f3)
[ -n "$latest" ] && echo "lean-project: this project's newest session draft is $latest. Read it only if the task continues that work."
# First run in a project (or one started before this option): ask once where delegated work goes.
if [ ! -f .lean-project ] && { [ -f CLAUDE.md ] || [ -d docs ] || [ -f README.md ]; }; then
  echo "lean-project: no delegation choice for this project yet. Ask the user once with AskUserQuestion: none (do all work here), llama (llama.cpp server), ollama, unsloth (Unsloth Studio), opencode (free OpenCode models), aider or goose (agent CLIs). Then run: lean-project delegate set runner <value>, and check it with lean-project delegate check. A runner that is down falls back in order, and then Claude does the work."
fi
# Setup check: a project with docs or a git repo, but no recorded startup setup, gets the mandatory cards.
if [ ! -f .lean-project-setup ] && { [ -d docs ] || [ -d .git ]; }; then
  echo "lean-project setup not recorded for this project. Before any plan, code or site change, run the startup cards in ${CLAUDE_PLUGIN_ROOT:-.}/skills/lean-project/STARTUP.md. For a project that already exists, follow NEW-PROJECT.md, "Adopting a project", and pre-fill each card from what you read. Record the setup in .lean-project-setup (date and new or adopted) when the cards are answered."
fi
exit 0

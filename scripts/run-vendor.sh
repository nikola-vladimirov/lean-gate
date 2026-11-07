#!/usr/bin/env bash
# Runs a vendored hook (node) when lean-gate allows it: `run-vendor.sh <helper> <file under vendor/>`.
# stdin passes through. When the standalone plugin of the same name is still enabled, this stays quiet so nothing runs twice.
. "$(dirname "$0")/gate-on.sh"
gate_on "$1" || exit 0
if tr -d '\n' < "$HOME/.claude/settings.json" 2>/dev/null | grep -q "\"$1@[a-z-]*\"[[:space:]]*:[[:space:]]*true"; then exit 0; fi
root=${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}
exec node "$root/vendor/$2"

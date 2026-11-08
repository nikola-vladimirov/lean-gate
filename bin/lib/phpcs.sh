# PHP_CodeSniffer with the WordPress standard (WPCS). Sourced by bin/lean-gate.
#   lean-gate phpcs status        is phpcs installed, which version, is the standard there
#   lean-gate phpcs [files...]    lint the PHP files given, or the PHP files changed since the last tag plus uncommitted ones
#   lean-gate phpcs fix [files]   the same with phpcbf (fixes what it can)
# The standard is "phpcs_standard" in ~/.claude/lean-gate.json (default WordPress; WordPress-Extra, WordPress-Core and WordPress-Docs also exist).

phpcs_find() { # $1 phpcs|phpcbf
  if [ -x "./vendor/bin/$1" ]; then echo "./vendor/bin/$1"; elif command -v "$1" >/dev/null 2>&1; then command -v "$1"; else return 1; fi
}

phpcs_standard() {
  local s; s=$(tr -d '\n' < "$HOME/.claude/lean-gate.json" 2>/dev/null | sed -n 's/.*"phpcs_standard"[[:space:]]*:[[:space:]]*"\([A-Za-z-]*\)".*/\1/p' | head -n 1)
  echo "${s:-WordPress}"
}

phpcs_files() {
  local tag; tag=$(git describe --tags --abbrev=0 2>/dev/null)
  { [ -n "$tag" ] && git diff --name-only "$tag" -- '*.php' 2>/dev/null || git diff --name-only HEAD -- '*.php' 2>/dev/null; git ls-files -o --exclude-standard -- '*.php' 2>/dev/null; } | sort -u | grep -Ev '(^|/)(vendor|node_modules)/' | while IFS= read -r f; do [ -f "$f" ] && echo "$f"; done
}

cmd_phpcs() {
  local action="run" bin std files
  case "${1:-}" in status|fix) action="$1"; shift ;; run) shift ;; esac
  std=$(phpcs_standard)
  if [ "$action" = status ]; then
    if bin=$(phpcs_find phpcs); then
      echo "phpcs: $("$bin" --version 2>/dev/null | head -n 1), standard $std$("$bin" -i 2>/dev/null | grep -q "$std" || echo " (not installed: composer require --dev wp-coding-standards/wpcs dealerdirect/phpcodesniffer-composer-installer)")"
    else
      echo "phpcs: not installed (needs PHP and Composer: composer require --dev wp-coding-standards/wpcs dealerdirect/phpcodesniffer-composer-installer)"
    fi
    return 0
  fi
  if [ "$action" = fix ]; then bin=$(phpcs_find phpcbf) || die "phpcs fix: phpcbf is not installed (lean-gate phpcs status)"; else bin=$(phpcs_find phpcs) || die "phpcs: not installed (lean-gate phpcs status)"; fi
  if [ $# -gt 0 ]; then files=$(printf '%s\n' "$@"); else files=$(phpcs_files); fi
  [ -n "$files" ] || { echo "phpcs: no PHP files to check"; return 0; }
  # shellcheck disable=SC2086
  printf '%s\n' "$files" | tr '\n' '\0' | xargs -0 "$bin" --standard="$std" --report=summary
}

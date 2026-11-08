# On-demand packs: skill folders and plugins that stay off until a task needs them. Sourced by bin/lean-gate.
# Skill packs move between the active folder and a store folder (nothing is deleted); a plugin pack flips its
# enabledPlugins switch. Changes apply in the NEXT session, because Claude Code reads skills and plugins at start.
#   lean-gate pack status
#   lean-gate pack on|off <bricks|wp|ui-ux>
# Env overrides (tests and other machines): LEAN_SKILLS, LEAN_SKILLS_OFF, LEAN_SETTINGS.

pack_dirs() {
  PACK_ACTIVE="${LEAN_SKILLS:-$HOME/.claude/skills}"
  PACK_OFF="${LEAN_SKILLS_OFF:-$HOME/.claude/skills-off}"
  PACK_SETTINGS="${LEAN_SETTINGS:-$HOME/.claude/settings.json}"
}

# Skill-pack name patterns in the active folder. Plugin packs are handled separately.
pack_patterns() {
  case "$1" in
    bricks) echo "bricks-* bricksextras-*" ;;
    wp) echo "wp-*" ;;
    *) return 1 ;;
  esac
}

pack_plugin_key() {
  case "$1" in
    ui-ux) echo "ui-ux-pro-max@ui-ux-pro-max-skill" ;;
    *) return 1 ;;
  esac
}

pack_set_plugin() { # $1 key, $2 on|off
  node -e '
    const fs = require("fs"), f = process.argv[1], j = JSON.parse(fs.readFileSync(f, "utf8"));
    j.enabledPlugins = j.enabledPlugins || {}; j.enabledPlugins[process.argv[2]] = process.argv[3] === "on";
    fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n");
  ' "$PACK_SETTINGS" "$1" "$2"
}

cmd_pack() {
  pack_dirs
  local action="${1:-status}" name="${2:-}" pat p n
  if [ "$action" = status ]; then
    for name in bricks wp; do
      n=0; for p in $(pack_patterns "$name"); do n=$((n + $(ls -d "$PACK_ACTIVE"/$p 2>/dev/null | wc -l))); done
      echo "$name: active $n, parked $(( $(ls "$PACK_OFF/$name" 2>/dev/null | wc -l) ))"
    done
    if key=$(pack_plugin_key ui-ux); then
      grep -q "\"$key\": true" "$PACK_SETTINGS" 2>/dev/null && echo "ui-ux: on" || echo "ui-ux: off"
    fi
    return 0
  fi
  [ "$action" = on ] || [ "$action" = off ] || die "pack: 'pack status', 'pack on <name>' or 'pack off <name>' (names: bricks, wp, ui-ux)"
  if key=$(pack_plugin_key "$name" 2>/dev/null); then
    pack_set_plugin "$key" "$action" && echo "$name $action (next session)"
    return 0
  fi
  pat=$(pack_patterns "$name") || die "pack: unknown pack '$name' (bricks, wp, ui-ux)"
  mkdir -p "$PACK_OFF/$name"
  if [ "$action" = on ]; then
    shopt -s nullglob; local items=("$PACK_OFF/$name"/*); shopt -u nullglob
    [ ${#items[@]} -gt 0 ] || { echo "pack on $name: nothing parked"; return 0; }
    mv "${items[@]}" "$PACK_ACTIVE"/ && echo "$name on: ${#items[@]} skills (next session)"
  else
    local moved=0 f
    set -f; for p in $pat; do set +f; for f in "$PACK_ACTIVE"/$p; do [ -e "$f" ] && mv "$f" "$PACK_OFF/$name"/ && moved=$((moved + 1)); done; set -f; done; set +f
    echo "$name off: $moved skills parked (next session)"
  fi
}

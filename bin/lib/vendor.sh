# Vendored tools and the standalone plugins they replace. Sourced by bin/lean-gate.
#   lean-gate vendor status            versions of the vendored tools and which standalone plugins are still enabled
#   lean-gate vendor update ponytail|icm   fetch the latest from its repo into vendor/ (review the diff, then commit)
#   lean-gate vendor retire            switch off the standalone plugins the hub contains (next session)

vendor_root() { cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd; }

cmd_vendor() {
  local root; root=$(vendor_root)
  case "${1:-status}" in
    status)
      local n v
      for n in ponytail wp-audit icm; do
        v=$(cut -d' ' -f1 "$root/vendor/$n/VERSION" 2>/dev/null)
        echo "$n: ${v:-not vendored}"
      done
      local s="${LEAN_SETTINGS:-$HOME/.claude/settings.json}" k
      for k in ponytail@ponytail wp-woo-performance-audit@wp-woo-performance-audit; do
        grep -q "\"$k\": true" "$s" 2>/dev/null && echo "standalone still on: $k"
      done
      return 0 ;;
    update)
      if [ "${2:-}" = icm ]; then
        local t2; t2=$(mktemp -d)
        git clone -q --depth 1 https://github.com/RinDig/icm-architect.git "$t2/icm" || { rm -rf "$t2"; die "vendor update: clone failed"; }
        local x; for x in SKILL.md references assets scripts; do rm -rf "$root/vendor/icm/skills/icm-architect/$x"; cp -r "$t2/icm/$x" "$root/vendor/icm/skills/icm-architect/"; done
        cp "$t2/icm/LICENSE" "$root/vendor/icm/LICENSE"; echo "$(git -C "$t2/icm" rev-parse --short HEAD) https://github.com/RinDig/icm-architect" > "$root/vendor/icm/VERSION"
        rm -rf "$t2"; echo "icm-architect updated: review with git diff, run the tests, then commit"; return 0
      fi
      [ "${2:-}" = ponytail ] || die "vendor update: ponytail or icm"
      local tag tmp
      tag=$(gh api repos/DietrichGebert/ponytail/releases/latest --jq .tag_name 2>/dev/null) || die "vendor update: could not read the latest ponytail tag"
      tmp=$(mktemp -d)
      git clone -q --depth 1 --branch "$tag" https://github.com/DietrichGebert/ponytail.git "$tmp/pt" || { rm -rf "$tmp"; die "vendor update: clone failed"; }
      local f
      for f in activate config instructions map mode-tracker runtime subagent; do cp "$tmp/pt/hooks/ponytail-$f.js" "$root/vendor/ponytail/hooks/"; done
      rm -rf "$root/vendor/ponytail/skills" && cp -r "$tmp/pt/skills" "$root/vendor/ponytail/skills"
      cp "$tmp/pt/LICENSE" "$root/vendor/ponytail/LICENSE"
      echo "${tag#v} https://github.com/DietrichGebert/ponytail" > "$root/vendor/ponytail/VERSION"
      rm -rf "$tmp"; echo "ponytail updated to ${tag#v}: review with git diff, run the tests, then commit"
      return 0 ;;
    retire)
      local s="${LEAN_SETTINGS:-$HOME/.claude/settings.json}"
      [ -f "$s" ] || die "vendor retire: no settings file"
      # Keep the first backup: a second run would back up the already retired file
      [ -e "$s.bak" ] || cp "$s" "$s.bak"
      node -e '
        const fs = require("fs"), f = process.argv[1], j = JSON.parse(fs.readFileSync(f, "utf8"));
        j.enabledPlugins = j.enabledPlugins || {};
        for (const k of ["ponytail@ponytail", "wp-woo-performance-audit@wp-woo-performance-audit", "lean-gate@lean-gate-local"]) if (k in j.enabledPlugins) j.enabledPlugins[k] = false;
        fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n");
      ' "$s" && echo "standalone ponytail, wp-woo-performance-audit and the old lean-gate-local mod switched off (next session; the old file is kept as settings.json.bak)"
      return 0 ;;
    *) die "vendor: status | update ponytail | retire" ;;
  esac
}

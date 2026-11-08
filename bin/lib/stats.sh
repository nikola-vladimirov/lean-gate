# lean-gate stats: rule hits per rule and per project from the violation log. Sourced by bin/lean-gate.

cmd_stats() {
  local days="${1:-7}" log since
  case "$days" in ''|*[!0-9]*) die "stats: days must be a whole number" ;; esac
  log="${LEAN_VIOLATIONS:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}/lean-violations.tsv}"
  [ -f "$log" ] || { echo "no rule hits logged yet ($log)"; return 0; }
  # GNU date, then BSD date; the log's ISO times compare as text.
  since=$(date -u -d "-$days days" +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -u -v-"$days"d +%Y-%m-%dT%H:%M:%S)
  # Old rule ids count under their new name (RENAMED_RULES in hooks/gate.ts).
  awk -F'\t' -v since="$since" -v days="$days" -v file="$log" '
    $1 >= since && NF >= 4 {
      r = $3; if (r == "lean-project-first") r = "lean-gate-first"
      n++; rule[r]++; act[r, $4]++; proj[$2]++
    }
    END {
      na = split("block warn allow-once", acts, " ")
      printf "rule hits in the last %d days: %d (%s keeps the last 2000)\n", days, n, file
      if (!n) exit
      print "by rule:"
      for (r in rule) {
        s = ""; for (i = 1; i <= na; i++) if ((r, acts[i]) in act) s = s (s == "" ? "" : ", ") act[r, acts[i]] " " acts[i]
        printf "  %5d  %s  (%s)\n", rule[r], r, s | "sort -k1,1nr -k2"
      }
      close("sort -k1,1nr -k2")
      print "by project:"
      for (p in proj) printf "  %5d  %s\n", proj[p], p | "sort -k1,1nr -k2 "
      close("sort -k1,1nr -k2 ")
    }' "$log"
}

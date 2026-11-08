# ICM workspace checks from the vendored icm-architect scripts (MIT, standard-library Python 3). Sourced by bin/lean-gate.
#   lean-gate icm links [root]     every relative link and input path that does not resolve; exit 1 if any (part of the walk test)
#   lean-gate icm index <folder>   write _index.md in the folder
#   lean-gate icm viz [root]       draw the workspace as one interactive graph
icm_dir() { cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd; }

cmd_icm() {
  local what="${1:-}" py scripts
  scripts="$(icm_dir)/vendor/icm/skills/icm-architect/scripts"
  case "$what" in links|index|viz) shift ;; *) die "icm: links | index <folder> | viz [root]" ;; esac
  local c; for c in python3 python py; do "$c" -c "import sys" >/dev/null 2>&1 && { py=$c; break; }; done
  [ -n "${py:-}" ] || die "icm: Python 3 is not installed"
  "$py" -I "$scripts/$what.py" "$@"
}

# Project memory: what happened in a project, kept small and linked to other projects, so a project last touched a year ago
# comes back for one line at session start and a few notes on demand. Sourced by bin/lean-gate.
#   lean-gate memory add "<text>" [--tag decision|state|link|note] [--project P]
#   lean-gate memory list [--project P]       numbered notes
#   lean-gate memory recall [--project P]     the notes, plus the newest three of each linked project (capped)
#   lean-gate memory forget <n> [--project P] move note n to notes-archive.md (never deleted)
#   lean-gate memory link|unlink <other> [--project P]
#   lean-gate memory index [--project P]      the one-line summary the session start prints; nothing when there is no memory
#   lean-gate memory projects                 every project with notes and its note count
# Store: $LEAN_MEMORY, else ~/.claude/lean-gate/memory/<project>/{notes.md,notes-archive.md,links}.
# The project is the git top-level folder's name (else the working folder's), lowercased; --project overrides it.

mem_root() { echo "${LEAN_MEMORY:-$HOME/.claude/lean-gate/memory}"; }

mem_key() { # $1 optional name
  local n="${1:-}"
  if [ -z "$n" ]; then
    n=$(git rev-parse --show-toplevel 2>/dev/null); n=${n:-$PWD}; n=${n##*/}
  fi
  local k; k=$(printf '%s' "$n" | tr 'A-Z' 'a-z' | sed 's/[^a-z0-9._-]/-/g; s/^[-.]*//; s/-*$//')
  # A name with no ASCII letters (Cyrillic, for one) still gets a stable key.
  [ -n "$k" ] || [ -z "$n" ] || k="p-$(printf '%s' "$n" | cksum | cut -d' ' -f1)"
  printf '%s' "$k"
}

# Splits "--project P" and "--tag T" out of the arguments: sets MEM_PROJECT, MEM_TAG and MEM_ARGS (the rest, one per line).
mem_args() {
  MEM_PROJECT=""; MEM_TAG=note; MEM_ARGS=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --project) MEM_PROJECT="${2:-}"; shift; [ $# -gt 0 ] && shift ;;
      --tag) MEM_TAG="${2:-}"; shift; [ $# -gt 0 ] && shift ;;
      *) MEM_ARGS="${MEM_ARGS}${MEM_ARGS:+
}$1"; shift ;;
    esac
  done
}

mem_count() { local n; n=$(grep -c '^- ' "$1/notes.md" 2>/dev/null); echo "${n:-0}"; }
mem_cut() { printf '%s' "$1" | awk -v n="$2" '{ print (length($0) > n ? substr($0, 1, n - 1) "…" : $0) }'; }

cmd_memory() {
  local sub="${1:-}" d key n text tag f
  [ $# -gt 0 ] && shift
  mem_args "$@"; key=$(mem_key "$MEM_PROJECT"); d="$(mem_root)/$key"
  [ -n "$key" ] || die "memory: no project name (use --project)"
  case "$sub" in
    add)
      # Unquoted words are one note: every argument joined with spaces.
      text=$(printf '%s' "$MEM_ARGS" | tr '\n' ' ' | sed 's/ *$//'); tag=$MEM_TAG
      case "$tag" in decision|state|link|note) ;; *) die "memory add: tag is decision, state, link or note" ;; esac
      [ -n "$text" ] || die "memory add: give the note text"
      mkdir -p "$d" && printf -- '- %s [%s] %s\n' "$(date +%F)" "$tag" "$(printf '%s' "$text" | tr '\n' ' ')" >> "$d/notes.md"
      echo "memory: noted for $key ($(mem_count "$d") notes)" ;;
    list)
      [ -f "$d/notes.md" ] && grep -n '^- ' "$d/notes.md" | sed 's/^\([0-9]*\):- /\1  /' || echo "memory: nothing for $key" ;;
    recall)
      [ -f "$d/notes.md" ] || [ -f "$d/links" ] || { echo "memory: nothing for $key"; return 0; }
      echo "# $key"; [ -f "$d/notes.md" ] && tail -n 20 "$d/notes.md"
      [ -f "$d/links" ] && while IFS= read -r l; do
        [ -n "$l" ] && [ -f "$(mem_root)/$l/notes.md" ] && { echo "# linked: $l"; tail -n 3 "$(mem_root)/$l/notes.md"; }
      done < "$d/links"
      ;;
    forget)
      n=$(printf '%s' "$MEM_ARGS" | head -n 1)
      case "$n" in ''|*[!0-9]*) die "memory forget: give the note number (memory list)" ;; esac
      [ -f "$d/notes.md" ] && [ "$n" -ge 1 ] && [ "$n" -le "$(wc -l < "$d/notes.md")" ] || die "memory forget: no note $n for $key"
      sed -n "${n}p" "$d/notes.md" >> "$d/notes-archive.md"
      # A temp file, not sed -i: BSD sed reads the next argument as a backup suffix
      sed "${n}d" "$d/notes.md" > "$d/notes.md.tmp" && mv "$d/notes.md.tmp" "$d/notes.md" && echo "memory: note $n moved to notes-archive.md" ;;
    link|unlink)
      n=$(mem_key "$(printf '%s' "$MEM_ARGS" | head -n 1)")
      [ -n "$n" ] && [ "$n" != "$key" ] || die "memory $sub: give another project's name"
      # A link needs both projects to exist (a mistyped name must not create a folder).
      [ "$sub" = unlink ] || [ -d "$(mem_root)/$n" ] || die "memory link: no memory for $n (lean-gate memory projects)"
      mkdir -p "$d"
      for pair in "$key:$n" "$n:$key"; do
        f="$(mem_root)/${pair%%:*}/links"; [ -d "$(dirname "$f")" ] || continue
        touch "$f"
        grep -vxF "${pair##*:}" "$f" > "$f.tmp"; mv "$f.tmp" "$f"
        [ "$sub" = link ] && echo "${pair##*:}" >> "$f"
      done
      echo "memory: $key $sub""ed $n" ;;
    index)
      n=$(mem_count "$d")
      [ "$n" -gt 0 ] || [ -s "$d/links" ] || return 0
      text="memory $key: $n notes"
      [ "$n" -gt 0 ] && text="$text, last $(tail -n 1 "$d/notes.md" | cut -d' ' -f2); newest: $(mem_cut "$(tail -n 1 "$d/notes.md" | sed 's/^- [0-9-]* //')" 90)"
      [ -s "$d/links" ] && text="$text; linked: $(tr '\n' ' ' < "$d/links" | sed 's/ $//; s/ /, /g')"
      echo "$text" ;;
    projects)
      for f in "$(mem_root)"/*/; do [ -d "$f" ] && echo "$(mem_count "${f%/}")  $(basename "$f")"; done | sort -rn ;;
    *) die "memory: add, list, recall, forget, link, unlink, index or projects" ;;
  esac
}

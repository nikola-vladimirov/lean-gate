# Selftest for bin/lean-gate. Sourced by it, not run directly.

cmd_selftest() {
  local tmp f fail=0
  tmp=$(mktemp -d) || die "selftest: no temp dir"
  # Expanded now: $tmp is local and gone when a die mid-test reaches the EXIT trap
  trap "rm -rf '$tmp'" EXIT
  f="$tmp/doc.md"
  { echo "# T"; echo "intro"; i=0; while [ $i -lt 90 ]; do echo x; i=$((i + 1)); done
    printf '%s\n' '## A' a '### A1' a1 '```' '## not a heading' '```' '## B' b; } > "$f"
  cmd_toc "$f" > /dev/null
  [ "$(grep -c '^ *- [0-9]*-[0-9]*: ' "$f")" = 3 ] || { echo "FAIL toc entry count"; fail=1; }
  grep '^ *- [0-9]*-[0-9]*: ' "$f" | while IFS= read -r e; do
    s=$(echo "$e" | sed 's/^ *- \([0-9]*\)-.*/\1/'); t=$(echo "$e" | sed 's/^ *- [0-9]*-[0-9]*: //')
    sed -n "${s}p" "$f" | grep -qx "##* $t" || echo "FAIL toc entry points off its heading: $e"
  done | grep FAIL && fail=1
  cp "$f" "$tmp/again.md"; cmd_toc "$tmp/again.md" > /dev/null
  cmp -s "$f" "$tmp/again.md" || { echo "FAIL toc second run changed the file"; fail=1; }
  printf '%s\n' '<?php' 'class Foo {' '    public function bar() {' '    }' '    private static function baz() {' '    }' '}' 'function top() {' '}' > "$tmp/a.php"
  out=$(map_file "$tmp/a.php")
  echo "$out" | grep -q '^ *2-7 *class Foo' || { echo "FAIL map class range"; fail=1; }
  echo "$out" | grep -q '^ *3-4 *  public function bar()' || { echo "FAIL map method range"; fail=1; }
  echo "$out" | grep -q '^ *8-9 *function top()' || { echo "FAIL map top-level function"; fail=1; }
  export LEAN_BOARD="$tmp/b/BOARD.md"
  cmd_board add T1 Parser; cmd_board add T2 'API | client'
  LEAN_AS=s1 cmd_board move T1 doing; LEAN_AS=h2 cmd_board move T2 blocked needs date format
  LEAN_AS=s1 cmd_board note T1 dates are ISO 8601
  out=$(cmd_board)
  echo "$out" | grep -q '^DOING' && echo "$out" | grep -q 'T1 *Parser (s1)$' || { echo "FAIL board doing column"; fail=1; }
  echo "$out" | grep -q 'T2 *API | client (h2): needs date format$' || { echo "FAIL board blocked card"; fail=1; }
  cmd_board T1 | grep -q 'note  dates are ISO 8601$' || { echo "FAIL board card history"; fail=1; }
  # check gate: a broken PHP file sends its card back to todo; a clean one lets it reach done
  if command -v php >/dev/null 2>&1; then
    printf '<?php\necho "ok";\n' > "$tmp/good.php"
    printf '<?php\necho "ok"\n' > "$tmp/bad.php"
    cmd_board add T9 Gated > /dev/null
    cmd_board files T9 "$tmp/bad.php" > /dev/null
    cmd_board move T9 done > /dev/null 2>&1 && { echo "FAIL gate let a broken file through"; fail=1; }
    cmd_board T9 | head -n 1 | grep -q '\[todo\]' || { echo "FAIL gate did not roll the card back to todo"; fail=1; }
    cmd_board T9 | grep -q 'move  *todo gate failed' || { echo "FAIL gate reason not on the card"; fail=1; }
    cmd_board files T9 "$tmp/good.php" > /dev/null
    cmd_board move T9 done > /dev/null 2>&1 || { echo "FAIL gate blocked a clean file"; fail=1; }
    cmd_board T9 | head -n 1 | grep -q '\[done\]' || { echo "FAIL clean card not done"; fail=1; }
  fi
  # gate: a path with a space stays one path, from the card's list and from arguments
  mkdir -p "$tmp/sp ace"; : > "$tmp/sp ace/a.txt"; : > "$tmp/b c.txt"
  cmd_board add T7 Spaced > /dev/null; cmd_board files T7 "$tmp/sp ace/a.txt" "$tmp/b c.txt" > /dev/null
  cmd_board move T7 done > /dev/null 2>&1 || { echo "FAIL gate split a card's path with a space"; fail=1; }
  check_gate T7 "$tmp/sp ace/a.txt" > /dev/null 2>&1 || { echo "FAIL gate split an argument path with a space"; fail=1; }
  # memory: notes, a numbered list, forget (archived), links both ways, a one-line index, nothing printed when empty
  export LEAN_MEMORY="$tmp/mem"
  [ -z "$(cmd_memory index --project alpha)" ] || { echo "FAIL memory index not empty for a new project"; fail=1; }
  cmd_memory add "chose Laravel" --tag decision --project alpha > /dev/null
  cmd_memory add "login works" --project alpha > /dev/null
  cmd_memory add "uses alpha api" --project beta > /dev/null
  cmd_memory link beta --project alpha > /dev/null
  cmd_memory list --project alpha | grep -q '^1  .*decision. chose Laravel$' || { echo "FAIL memory list"; fail=1; }
  cmd_memory index --project alpha | grep -q '^memory alpha: 2 notes, last .*newest: .note. login works; linked: beta$' || { echo "FAIL memory index line"; fail=1; }
  cmd_memory index --project beta | grep -q 'linked: alpha$' || { echo "FAIL memory link not both ways"; fail=1; }
  cmd_memory recall --project alpha | grep -q '^# linked: beta$' || { echo "FAIL memory recall misses a linked project"; fail=1; }
  cmd_memory forget 1 --project alpha > /dev/null
  [ "$(( $(cmd_memory list --project alpha | wc -l) ))" = 1 ] && grep -q 'chose Laravel' "$tmp/mem/alpha/notes-archive.md" || { echo "FAIL memory forget did not archive"; fail=1; }
  cmd_memory unlink beta --project alpha > /dev/null
  cmd_memory index --project alpha | grep -q 'linked' && { echo "FAIL memory unlink"; fail=1; }
  # memory (review fixes): unquoted words are one note; forgetting the last note leaves a clean count; a mistyped link target is refused
  cmd_memory add fixed the login bug --project gamma > /dev/null
  cmd_memory list --project gamma | grep -q 'fixed the login bug$' || { echo "FAIL memory unquoted note"; fail=1; }
  cmd_memory forget 1 --project gamma > /dev/null
  [ "$(cmd_memory projects | grep -c 'gamma')" = 1 ] && [ -z "$(cmd_memory projects | grep -v '^[0-9]*  ')" ] || { echo "FAIL memory projects output after forgetting the last note"; fail=1; }
  (cmd_memory link nosuchproject --project gamma) > /dev/null 2>&1 && { echo "FAIL memory linked a project that does not exist"; fail=1; }
  [ ! -d "$tmp/mem/nosuchproject" ] || { echo "FAIL memory link created a folder"; fail=1; }
  # memory: a decision in a repo with a PLAN file also points at that file's decision log (found from a subfolder too)
  mp="$tmp/mp"; mkdir -p "$mp/docs" "$mp/sub"; (cd "$mp" && git init -q); : > "$mp/docs/PLAN.md"
  (cd "$mp/sub" && cmd_memory add "use sqlite" --tag decision --project alpha) | grep -qx "Also record it in docs/PLAN.md's decision log: the repo is the source of truth." || { echo "FAIL memory decision did not point at the plan"; fail=1; }
  unset LEAN_MEMORY
  # frontier: open decisions whose prerequisites are settled come first; the others wait
  printf '%s\n' '## 3. Decisions' '' '| # | Decision | Default | Status |' '|---|---|---|---|' \
    '| D1 | Storage | sqlite | decided |' '| D2 | Auth provider | none | open |' \
    '| D3 | Sync model, needs D2 | pull | open |' '| D4 | Theme | light | open |' > "$tmp/PLAN.md"
  fr=$(cmd_frontier "$tmp/PLAN.md")
  echo "$fr" | grep -q '^  D2  Auth provider$' || { echo "FAIL frontier missed D2"; fail=1; }
  echo "$fr" | grep -q '^  D3  waits for D2$' || { echo "FAIL frontier did not hold D3"; fail=1; }
  # lessons: the second sighting becomes a local rule; the entries move to the archive
  export LESSONS_FILE="$tmp/lessons/LESSONS.md"
  cmd_lesson "Haiku passes fixture work at low effort" --mode build > /dev/null
  grep -q 'Haiku passes' "$LESSONS_FILE" || { echo "FAIL lesson not recorded"; fail=1; }
  cmd_lesson "Haiku passes fixture work at low effort" --mode build > /dev/null
  grep -q '^- Haiku passes fixture work at low effort$' "$LESSONS_FILE" || { echo "FAIL repeated lesson not promoted"; fail=1; }
  grep -q '^- [0-9].*Haiku passes' "$LESSONS_FILE" && { echo "FAIL promoted entries not moved out"; fail=1; }
  grep -q 'Haiku passes' "$tmp/lessons/LESSONS-ARCHIVE.md" || { echo "FAIL promoted entries not archived"; fail=1; }
  # a promoted lesson keeps its backslashes; a trailing --mode ends the parse instead of looping
  cmd_lesson 'Root is E:\Claude Sessions\new' > /dev/null; cmd_lesson 'Root is E:\Claude Sessions\new' > /dev/null
  grep -qF -- '- Root is E:\Claude Sessions\new' "$LESSONS_FILE" || { echo "FAIL promoted lesson lost its backslashes"; fail=1; }
  (cmd_lesson "trailing flag" --mode > /dev/null) & lp=$!
  for _ in 1 2 3 4 5 6 7 8 9 10; do kill -0 $lp 2>/dev/null || break; sleep 0.2; done
  kill $lp 2>/dev/null && { echo "FAIL lesson looped on a trailing --mode"; fail=1; }
  wait $lp 2>/dev/null
  # review lists an old unpromoted lesson, not a fresh one; drop moves it to the archive, marked superseded
  printf -- '- 2026-01-01 | - | build | Old unpromoted lesson\n' >> "$LESSONS_FILE"
  printf -- '- %s | - | build | Fresh unpromoted lesson\n' "$(date +%F)" >> "$LESSONS_FILE"
  rv=$(bash "$0" lessons review 14)
  bash "$0" lessons drop "Fresh unpromoted lesson" > /dev/null
  grep -q 'Fresh unpromoted lesson (superseded)' "$tmp/lessons/LESSONS-ARCHIVE.md" || { echo "FAIL lessons drop from the command line"; fail=1; }
  printf -- '- %s | - | build | Fresh unpromoted lesson\n' "$(date +%F)" >> "$LESSONS_FILE"
  echo "$rv" | grep -q 'Old unpromoted lesson' || { echo "FAIL lessons review missed an old lesson"; fail=1; }
  echo "$rv" | grep -q 'Fresh unpromoted lesson' && { echo "FAIL lessons review listed a fresh lesson"; fail=1; }
  cmd_lesson_drop "Old unpromoted lesson" > /dev/null
  grep -q 'Old unpromoted lesson' "$LESSONS_FILE" && { echo "FAIL lessons drop left the entry"; fail=1; }
  grep -q 'Old unpromoted lesson (superseded)' "$tmp/lessons/LESSONS-ARCHIVE.md" || { echo "FAIL lessons drop did not archive it"; fail=1; }
  unset LESSONS_FILE
  # board: a retried post is written once
  bd="$tmp/bd.md"; LEAN_BOARD="$bd" board_append add T9 "retry test" > /dev/null; LEAN_BOARD="$bd" board_append add T9 "retry test" > /dev/null
  [ "$(grep -c 'retry test' "$bd")" = 1 ] || { echo "FAIL board kept a retried post twice"; fail=1; }
  # board: a move back to an earlier status and a shorter note after a longer one are kept
  for x in doing 'blocked x' doing; do LEAN_BOARD="$bd" board_append move T8 "$x"; done
  [ "$(grep -c '| move | T8 | doing$' "$bd")" = 2 ] || { echo "FAIL board dropped a repeated move"; fail=1; }
  LEAN_BOARD="$bd" board_append note T8 "dates are ISO"; LEAN_BOARD="$bd" board_append note T8 "dates"
  grep -q '| note | T8 | dates$' "$bd" || { echo "FAIL board dropped a shorter note"; fail=1; }
  # board: with no LEAN_BOARD a worktree writes the main checkout's board, so every worktree shares one
  bw="$tmp/bw"; mkdir -p "$bw"
  (cd "$bw" && git init -q && git -c user.email=t@t -c user.name=t commit -q --allow-empty -m a && git worktree add --detach "$tmp/bw-wt" > /dev/null 2>&1)
  (unset LEAN_BOARD; cd "$tmp/bw-wt" && cmd_board add W1 "shared card" > /dev/null)
  grep -q 'W1 | shared card' "$bw/docs/BOARD.md" 2>/dev/null && [ ! -e "$tmp/bw-wt/docs/BOARD.md" ] || { echo "FAIL board in a worktree did not use the main checkout's board"; fail=1; }
  # board archive: refused while a card is doing; --force appends the board verbatim under a dated heading and removes it
  ba="$tmp/ba/BOARD.md"; LEAN_BOARD="$ba" cmd_board add A1 first > /dev/null; LEAN_BOARD="$ba" cmd_board move A1 doing > /dev/null
  (LEAN_BOARD="$ba" cmd_board archive) > /dev/null 2>&1 && { echo "FAIL board archive ran with a card doing"; fail=1; }
  cp "$ba" "$tmp/ba/copy"; (LEAN_BOARD="$ba" cmd_board archive --force) > /dev/null 2>&1
  [ ! -e "$ba" ] && grep -q '^## Archived [0-9-]* [0-9:]*$' "$tmp/ba/BOARD-ARCHIVE.md" 2>/dev/null \
    && tail -n "$(( $(wc -l < "$tmp/ba/copy") ))" "$tmp/ba/BOARD-ARCHIVE.md" | cmp -s - "$tmp/ba/copy" || { echo "FAIL board archive --force"; fail=1; }
  # board archive: a line another agent appends while the board is copied (simulated in cat) starts the next board
  bl="$tmp/bl/BOARD.md"; LEAN_BOARD="$bl" cmd_board add L1 first > /dev/null
  (cat() { command cat "$@"; echo '- late line' >> "$bl"; }; LEAN_BOARD="$bl" cmd_board archive) > /dev/null 2>&1
  grep -qx -- '- late line' "$bl" 2>/dev/null && ! ls "$tmp/bl" | grep -q '\.arch\.' || { echo "FAIL board archive lost a line appended meanwhile"; fail=1; }
  # board: the view hints at archiving once every card is done; export prints a markdown summary and writes nothing
  bh="$tmp/bh.md"; LEAN_BOARD="$bh" cmd_board add H1 "Hint card" > /dev/null; LEAN_BOARD="$bh" cmd_board note H1 "a note" > /dev/null
  LEAN_BOARD="$bh" cmd_board | grep -q '^Archive hint' && { echo "FAIL board archive hint with a card open"; fail=1; }
  LEAN_GATE_SKIP=1 LEAN_BOARD="$bh" cmd_board move H1 done > /dev/null
  LEAN_BOARD="$bh" cmd_board | grep -q '^Archive hint: every card is done' || { echo "FAIL board archive hint"; fail=1; }
  cp "$bh" "$tmp/bh.copy"; bx=$(LEAN_BOARD="$bh" cmd_board export H1 2>&1)
  [ "$bx" = "$(printf -- '- **H1** Hint card: done (lead)\n  - lead: a note')" ] && cmp -s "$bh" "$tmp/bh.copy" || { echo "FAIL board export was: $bx"; fail=1; }
  (LEAN_BOARD="$bh" cmd_board export NOPE) > /dev/null 2>&1 && { echo "FAIL board export took an unknown card"; fail=1; }
  # review scope: a repo with one tag and one new file lists that file; a full review is due with no record
  rs="$tmp/rs"; mkdir -p "$rs"; self="$(cd "$(dirname "$0")" && pwd)/lean-gate"
  (cd "$rs" && git init -q && git -c user.email=t@t -c user.name=t commit -q --allow-empty -m base && git tag v1.0.0 && echo x > new.php)
  rsout=$(cd "$rs" && CLAUDE_PLUGIN_DATA="$tmp/rsd" bash "$self" review-scope)
  echo "$rsout" | grep -q 'new.php' || { echo "FAIL review-scope missed a changed file"; fail=1; }
  echo "$rsout" | grep -q 'Full review due: yes: no full review recorded' || { echo "FAIL review-scope did not ask for a first full review"; fail=1; }
  (cd "$rs" && CLAUDE_PLUGIN_DATA="$tmp/rsd" bash "$self" review-scope --full-done > /dev/null)
  (cd "$rs" && CLAUDE_PLUGIN_DATA="$tmp/rsd" bash "$self" review-scope) | grep -q 'Full review due: no: 0 release' || { echo "FAIL review-scope after a full review"; fail=1; }
  # review scope: a full review recorded in another repo does not replace this repo's record
  ro="$tmp/ro"; mkdir -p "$ro"
  (cd "$ro" && git init -q && git -c user.email=t@t -c user.name=t commit -q --allow-empty -m a && git tag v0.5.0 && CLAUDE_PLUGIN_DATA="$tmp/rsd" bash "$self" review-scope --full-done > /dev/null)
  (cd "$rs" && CLAUDE_PLUGIN_DATA="$tmp/rsd" bash "$self" review-scope) | grep -q 'Full review due: no: 0 release' || { echo "FAIL review-scope record overwritten by another repo"; fail=1; }
  # review scope: a beta sorts before its release, so v1.0.0 counts as one release after v1.0.0-beta.2
  rb="$tmp/rb"; mkdir -p "$rb"
  (cd "$rb" && git init -q && git -c user.email=t@t -c user.name=t commit -q --allow-empty -m a && git tag v1.0.0-beta.1 \
    && git -c user.email=t@t -c user.name=t commit -q --allow-empty -m b && git tag v1.0.0-beta.2 \
    && CLAUDE_PLUGIN_DATA="$tmp/rbd" bash "$self" review-scope --full-done > /dev/null \
    && git -c user.email=t@t -c user.name=t commit -q --allow-empty -m c && git tag v1.0.0)
  (cd "$rb" && CLAUDE_PLUGIN_DATA="$tmp/rbd" bash "$self" review-scope) | grep -q 'Full review due: no: 1 release' || { echo "FAIL review-scope sorted a beta after its release"; fail=1; }
  # review scope: card codes that start a commit subject since the tag, once each, by prefix then number
  (cd "$rb" && for m in 'EN10 later' 'EN8 Fibank' 'CM2: x' 'EN8 again' 'fix EN9 inside' 'EN11x glued' 'ABCDE1 long'; do git -c user.email=t@t -c user.name=t commit -q --allow-empty -m "$m"; done)
  (cd "$rb" && CLAUDE_PLUGIN_DATA="$tmp/rbd" bash "$self" review-scope) | grep -qx 'Cards in this release: CM2 EN8 EN10' || { echo "FAIL review-scope cards line"; fail=1; }
  # sessions: --here lists only this project's drafts, and the list says where each one is
  ss="$tmp/ss"; mkdir -p "$ss/alpha" "$ss/data/sessions"
  printf 'Project: alpha\n' > "$ss/data/sessions/2026-11-01-aaaa.md"
  printf 'Project: beta\n' > "$ss/data/sessions/2026-11-02-bbbb.md"
  self="$(cd "$(dirname "$0")" && pwd)/lean-gate"
  here=$(cd "$ss/alpha" && CLAUDE_PLUGIN_DATA="$ss/data" bash "$self" sessions 5 --here)
  echo "$here" | grep -q 'aaaa' || { echo "FAIL sessions --here missed this project's draft"; fail=1; }
  echo "$here" | grep -q 'bbbb' && { echo "FAIL sessions --here listed another project"; fail=1; }
  all=$(cd "$ss/alpha" && CLAUDE_PLUGIN_DATA="$ss/data" bash "$self" sessions 5)
  echo "$all" | grep -q 'bbbb' || { echo "FAIL sessions missed a draft"; fail=1; }
  # sessions: the newest is by the date in the name, not the file time
  printf 'Project: alpha\n' > "$ss/data/sessions/2026-11-03-cccc.md"; touch -t 202001010000 "$ss/data/sessions/2026-11-03-cccc.md"
  [ "$(cd "$ss/alpha" && CLAUDE_PLUGIN_DATA="$ss/data" bash "$self" sessions 1 --here | cut -f1,2)" = "2026-11-03	alpha" ] || { echo "FAIL sessions newest draft by name"; fail=1; }
  # data folder: with no CLAUDE_PLUGIN_DATA (the Bash tool, the panel) the installed plugin's folder is used, not a temp one
  dh="$tmp/dh"; mkdir -p "$dh/.claude/plugins/data/lean-gate-lean-gate/sessions" "$dh/alpha"
  printf 'Project: alpha\n' > "$dh/.claude/plugins/data/lean-gate-lean-gate/sessions/2026-11-04-dddd.md"
  (cd "$dh/alpha" && unset CLAUDE_PLUGIN_DATA CLAUDE_PLUGIN_OPTION_SESSION_DRAFTS_DIR && HOME="$dh" bash "$self" sessions 5 --here) | grep -q 'dddd' || { echo "FAIL data folder lookup without CLAUDE_PLUGIN_DATA"; fail=1; }
  # setup nag: printed in three sessions per project, then stops
  sn="$tmp/nag"; mkdir -p "$sn/proj/docs"
  for i in 1 2 3 4; do
    n=$(cd "$sn/proj" && CLAUDE_PLUGIN_DATA="$sn/data" CLAUDE_PLUGIN_ROOT="$(dirname "$self")/.." bash "$(dirname "$self")/../scripts/session-start.sh" </dev/null | grep -c 'setup not recorded')
    [ "$n" = $([ "$i" -le 3 ] && echo 1 || echo 0) ] || { echo "FAIL setup nag run $i printed $n"; fail=1; }
  done
  # session start: the lean-gate skill body (no frontmatter) under its marker in a project folder only, the whole output under
  # the hooks' 10000-character cap; markers older than 7 days are pruned and drafts older than 30 days move to sessions/archive/
  ssd="$tmp/ssd"; mkdir -p "$ssd/proj" "$ssd/plain" "$ssd/data/sessions/archive"; : > "$ssd/proj/CLAUDE.md"
  # an aged note that is not a dated draft stays; an aged draft never replaces an archived one of the same name
  echo kept > "$ssd/data/sessions/archive/2020-01-02-dup.md"; echo new > "$ssd/data/sessions/2020-01-02-dup.md"
  touch -t 202001010000 "$ssd/data/nudge-old" "$ssd/data/setup-nag-old" "$ssd/data/sessions/2020-01-01-old.md" \
    "$ssd/data/sessions/2020-01-02-dup.md" "$ssd/data/sessions/Sessions index.md"; : > "$ssd/data/nudge-new"
  sst() { (cd "$ssd/$1" && printf '{"source":"%s"}' "${2:-startup}" | HOME="$ssd" CLAUDE_CONFIG_DIR="$ssd/cfg" CLAUDE_PLUGIN_DATA="$ssd/data" CLAUDE_PLUGIN_ROOT="$(dirname "$self")/.." bash "$(dirname "$self")/../scripts/session-start.sh"); }
  so=$(sst proj)
  printf '%s\n' "$so" | grep -qx '\[lean-gate skill loaded at session start\]' && printf '%s\n' "$so" | grep -q '^# lean-gate' \
    && ! printf '%s\n' "$so" | grep -q '^name: lean-gate' && [ "${#so}" -lt 10000 ] || { echo "FAIL session start skill injection (${#so} characters)"; fail=1; }
  sst plain | grep -q 'skill loaded' && { echo "FAIL session start loaded the skill outside a project"; fail=1; }
  sst proj resume | grep -q 'skill loaded' && { echo "FAIL session start loaded the skill again on resume"; fail=1; }
  [ ! -e "$ssd/data/nudge-old" ] && [ -e "$ssd/data/nudge-new" ] && [ -e "$ssd/data/setup-nag-old" ] && [ -f "$ssd/data/sessions/archive/2020-01-01-old.md" ] || { echo "FAIL session start housekeeping"; fail=1; }
  [ -f "$ssd/data/sessions/Sessions index.md" ] && [ "$(cat "$ssd/data/sessions/archive/2020-01-02-dup.md")" = kept ] || { echo "FAIL session start archived a note that is not a draft, or overwrote an archived draft"; fail=1; }
  # session start in the fullest folder (WordPress, WooCommerce, the setup line, a delegation line, a draft, a memory note) stays under the cap too
  mkdir -p "$ssd/wp/docs"; : > "$ssd/wp/CLAUDE.md"; printf 'runner=opencode\n' > "$ssd/wp/.lean-project"
  printf '%s\n' '<?php' '/* Plugin Name: X' ' * WC requires at least: 9.0 (WooCommerce) */' > "$ssd/wp/x.php"
  printf 'Project: wp\n' > "$ssd/data/sessions/2026-11-20-wpdraft.md"
  (cd "$ssd/wp" && HOME="$ssd" bash "$self" memory add "a note" > /dev/null)
  so=$(sst wp)
  [ "$(printf '%s\n' "$so" | grep -c '^WordPress project detected\|^WooCommerce code detected\|^lean-gate setup not recorded\|^lean-gate: delegated work\|^lean-gate: this project.s newest session draft\|^lean-gate: memory wp:\|^\[lean-gate skill loaded')" = 7 ] \
    && [ "${#so}" -lt 10000 ] || { echo "FAIL session start in a WordPress project (${#so} characters)"; fail=1; }
  # cost and gain: the skill block is reported apart from the hook text (never "over budget"), and the hook leaves stdin alone
  co=$(cd "$ssd/proj" && printf 'keep\n' | { HOME="$ssd" CLAUDE_CONFIG_DIR="$ssd/cfg" bash "$self" cost . 2>&1; read -r x; echo "stdin: $x"; })
  echo "$co" | grep -q 'plus the lean-gate skill block' && ! echo "$co" | grep -q 'over budget\|HOOK: about 0 ' && echo "$co" | grep -qx 'stdin: keep' || { echo "FAIL cost counted the skill block as hook text, or ate stdin"; fail=1; }
  # ignore: an unregistered folder over 5000 files is listed with the fixed lines, a folder holding a registered project
  # (path in another case) is not, a dry run writes nothing, and --apply appends only missing lines after a final newline
  ig="$tmp/ig"; mkdir -p "$ig/w/big" "$ig/w/small" "$ig/cfg"; : > "$ig/w/small/a"; printf '*.zip' > "$ig/w/.ignore"
  awk -v d="$ig/w/big" 'BEGIN { for (i = 1; i <= 5001; i++) { f = d "/f" i; printf "" > f; close(f) } }'
  out=$(CLAUDE_CONFIG_DIR="$ig/cfg" cmd_ignore "$ig/w")
  echo "$out" | grep -qx '  /big/' && echo "$out" | grep -qx '  releases/' && ! echo "$out" | grep -q 'small\|zip' && [ "$(cat "$ig/w/.ignore")" = '*.zip' ] || { echo "FAIL ignore dry run was: $out"; fail=1; }
  printf '[{"name":"sub","path":"%s/big/sub"}]\n' "$(printf '%s' "$ig/w" | tr 'a-z' 'A-Z')" > "$ig/cfg/lean-projects.json"
  CLAUDE_CONFIG_DIR="$ig/cfg" cmd_ignore "$ig/w" | grep -q '/big/' && { echo "FAIL ignore listed a folder holding a registered project"; fail=1; }
  rm "$ig/cfg/lean-projects.json"; for _ in 1 2; do CLAUDE_CONFIG_DIR="$ig/cfg" cmd_ignore "$ig/w" --apply > /dev/null; done
  [ "$(tr -d '\r' < "$ig/w/.ignore" | tr '\n' ' ')" = '*.zip /big/ backups/ archive/ releases/ ' ] || { echo "FAIL ignore --apply wrote: $(cat "$ig/w/.ignore")"; fail=1; }
  # ignore: a whitelist hub repo hiding a child repo gets it back (!/repo/); a worktree child (.git file) and a plain folder do not
  hb="$tmp/hb"; mkdir -p "$hb/repo" "$hb/wt" "$hb/plain" "$ig/cfg"; git -C "$hb" init -q; git -C "$hb/repo" init -q; : > "$hb/wt/.git"
  printf '/*\n!/.gitignore\n' > "$hb/.gitignore"; out=$(CLAUDE_CONFIG_DIR="$ig/cfg" cmd_ignore "$hb")
  echo "$out" | grep -qx '  !/repo/' && ! echo "$out" | grep -q '!/wt/\|!/plain/' || { echo "FAIL ignore hidden repo was: $out"; fail=1; }
  # ignore: names Git Bash does not convert for native programs ([ or ') still reach rg and git; norg hides rg (the find fallback)
  mkdir -p "$hb/Nick's repo"; (cd "$hb/Nick's repo" && git init -q); out=$(CLAUDE_CONFIG_DIR="$ig/cfg" cmd_ignore "$hb")
  echo "$out" | grep -qxF "  !/Nick's repo/" || { echo "FAIL ignore missed a hidden repo named Nick's repo: $out"; fail=1; }
  norg() { ( command() { [ "${2:-}" = rg ] && return 1; builtin command "$@"; }; "$@" ); }
  mv "$ig/w/big" "$ig/w/Old [2024]"
  for r in "" norg; do
    out=$(CLAUDE_CONFIG_DIR="$ig/cfg" $r cmd_ignore "$ig/w")
    echo "$out" | grep -qxF '  /Old \[2024\]/' || { echo "FAIL ignore ${r:-rg} missed a folder named Old [2024]: $out"; fail=1; }
  done
  # ignore: the find fallback skips .git, node_modules and vendor, as rg does
  mkdir -p "$ig/w/kid"; mv "$ig/w/Old [2024]" "$ig/w/kid/node_modules"
  CLAUDE_CONFIG_DIR="$ig/cfg" norg cmd_ignore "$ig/w" | grep -q '/kid/' && { echo "FAIL ignore fallback counted node_modules"; fail=1; }
  # on-demand packs: skills move out and back, and the plugin switch flips, all inside the given folders
  pk="$tmp/pk"; mkdir -p "$pk/skills/wp-a" "$pk/skills/bricks-x" "$pk/skills/bricksextras-y" "$pk/skills/other"
  echo '{"enabledPlugins":{"ui-ux-pro-max@ui-ux-pro-max-skill":true}}' > "$pk/settings.json"
  pe() { LEAN_SKILLS="$pk/skills" LEAN_SKILLS_OFF="$pk/off" LEAN_SETTINGS="$pk/settings.json" bash "$self" pack "$@"; }
  pe off wp >/dev/null; pe off bricks >/dev/null
  [ -d "$pk/off/wp/wp-a" ] && [ -d "$pk/off/bricks/bricks-x" ] && [ -d "$pk/off/bricks/bricksextras-y" ] && [ -d "$pk/skills/other" ] \
    || { echo "FAIL pack off moved the wrong folders"; fail=1; }
  pe on bricks >/dev/null; [ -d "$pk/skills/bricksextras-y" ] || { echo "FAIL pack on bricks"; fail=1; }
  pe off ui-ux >/dev/null; grep -q '"ui-ux-pro-max@ui-ux-pro-max-skill": false' "$pk/settings.json" || { echo "FAIL pack off ui-ux"; fail=1; }
  pe status | grep -q '^wp: active 0, parked 1' || { echo "FAIL pack status"; fail=1; }
  # export: a generated note with frontmatter; a second export refuses to replace it
  ex="$tmp/vault/lessons.md"; mkdir -p "$tmp/vault"
  LESSONS_FILE="$tmp/lessons/LESSONS.md" bash "$(cd "$(dirname "$0")" && pwd)/lean-gate" lessons export "$ex" > /dev/null
  head -1 "$ex" | grep -q '^---$' || { echo "FAIL lessons export wrote no frontmatter"; fail=1; }
  LESSONS_FILE="$tmp/lessons/LESSONS.md" bash "$(cd "$(dirname "$0")" && pwd)/lean-gate" lessons export "$ex" > /dev/null 2>&1 && { echo "FAIL lessons export replaced a generated note"; fail=1; }
  # guard hint: the doc guard is named once per session (the em dash check belongs to lean-gate)
  gh="$tmp/gh"; mkdir -p "$gh"; : > "$gh/x.md"
  echo "{\"session_id\":\"s1\",\"file_path\":\"$gh/x.md\"}" | CLAUDE_PLUGIN_DATA="$gh/d" bash "$(dirname "$0")/../scripts/guard-hint.sh" | grep -q "docs-guard" || { echo "FAIL guard hint did not name the docs guard"; fail=1; }
  # pending note: the gate's end-of-turn misses reach Claude once, with quotes escaped, then the file is gone
  pn="$tmp/pn"; mkdir -p "$pn/lean-gate/pending"; printf 'lean-gate, last turn: state-file-fresh: "x"\n' > "$pn/lean-gate/pending/s1.txt"
  out=$(echo '{"session_id":"s1"}' | CLAUDE_CONFIG_DIR="$pn" bash "$(dirname "$0")/../scripts/pending-note.sh")
  printf '%s' "$out" | grep -q 'additionalContext":"lean-gate, last turn: state-file-fresh: \\"x\\""' || { echo "FAIL pending note was: $out"; fail=1; }
  [ -e "$pn/lean-gate/pending/s1.txt" ] && { echo "FAIL pending note was not removed"; fail=1; }
  [ -z "$(echo '{"session_id":"s1"}' | CLAUDE_CONFIG_DIR="$pn" bash "$(dirname "$0")/../scripts/pending-note.sh")" ] || { echo "FAIL pending note repeated"; fail=1; }
  # delegation: a runner removed in 2.0 is named once and skipped, so the chain falls back to opencode; it cannot be set again
  dl="$tmp/dl"; mkdir -p "$dl"; printf 'runner=llama\nfallback=llama,opencode\n' > "$dl/.lean-project"
  chain=$(cd "$dl" && delegate_chain 2> "$dl/err")
  [ "$chain" = opencode ] || { echo "FAIL delegation chain was: $chain"; fail=1; }
  [ "$(grep -c 'runner llama .*removed in 2.0' "$dl/err")" = 1 ] || { echo "FAIL removed runner not named once: $(cat "$dl/err")"; fail=1; }
  (cd "$dl" && cmd_delegate set runner llama) > /dev/null 2>&1 && { echo "FAIL delegate set took a removed runner"; fail=1; }
  (cd "$dl" && run_on nosuchrunner "$dl/brief" "$dl/out" 2>/dev/null) && { echo "FAIL unknown runner reported success"; fail=1; }
  # opencode runs with --auto only when opencode_auto=1
  grep -q 'opencode_auto' "$(dirname "$0")/lib/delegate.sh" || { echo "FAIL opencode_auto key missing"; fail=1; }
  # session-end draft: nothing under two user messages; one dated draft otherwise, never overwritten
  hk="$(dirname "$0")/../scripts/session-end.sh"; mkdir -p "$tmp/hook"
  printf '%s\n' '{"type":"user","message":"hi"}' > "$tmp/hook/one.jsonl"
  printf '%s\n' '{"type":"user","message":"hi"}' '{"type":"user","message":"again"}' > "$tmp/hook/two.jsonl"
  echo "{\"session_id\":\"abc12345x\",\"transcript_path\":\"$tmp/hook/one.jsonl\",\"cwd\":\"$tmp\"}" | CLAUDE_PLUGIN_DATA="$tmp/hook/out1" bash "$hk"
  ls "$tmp/hook/out1/sessions" 2>/dev/null | grep -q . && { echo "FAIL session draft written under two user messages"; fail=1; }
  echo "{\"session_id\":\"abc12345x\",\"transcript_path\":\"$tmp/hook/two.jsonl\",\"cwd\":\"$tmp\"}" | CLAUDE_PLUGIN_DATA="$tmp/hook/out2" bash "$hk"
  ls "$tmp/hook/out2/sessions" 2>/dev/null | grep -q . || { echo "FAIL no session draft for two user messages"; fail=1; }
  # audit waste: dry run changes nothing; --apply archives the comment block and leaves a pointer
  git init -q "$tmp/w"
  { echo '<?php'; echo 'namespace X;'; i=1; while [ $i -le 9 ]; do echo "// note $i"; i=$((i + 1)); done
    echo 'echo 1;'; echo 'error_log("x");'; echo 'add_action("init", "f");'; echo 'add_action("init", "f");'; } > "$tmp/w/a.php"
  # a header block (line 1 or 2) is never moved: a script may print it as its usage
  { echo '#!/usr/bin/env bash'; i=1; while [ $i -le 9 ]; do echo "# usage $i"; i=$((i + 1)); done; echo 'true'; } > "$tmp/w/u.sh"
  rep=$(cmd_waste "$tmp/w")
  echo "$rep" | grep -q 'a.php:3-11' || { echo "FAIL waste missed the comment block"; fail=1; }
  echo "$rep" | grep -q 'u.sh:' && { echo "FAIL waste listed a file header"; fail=1; }
  echo "$rep" | grep -q 'error_log' || { echo "FAIL waste missed the debug log"; fail=1; }
  echo "$rep" | grep -q 'repeated hook 2x' || { echo "FAIL waste missed the repeated hook"; fail=1; }
  [ "$(grep -c '// note' "$tmp/w/a.php")" = 9 ] || { echo "FAIL waste dry run changed the file"; fail=1; }
  cmd_waste "$tmp/w" --apply > /dev/null
  grep -q 'note 9' "$tmp/w/docs/ARCHIVE.md" || { echo "FAIL waste did not archive the block"; fail=1; }
  grep -q 'archived to docs/ARCHIVE.md' "$tmp/w/a.php" || { echo "FAIL waste left no pointer"; fail=1; }
  grep -q 'error_log' "$tmp/w/a.php" || { echo "FAIL waste removed a debug log"; fail=1; }
  grep -q 'usage 9' "$tmp/w/u.sh" || { echo "FAIL waste moved a file header"; fail=1; }
  # predict: a file's partners are the files committed with it
  if command -v git >/dev/null 2>&1; then
    git init -q "$tmp/p"
    (cd "$tmp/p" && echo a > a.php && echo b > b.php && git add -A && git -c user.email=t@t -c user.name=t commit -qm one \
      && echo a2 >> a.php && git add -A && git -c user.email=t@t -c user.name=t commit -qm two \
      && echo c > c.php && git add -A && git -c user.email=t@t -c user.name=t commit -qm three)
    pr=$(cmd_predict "$tmp/p/a.php")
    echo "$pr" | grep -q 'b.php' || { echo "FAIL predict missed a co-changed file"; fail=1; }
    echo "$pr" | grep -q '  c.php' && { echo "FAIL predict included an unrelated file"; fail=1; }
  fi
  # docs shipping: an npm package ships docs/ unless the build excludes it
  mkdir -p "$tmp/s/docs"; echo '{"name":"x"}' > "$tmp/s/package.json"
  [ -n "$(docs_may_ship "$tmp/s")" ] || { echo "FAIL docs ship check missed an npm package"; fail=1; }
  printf 'docs export-ignore\n' > "$tmp/s/.gitattributes"
  [ -z "$(docs_may_ship "$tmp/s")" ] || { echo "FAIL docs ship check ignored export-ignore"; fail=1; }
  # handoff: open tasks from the plan, and the cards in flight (the latest move wins; a done card is left out)
  printf '%s\n' '- [ ] write the parser' '- [x] old task' '- [ ] add tests' > "$tmp/HP.md"
  printf '%s\n' '- 2026-10-16 10:00 | lead | add | H1 | Parser | fast' '- 2026-10-16 10:01 | lead | move | H1 | doing parsing' \
    '- 2026-10-16 10:02 | lead | add | H2 | API | client' '- 2026-10-16 10:03 | lead | move | H2 | done' > "$tmp/HB.md"
  hd=$(LEAN_BOARD="$tmp/HB.md" cmd_handoff "$tmp/HP.md")
  echo "$hd" | grep -q '  - write the parser' || { echo "FAIL handoff missed an open task"; fail=1; }
  echo "$hd" | grep -q 'old task' && { echo "FAIL handoff listed a done task"; fail=1; }
  echo "$hd" | grep -q '  H1 \[doing\] Parser | fast' || { echo "FAIL handoff missed a card in flight"; fail=1; }
  echo "$hd" | grep -q 'H2' && { echo "FAIL handoff listed a done card"; fail=1; }
  # audit security: each anti-pattern is flagged on its line; escaped output is not
  mkdir -p "$tmp/sec"
  printf '%s\n' '<?php' 'echo $_GET["x"];' 'echo esc_html($_GET["x"]);' '$wpdb->query("DELETE FROM t WHERE id = $id");' \
    'eval($code);' 'add_action("wp_ajax_save", "save");' > "$tmp/sec/a.php"
  sec=$(cmd_audit_security "$tmp/sec")
  echo "$sec" | grep -q 'a.php:2: request data echoed without escaping' || { echo "FAIL security missed unescaped output"; fail=1; }
  echo "$sec" | grep -q 'a.php:3: ' && { echo "FAIL security flagged escaped output"; fail=1; }
  echo "$sec" | grep -q 'a.php:4: SQL built from a variable' || { echo "FAIL security missed unprepared SQL"; fail=1; }
  echo "$sec" | grep -q 'a.php:5: eval' || { echo "FAIL security missed eval"; fail=1; }
  echo "$sec" | grep -q 'a.php: AJAX, admin-post or REST handler' || { echo "FAIL security missed a handler with no check"; fail=1; }
  # audit wporg: each guideline and review-email check fires on its line; the safe forms do not
  wp="$tmp/woocommerce-helper"; mkdir -p "$wp/languages" "$wp/vendor/acme/lib/.idea" "$wp/vendor/composer" "$wp/js" "$wp/build/blk"
  printf '%s\n' '<?php' '/**' ' * Plugin Name: WooCommerce Helper' ' * Version: 1.2.0' ' * License: Proprietary' ' * Text Domain: woocommerce-helper' ' */' \
    "defined( 'ABSPATH' ) || exit; define( 'WCH_API_VERSION', 'v2' );" "define( 'WCH_VERSION', '1.1.0' );" "echo '<style>.a{}</style>';" "if ( wp_verify_nonce( \$post['_n'], 'a' ) ) {}" \
    "if ( wp_verify_nonce( sanitize_text_field( wp_unslash( \$_POST['_n'] ) ), 'a' ) ) {}" "\$d = json_decode( wp_unslash( \$_POST['c'] ), true );" \
    "file_put_contents( __DIR__ . '/x.json', 'a' );" "wp_enqueue_code_editor( array() );" "eval( base64_decode( 'eA==' ) );" "if ( is_pro() ) {}" \
    "wp_enqueue_script( 'x', 'https://cdn.example.net/x.js' );" "wp_enqueue_style( 'f', 'https://fonts.googleapis.com/css2?family=A' );" \
    "echo 'Powered by Helper';" "add_action( 'admin_notices', 'wch_nag' );" "\$s = <<<EOT" 'x' 'EOT;' "wp_remote_get( 'https://api.acme.io/v1' );" > "$wp/woocommerce-helper.php"
  printf '%s\n' '<?php' 'echo 1;' > "$wp/loose.php"
  printf '%s\n' '=== WooCommerce Helper ===' 'Contributors: me' 'Tags: a, b, c, d, e, f' 'Requires at least: 6.5' 'Tested up to: 6.9' 'Requires PHP: 7.4' 'Stable tag: 1.1.0' 'License: GPLv2 or later' '' 'Short.' '' '== Changelog ==' '= 1.1.0 =' '* x' > "$wp/readme.txt"
  touch "$wp/languages/woocommerce-helper-bg_BG.mo" "$wp/js/jquery.min.js"
  printf '%s\n' '[' '{ "name": "acme/lib", "version": "1.0.0", "license": [ "proprietary" ] },' '{ "name": "acme/nolic", "version": "2.0.0" }' ']' > "$wp/vendor/composer/installed.json"
  printf '%s\n' '<?php' "echo '<script>x</script>';" > "$wp/build/blk/render.php"
  wa=$(cmd_audit_wporg "$wp")
  for want in 'woocommerce-helper.php:10: inline <script> or <style>' 'woocommerce-helper.php:11: nonce reaches wp_verify_nonce' 'woocommerce-helper.php:13: json_decode on request data' \
    'woocommerce-helper.php:14: writes a file outside uploads' 'woocommerce-helper.php:15: code editor' 'woocommerce-helper.php:16: G4:' 'woocommerce-helper.php:17: G5:' \
    'woocommerce-helper.php:18: G8: JS or CSS from a CDN' 'woocommerce-helper.php:20: G10:' 'woocommerce-helper.php:21: G11:' 'woocommerce-helper.php:22: HEREDOC' \
    'G1: License: Proprietary' 'G15: version constant 1.1.0' 'G15: Stable tag 1.1.0 does not match' 'G12: 6 tags' 'G17: starts with a trademark' 'api.acme.io' \
    'without a direct-access guard (defined( '"'"'ABSPATH'"'"' ) || exit;): build/blk/render.php loose.php' 'languages/woocommerce-helper-bg_BG.mo: translation file' 'vendor/acme/lib/.idea: dev or hidden' \
    'js/jquery.min.js: G13' 'vendor/acme/lib: G1: license proprietary' 'vendor/acme/nolic: G1: license (none declared)' 'build/blk/render.php:2: inline'; do
    echo "$wa" | grep -qF "$want" || { echo "FAIL audit wporg missed: $want"; fail=1; }
  done
  echo "$wa" | grep -q 'woocommerce-helper.php:12: ' && { echo "FAIL audit wporg flagged a sanitized nonce"; fail=1; }
  echo "$wa" | grep -q 'version constant v2' && { echo "FAIL audit wporg took an API version constant for the plugin version"; fail=1; }
  mkdir -p "$tmp/wpjs" && echo 'var a = 1;' > "$tmp/wpjs/a.js"
  cmd_audit_wporg "$tmp/wpjs" | grep -q 'standard input' && { echo "FAIL audit wporg grepped stdin when no PHP file was left"; fail=1; }
  # A release zip: the __MACOSX folder Finder adds is skipped, a .git inside the zip is reported, Composer never runs on it, a zip over the cap is refused.
  if command -v zip >/dev/null 2>&1 && command -v unzip >/dev/null 2>&1; then
    zd="$tmp/wpzip"; mkdir -p "$zd/zp/.git" "$zd/__MACOSX/zp" "$zd/bin"
    cp "$wp/readme.txt" "$zd/zp/readme.txt"; echo x > "$zd/zp/.git/config"; echo x > "$zd/__MACOSX/zp/._a"; echo '{}' > "$zd/zp/composer.lock"
    printf '%s\n' '<?php' '/* Plugin Name: ZP */' > "$zd/zp/zp.php"
    printf '%s\n' '#!/bin/sh' "touch '$zd/composer-ran'" > "$zd/bin/composer"; chmod +x "$zd/bin/composer"
    (cd "$zd" && zip -qr zp.zip zp __MACOSX)
    wz=$(PATH="$zd/bin:$PATH" cmd_audit_wporg "$zd/zp.zip")
    echo "$wz" | grep -q 'no PHP file in the root' && { echo "FAIL audit wporg missed the plugin folder next to __MACOSX"; fail=1; }
    echo "$wz" | grep -q '^\.git: dev or hidden' || { echo "FAIL audit wporg hid a .git inside the zip"; fail=1; }
    (cd "$zd" && zip -qr zp1.zip zp); PATH="$zd/bin:$PATH" cmd_audit_wporg "$zd/zp1.zip" > /dev/null
    [ -f "$zd/composer-ran" ] && { echo "FAIL audit wporg ran composer on a zip"; fail=1; }
    (WPORG_ZIP_MAX=10 cmd_audit_wporg "$zd/zp.zip" 2>&1) | grep -q 'over the 100 MB limit' || { echo "FAIL audit wporg unpacked a zip over the size cap"; fail=1; }
  else echo "note: zip is not installed; the audit wporg zip checks were skipped"; fi
  echo "$wa" | grep -q 'woocommerce-helper.php:19: G8' && { echo "FAIL audit wporg flagged a font CDN"; fail=1; }
  # gain: each run adds one line to gain.tsv and the second run shows a change figure
  gd="$tmp/gain"; mkdir -p "$gd/proj"; : > "$gd/proj/CLAUDE.md"
  (cd "$gd/proj" && HOME="$gd" CLAUDE_PLUGIN_DATA="$gd/data" bash "$self" gain > /dev/null)
  (cd "$gd/proj" && HOME="$gd" CLAUDE_PLUGIN_DATA="$gd/data" bash "$self" gain > /dev/null)
  [ "$(( $(wc -l < "$gd/data/gain.tsv") ))" = 2 ] || { echo "FAIL gain did not log two runs"; fail=1; }
  go=$(cd "$gd/proj" && HOME="$gd" CLAUDE_PLUGIN_DATA="$gd/data" bash "$self" gain)
  printf '%s\n' "$go" | tail -n 1 | grep -q '	+0$' || { echo "FAIL gain change figure"; fail=1; }
  # gain: the hook column leaves out the skill block, which gets its own line
  printf '%s\n' "$go" | grep -q 'leaves out the lean-gate skill block' && [ "$(cut -f4 "$gd/data/gain.tsv" | sort -n | tail -n 1)" -le 400 ] && [ "$(cut -f4 "$gd/data/gain.tsv" | sort -n | head -n 1)" -gt 0 ] || { echo "FAIL gain counted the skill block in the hook column"; fail=1; }
  unset LEAN_BOARD
  # phpcs: a global Composer install is found when PATH has no phpcs
  pc="$tmp/pc"; mkdir -p "$pc/AppData/Roaming/Composer/vendor/bin"; printf '#!/bin/sh\n' > "$pc/AppData/Roaming/Composer/vendor/bin/phpcs"; chmod +x "$pc/AppData/Roaming/Composer/vendor/bin/phpcs"
  [ "$(HOME="$pc"; COMPOSER_HOME=""; PATH="/usr/bin:/bin"; phpcs_path; command -v phpcs)" = "$pc/AppData/Roaming/Composer/vendor/bin/phpcs" ] || { echo "FAIL phpcs global Composer lookup"; fail=1; }
  ps="$tmp/ps"; mkdir -p "$ps/.claude"; echo '{"phpcs_standard":"WordPress-Core"}' > "$ps/.claude/lean-gate.json"
  [ "$(cd "$ps" && HOME="$ps" phpcs_standard)" = WordPress-Core ] || { echo "FAIL phpcs standard from the global file"; fail=1; }
  echo '{"phpcs_standard":"WordPress-Extra"}' > "$ps/.lean-gate.json"
  [ "$(cd "$ps" && HOME="$ps" phpcs_standard)" = WordPress-Extra ] || { echo "FAIL phpcs standard from the project file"; fail=1; }
  # stats: rows inside the window only, old rule ids under the new name, counts per rule and per project
  now=$(date -u +%Y-%m-%dT%H:%M:%S)
  printf '%s\tp1\tlean-project-first\twarn\tx\n%s\tp1\tlean-gate-first\tblock\tx\n%s\tp2\tno-em-dashes\twarn\tx\n2001-01-01T00:00:00\tp3\told-rule\twarn\tx\n' "$now" "$now" "$now" > "$tmp/v.tsv"
  out=$(LEAN_VIOLATIONS="$tmp/v.tsv" cmd_stats 7)
  echo "$out" | grep -q "last 7 days: 3 " && echo "$out" | grep -q '^ *2  lean-gate-first  (1 block, 1 warn)$' && echo "$out" | grep -q '^ *2  p1$' && ! echo "$out" | grep -q 'old-rule\|p3' || { echo "FAIL stats counts"; fail=1; }
  doc_coverage || fail=1

  rm -rf "$tmp"
  [ $fail = 0 ] && echo "selftest ok" || { echo "selftest FAILED"; return 1; }
}


# The manual (docs/MANUAL.md) names every rule, config key, CLI command and panel button, and every panel button has an
# Explain line in hooks/text.ts. A new feature or fix that adds one of these fails here until the manual says what it does.
doc_coverage() {
  local root man gate text reg x miss="" fail=0
  root="$(cd "$(dirname "$0")/.." && pwd)"; man="$root/docs/MANUAL.md"; gate="$root/hooks/gate.ts"; text="$root/hooks/text.ts"; reg="$root/hooks/register.tsx"
  [ -f "$gate" ] && [ -f "$text" ] && [ -f "$reg" ] || return 0
  [ -f "$man" ] || { echo "FAIL docs/MANUAL.md is missing"; return 1; }
  # Rule ids, config keys (the config file spells `custom` as custom_rules), CLI commands, Explain keys.
  for x in $(sed -n '/^export const RULES = \[/,/^\] as const/p' "$gate" | grep -o "'[a-z-]*'" | tr -d "'") \
           $(sed -n '/^export type Config = {/,/^}/p' "$gate" | grep -o '^  [a-z_]*' | tr -d ' ' | sed 's/^custom$/custom_rules/') \
           $(sed -n '/^case "\$cmd" in/,/^esac/p' "$root/bin/lean-gate" | grep -o '^  [a-z-]*)' | tr -d ' )') \
           $(sed -n '/^export const EXPLAIN/,/^}/p' "$text" | grep -o "^  '\{0,1\}[a-z_-]*'\{0,1\}:" | tr -d " ':"); do
    grep -qF "\`$x\`" "$man" || miss="$miss $x"
  done
  [ -z "$miss" ] || { echo "FAIL docs/MANUAL.md does not name:$miss"; fail=1; }
  # Every gb('key') button in the panel has an Explain line (dynamic keys map to a shared entry, as explainFor does).
  miss=""
  for x in $(grep -o "gb('[^']*'" "$reg" | sed "s/gb('//; s/'//" | sort -u); do
    sed -n '/^export const EXPLAIN/,/^}/p' "$text" | grep -q "^  '\{0,1\}$x'\{0,1\}:" || miss="$miss $x"
  done
  [ -z "$miss" ] || { echo "FAIL buttons with no Explain line in hooks/text.ts:$miss"; fail=1; }
  return $fail
}

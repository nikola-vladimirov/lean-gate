# Selftest for bin/lean-project. Sourced by it, not run directly.

cmd_selftest() {
  local tmp f fail=0
  tmp=$(mktemp -d) || die "selftest: no temp dir"
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
  [ "$(cmd_memory list --project alpha | wc -l)" = 1 ] && grep -q 'chose Laravel' "$tmp/mem/alpha/notes-archive.md" || { echo "FAIL memory forget did not archive"; fail=1; }
  cmd_memory unlink beta --project alpha > /dev/null
  cmd_memory index --project alpha | grep -q 'linked' && { echo "FAIL memory unlink"; fail=1; }
  # memory (review fixes): unquoted words are one note; forgetting the last note leaves a clean count; a mistyped link target is refused
  cmd_memory add fixed the login bug --project gamma > /dev/null
  cmd_memory list --project gamma | grep -q 'fixed the login bug$' || { echo "FAIL memory unquoted note"; fail=1; }
  cmd_memory forget 1 --project gamma > /dev/null
  [ "$(cmd_memory projects | grep -c 'gamma')" = 1 ] && [ -z "$(cmd_memory projects | grep -v '^[0-9]*  ')" ] || { echo "FAIL memory projects output after forgetting the last note"; fail=1; }
  (cmd_memory link nosuchproject --project gamma) > /dev/null 2>&1 && { echo "FAIL memory linked a project that does not exist"; fail=1; }
  [ ! -d "$tmp/mem/nosuchproject" ] || { echo "FAIL memory link created a folder"; fail=1; }
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
  # review scope: a repo with one tag and one new file lists that file; a full review is due with no record
  rs="$tmp/rs"; mkdir -p "$rs"; self="$(cd "$(dirname "$0")" && pwd)/lean-project"
  (cd "$rs" && git init -q && git -c user.email=t@t -c user.name=t commit -q --allow-empty -m base && git tag v1.0.0 && echo x > new.php)
  rsout=$(cd "$rs" && CLAUDE_PLUGIN_DATA="$tmp/rsd" bash "$self" review-scope)
  echo "$rsout" | grep -q 'new.php' || { echo "FAIL review-scope missed a changed file"; fail=1; }
  echo "$rsout" | grep -q 'Full review due: yes: no full review recorded' || { echo "FAIL review-scope did not ask for a first full review"; fail=1; }
  (cd "$rs" && CLAUDE_PLUGIN_DATA="$tmp/rsd" bash "$self" review-scope --full-done > /dev/null)
  (cd "$rs" && CLAUDE_PLUGIN_DATA="$tmp/rsd" bash "$self" review-scope) | grep -q 'Full review due: no: 0 release' || { echo "FAIL review-scope after a full review"; fail=1; }
  # sessions: --here lists only this project's drafts, and the list says where each one is
  ss="$tmp/ss"; mkdir -p "$ss/alpha" "$ss/data/sessions"
  printf 'Project: alpha\n' > "$ss/data/sessions/2026-11-01-aaaa.md"
  printf 'Project: beta\n' > "$ss/data/sessions/2026-11-02-bbbb.md"
  self="$(cd "$(dirname "$0")" && pwd)/lean-project"
  here=$(cd "$ss/alpha" && CLAUDE_PLUGIN_DATA="$ss/data" bash "$self" sessions 5 --here)
  echo "$here" | grep -q 'aaaa' || { echo "FAIL sessions --here missed this project's draft"; fail=1; }
  echo "$here" | grep -q 'bbbb' && { echo "FAIL sessions --here listed another project"; fail=1; }
  all=$(cd "$ss/alpha" && CLAUDE_PLUGIN_DATA="$ss/data" bash "$self" sessions 5)
  echo "$all" | grep -q 'bbbb' || { echo "FAIL sessions missed a draft"; fail=1; }
  # setup nag: printed in three sessions per project, then stops
  sn="$tmp/nag"; mkdir -p "$sn/proj/docs"
  for i in 1 2 3 4; do
    n=$(cd "$sn/proj" && CLAUDE_PLUGIN_DATA="$sn/data" CLAUDE_PLUGIN_ROOT="$(dirname "$self")/.." bash "$(dirname "$self")/../scripts/session-start.sh" | grep -c 'setup not recorded')
    [ "$n" = $([ "$i" -le 3 ] && echo 1 || echo 0) ] || { echo "FAIL setup nag run $i printed $n"; fail=1; }
  done
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
  LESSONS_FILE="$tmp/lessons/LESSONS.md" bash "$(cd "$(dirname "$0")" && pwd)/lean-project" lessons export "$ex" > /dev/null
  head -1 "$ex" | grep -q '^---$' || { echo "FAIL lessons export wrote no frontmatter"; fail=1; }
  LESSONS_FILE="$tmp/lessons/LESSONS.md" bash "$(cd "$(dirname "$0")" && pwd)/lean-project" lessons export "$ex" > /dev/null 2>&1 && { echo "FAIL lessons export replaced a generated note"; fail=1; }
  # guard hint: the doc guard is named once per session (the em dash check belongs to lean-gate)
  gh="$tmp/gh"; mkdir -p "$gh"; : > "$gh/x.md"
  echo "{\"session_id\":\"s1\",\"file_path\":\"$gh/x.md\"}" | CLAUDE_PLUGIN_DATA="$gh/d" bash "$(dirname "$0")/../scripts/guard-hint.sh" | grep -q "docs-guard" || { echo "FAIL guard hint did not name the docs guard"; fail=1; }
  # delegation: the chain puts the chosen runner first and never repeats one; an unknown runner or a missing model fails
  dl="$tmp/dl"; mkdir -p "$dl"; printf 'runner=llama\nfallback=opencode,llama\n' > "$dl/.lean-project"
  chain=$(cd "$dl" && delegate_chain)
  [ "$chain" = " llama opencode" ] || [ "$chain" = "llama opencode" ] || { echo "FAIL delegation chain was: $chain"; fail=1; }
  (cd "$dl" && run_on aider "$dl/brief" "$dl/out" 2>/dev/null) && { echo "FAIL aider ran without a model"; fail=1; }
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
  { echo '<?php'; i=1; while [ $i -le 9 ]; do echo "// note $i"; i=$((i + 1)); done
    echo 'echo 1;'; echo 'error_log("x");'; echo 'add_action("init", "f");'; echo 'add_action("init", "f");'; } > "$tmp/w/a.php"
  rep=$(cmd_waste "$tmp/w")
  echo "$rep" | grep -q 'a.php:2-10' || { echo "FAIL waste missed the comment block"; fail=1; }
  echo "$rep" | grep -q 'error_log' || { echo "FAIL waste missed the debug log"; fail=1; }
  echo "$rep" | grep -q 'repeated hook 2x' || { echo "FAIL waste missed the repeated hook"; fail=1; }
  [ "$(grep -c '// note' "$tmp/w/a.php")" = 9 ] || { echo "FAIL waste dry run changed the file"; fail=1; }
  cmd_waste "$tmp/w" --apply > /dev/null
  grep -q 'note 9' "$tmp/w/docs/ARCHIVE.md" || { echo "FAIL waste did not archive the block"; fail=1; }
  grep -q 'archived to docs/ARCHIVE.md' "$tmp/w/a.php" || { echo "FAIL waste left no pointer"; fail=1; }
  grep -q 'error_log' "$tmp/w/a.php" || { echo "FAIL waste removed a debug log"; fail=1; }
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
  # gain: each run adds one line to gain.tsv and the second run shows a change figure
  gd="$tmp/gain"; mkdir -p "$gd/proj"
  (cd "$gd/proj" && CLAUDE_PLUGIN_DATA="$gd/data" bash "$self" gain > /dev/null)
  (cd "$gd/proj" && CLAUDE_PLUGIN_DATA="$gd/data" bash "$self" gain > /dev/null)
  [ "$(wc -l < "$gd/data/gain.tsv")" = 2 ] || { echo "FAIL gain did not log two runs"; fail=1; }
  (cd "$gd/proj" && CLAUDE_PLUGIN_DATA="$gd/data" bash "$self" gain) | tail -n 1 | grep -q '	+0$' || { echo "FAIL gain change figure"; fail=1; }
  unset LEAN_BOARD

  rm -rf "$tmp"
  [ $fail = 0 ] && echo "selftest ok" || { echo "selftest FAILED"; return 1; }
}


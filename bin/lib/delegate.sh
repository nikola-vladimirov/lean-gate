# Delegation to free runners. Sourced by bin/lean-gate, not run directly.

# Delegation: send a brief to the runner this project chose and write the answer to a file. The choice lives in
# <project>/.lean-project (its old name, kept) as key=value lines, set by the user's answer on first run. Runners: none, opencode.
DELEGATE_CFG=".lean-project"
# Runners removed in 2.0: a config that still names one says so and falls back.
DELEGATE_REMOVED="llama ollama unsloth aider goose"
# The desktop app updates its CLI folder (cli/<version>), so take the newest installed copy.
DEFAULT_OPENCODE_CLI=$(ls -1 "$HOME"/AppData/Roaming/ai.opencode.desktop/cli/*/opencode-cli.exe 2>/dev/null | sort -V | tail -n 1)
DEFAULT_OPENCODE_MODEL="opencode/deepseek-v4.1-flash-free"
cfg_get() { [ -f "$DELEGATE_CFG" ] && sed -n "s/^$1=//p" "$DELEGATE_CFG" | tail -n 1 | tr -d '\r'; }
# Is a runner up right now? opencode needs its CLI installed.
runner_up() {
  local c
  case "$1" in
    opencode) c=$(cfg_get opencode_cli); [ -f "${c:-$DEFAULT_OPENCODE_CLI}" ] ;;
    *) return 1 ;;
  esac
}
# Runners to try in order: the chosen one, then the fallbacks (default opencode), no repeats.
# Empty when the project chose none, so the work stays with Claude. A removed runner is named on stderr and skipped.
delegate_chain() {
  local first fb r seen="" out=""
  first=$(cfg_get runner); fb=$(cfg_get fallback); fb=${fb:-opencode}
  [ -n "$first" ] && [ "$first" != none ] || return 0
  for r in $first $(echo "$fb" | tr ',' ' '); do
    case " $seen " in *" $r "*) continue ;; esac
    seen="$seen $r"
    case " $DELEGATE_REMOVED " in *" $r "*) echo "lean-gate: runner $r in $DELEGATE_CFG was removed in 2.0; falling back (runners now: none, opencode)" >&2 ;; esac
    [ "$r" = opencode ] && out=opencode
  done
  echo $out
}
# Send the brief to one runner. Returns non-zero when it fails, so the caller can try the next runner.
run_on() {
  local runner="$1" brief="$2" out="$3" model cli auto
  case "$runner" in
    opencode)
      cli=$(cfg_get opencode_cli); cli=${cli:-$DEFAULT_OPENCODE_CLI}; model=$(cfg_get opencode_model); model=${model:-$DEFAULT_OPENCODE_MODEL}
      auto=""; [ "$(cfg_get opencode_auto)" = 1 ] && auto="--auto"   # off unless opencode_auto=1: without it the agent asks first
      "$cli" run --model "$model" $auto --format json --file "$brief" "Do the task in the attached brief. Reply with the result only." 2>/dev/null \
        | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let o="";for(const l of s.split("\n")){try{const e=JSON.parse(l);if(e.type==="text")o+=e.part.text}catch(_){}}process.stdout.write(o+"\n")})' > "$out" || return 1 ;;
    *) return 1 ;;
  esac
  # A failed runner still leaves a newline in the file, so look for real text
  grep -q '[^[:space:]]' "$out" 2>/dev/null
}

cmd_delegate() {
  local sub="${1:-}" runner chain r
  [ $# -gt 0 ] && shift
  case "$sub" in
    config)
      if [ -f "$DELEGATE_CFG" ]; then cat "$DELEGATE_CFG"; delegate_chain > /dev/null
      else echo "no delegation choice for this project: ask the user (none or opencode), then 'lean-gate delegate set runner <value>'"; fi ;;
    set)
      [ $# -eq 2 ] || die "delegate set: give <key> <value>"
      case "$1" in
        runner) case "$2" in none|opencode) ;; *) die "delegate set: runner is none or opencode" ;; esac ;;
        fallback) case "$2" in none|opencode) ;; *) die "delegate set: fallback is opencode or none" ;; esac ;;
        opencode_cli) ;;
        opencode_model) case "$2" in opencode/*-free) ;; *) die "delegate set: opencode_model must be an opencode/*-free model" ;; esac ;;
        opencode_auto) case "$2" in 0|1) ;; *) die "delegate set: opencode_auto is 0 or 1" ;; esac ;;
        *) die "delegate set: unknown key $1 (runner, fallback, opencode_cli, opencode_model, opencode_auto)" ;;
      esac
      # A temp file, not sed -i: BSD sed reads the next argument as a backup suffix
      touch "$DELEGATE_CFG"; sed "/^$1=/d" "$DELEGATE_CFG" > "$DELEGATE_CFG.tmp" && mv "$DELEGATE_CFG.tmp" "$DELEGATE_CFG"; echo "$1=$2" >> "$DELEGATE_CFG"
      echo "saved $1=$2 in $DELEGATE_CFG" ;;
    check)
      runner=$(cfg_get runner); runner=${runner:-none}; chain=$(delegate_chain)
      if [ "$runner" = none ]; then echo "delegation off: do the work here"
      elif runner_up "$runner"; then echo "$runner is up"
      else echo "$runner is not available: delegation falls back in order (${chain:-none})"; fi ;;
    pick)
      for r in $(delegate_chain); do
        runner_up "$r" && { echo "$r"; return 0; }
      done
      echo none ;;
    run)
      [ $# -eq 2 ] || die "delegate run: give <brief file> <output file>"
      [ -f "$1" ] || die "delegate run: no brief at $1"
      chain=$(delegate_chain)
      for r in $chain; do
        runner_up "$r" || { echo "lean-gate: $r is down, trying the next runner" >&2; continue; }
        if run_on "$r" "$1" "$2"; then
          echo "delegated to $r: $(tok "$2") tokens in $2. Verify it before using it."; return 0
        fi
        echo "lean-gate: $r gave no answer, trying the next runner" >&2
      done
      [ -n "$chain" ] && echo "lean-gate: no delegation runner is up: do the work here" >&2 \
        || echo "lean-gate: delegation is off for this project: do the work here" >&2
      return 3 ;;
    *) die "delegate: 'config', 'set <key> <value>', 'check', 'pick' or 'run <brief> <output>'" ;;
  esac
}

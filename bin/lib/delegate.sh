# Delegation to local and free runners. Sourced by bin/lean-gate, not run directly.

# Delegation: send a brief to the runner this project chose and write the answer to a file. The choice lives in
# <project>/.lean-project (its old name, kept) as key=value lines, set by the user's answer on first run. Runners: none, llama, ollama,
# unsloth, opencode, aider, goose.
DELEGATE_CFG=".lean-project"
DEFAULT_LLAMA_URL="http://127.0.0.1:9931"
DEFAULT_LLAMA_MODEL="yuxinlu1/gemma-4-12B-coder-fable5-composer2.5-v1-GGUF:Q4_K_M"
DEFAULT_OLLAMA_URL="http://127.0.0.1:11434"    # Ollama's default port; the model is set with ollama_model
DEFAULT_UNSLOTH_URL="http://127.0.0.1:8888"    # Unsloth Studio's default port (`unsloth studio -p`); the key comes from UNSLOTH_API_KEY
# The desktop app updates its CLI folder (cli/<version>), so take the newest installed copy.
DEFAULT_OPENCODE_CLI=$(ls -1 "$HOME"/AppData/Roaming/ai.opencode.desktop/cli/*/opencode-cli.exe 2>/dev/null | sort -V | tail -n 1)
DEFAULT_OPENCODE_MODEL="opencode/deepseek-v4.1-flash-free"
cfg_get() { [ -f "$DELEGATE_CFG" ] && sed -n "s/^$1=//p" "$DELEGATE_CFG" | tail -n 1 | tr -d '\r'; }
# Is a runner up right now? Each HTTP runner answers its health check; CLI runners need their program installed.
runner_up() {
  local u c
  case "$1" in
    llama) u=$(cfg_get llama_url); curl -s -m 3 "${u:-$DEFAULT_LLAMA_URL}/health" >/dev/null ;;
    ollama) u=$(cfg_get ollama_url); curl -s -m 3 "${u:-$DEFAULT_OLLAMA_URL}/api/tags" >/dev/null ;;
    unsloth) u=$(cfg_get unsloth_url); curl -s -m 3 -H "Authorization: Bearer ${UNSLOTH_API_KEY:-}" "${u:-$DEFAULT_UNSLOTH_URL}/v1/models" >/dev/null ;;
    opencode) c=$(cfg_get opencode_cli); [ -f "${c:-$DEFAULT_OPENCODE_CLI}" ] ;;
    aider) command -v aider >/dev/null 2>&1 ;;
    goose) command -v goose >/dev/null 2>&1 ;;
    *) return 1 ;;
  esac
}
# Runners to try in order: the chosen one, then the fallbacks (default llama, then opencode), no repeats.
# Empty when the project chose none, so the work stays with Claude.
delegate_chain() {
  local first fb r out=""
  first=$(cfg_get runner); fb=$(cfg_get fallback); fb=${fb:-llama opencode}
  [ -n "$first" ] && [ "$first" != none ] || return 0
  for r in $first $(echo "$fb" | tr ',' ' '); do
    case " $out " in *" $r "*) ;; *) out="$out $r" ;; esac
  done
  echo $out
}
# One OpenAI-compatible chat request (llama.cpp, Ollama, Unsloth Studio). $5 is an optional bearer key.
openai_chat() {
  local url="$1" model="$2" brief="$3" out="$4" key="${5:-}"
  [ -n "$model" ] || return 1
  node -e 'process.stdout.write(JSON.stringify({model:process.argv[2],messages:[{role:"user",content:require("fs").readFileSync(process.argv[1],"utf8")}],temperature:0.2,stream:false}))' "$brief" "$model" \
    | curl -s -m 900 -H 'Content-Type: application/json' ${key:+-H "Authorization: Bearer $key"} -d @- "$url/v1/chat/completions" \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).choices[0].message.content+"\n")}catch(e){process.exit(1)}})' > "$out" 2>/dev/null || return 1
}
# Send the brief to one runner. Returns non-zero when it fails, so the caller can try the next runner.
# aider and goose are agents that can edit files: use them only where edits are wanted, and check git diff.
run_on() {
  local runner="$1" brief="$2" out="$3" url model cli
  case "$runner" in
    llama)
      url=$(cfg_get llama_url); model=$(cfg_get llama_model)
      openai_chat "${url:-$DEFAULT_LLAMA_URL}" "${model:-$DEFAULT_LLAMA_MODEL}" "$brief" "$out" || return 1 ;;
    ollama)
      url=$(cfg_get ollama_url); model=$(cfg_get ollama_model)
      openai_chat "${url:-$DEFAULT_OLLAMA_URL}" "$model" "$brief" "$out" || return 1 ;;
    unsloth)
      url=$(cfg_get unsloth_url); model=$(cfg_get unsloth_model)
      openai_chat "${url:-$DEFAULT_UNSLOTH_URL}" "$model" "$brief" "$out" "${UNSLOTH_API_KEY:-}" || return 1 ;;
    opencode)
      cli=$(cfg_get opencode_cli); cli=${cli:-$DEFAULT_OPENCODE_CLI}; model=$(cfg_get opencode_model); model=${model:-$DEFAULT_OPENCODE_MODEL}
      auto=""; [ "$(cfg_get opencode_auto)" = 1 ] && auto="--auto"   # off unless opencode_auto=1: without it the agent asks first
      "$cli" run --model "$model" $auto --format json --file "$brief" "Do the task in the attached brief. Reply with the result only." 2>/dev/null \
        | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let o="";for(const l of s.split("\n")){try{const e=JSON.parse(l);if(e.type==="text")o+=e.part.text}catch(_){}}process.stdout.write(o+"\n")})' > "$out" || return 1 ;;
    aider)
      model=$(cfg_get aider_model); [ -n "$model" ] || return 1
      aider --model "$model" --message-file "$brief" --yes-always --no-auto-commits > "$out" 2>/dev/null || return 1 ;;
    goose)
      goose run -i "$brief" > "$out" 2>/dev/null || return 1 ;;
    *) return 1 ;;
  esac
  [ -s "$out" ]
}

cmd_delegate() {
  local sub="${1:-}" runner url cli model r
  [ $# -gt 0 ] && shift
  case "$sub" in
    config)
      if [ -f "$DELEGATE_CFG" ]; then cat "$DELEGATE_CFG"
      else echo "no delegation choice for this project: ask the user (none, llama, ollama, unsloth, opencode, aider, goose), then 'lean-gate delegate set runner <value>'"; fi ;;
    set)
      [ $# -eq 2 ] || die "delegate set: give <key> <value>"
      case "$1" in
        runner) case "$2" in none|llama|ollama|unsloth|opencode|aider|goose) ;; *) die "delegate set: runner is none, llama, ollama, unsloth, opencode, aider or goose" ;; esac ;;
        llama_url|llama_model|ollama_url|ollama_model|unsloth_url|unsloth_model|aider_model|opencode_cli) ;;
        fallback) case "$2" in *[!a-z,\ ]*|'') die "delegate set: fallback is a list of llama and opencode, e.g. 'llama opencode'" ;; esac ;;
        opencode_model) case "$2" in opencode/*-free) ;; *) die "delegate set: opencode_model must be an opencode/*-free model" ;; esac ;;
        opencode_auto) case "$2" in 0|1) ;; *) die "delegate set: opencode_auto is 0 or 1" ;; esac ;;
        *) die "delegate set: unknown key $1 (runner, fallback, llama_url, llama_model, ollama_url, ollama_model, unsloth_url, unsloth_model, aider_model, opencode_cli, opencode_model, opencode_auto)" ;;
      esac
      touch "$DELEGATE_CFG"; sed -i "/^$1=/d" "$DELEGATE_CFG"; echo "$1=$2" >> "$DELEGATE_CFG"
      echo "saved $1=$2 in $DELEGATE_CFG" ;;
    check)
      runner=$(cfg_get runner); runner=${runner:-none}
      if [ "$runner" = none ]; then echo "delegation off: do the work here"
      elif runner_up "$runner"; then echo "$runner is up"
      else echo "$runner is down: delegation falls back in order ($(delegate_chain))"; fi ;;
    pick)
      for r in $(delegate_chain); do
        runner_up "$r" && { echo "$r"; return 0; }
      done
      echo none ;;
    run)
      [ $# -eq 2 ] || die "delegate run: give <brief file> <output file>"
      [ -f "$1" ] || die "delegate run: no brief at $1"
      for r in $(delegate_chain); do
        runner_up "$r" || { echo "lean-gate: $r is down, trying the next runner" >&2; continue; }
        if run_on "$r" "$1" "$2"; then
          echo "delegated to $r: $(tok "$2") tokens in $2. Verify it before using it."; return 0
        fi
        echo "lean-gate: $r gave no answer, trying the next runner" >&2
      done
      [ -n "$(delegate_chain)" ] && echo "lean-gate: no delegation runner is up: do the work here" >&2 \
        || echo "lean-gate: delegation is off for this project: do the work here" >&2
      return 3 ;;
    *) die "delegate: 'config', 'set <key> <value>', 'check', 'pick' or 'run <brief> <output>'" ;;
  esac
}

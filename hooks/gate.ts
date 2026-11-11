// Pure rule logic for lean-gate: config merge and command checks. No engine calls here.

export type Level = 'off' | 'warn' | 'block'
export const LEVELS: Level[] = ['off', 'warn', 'block']

export const RULES = [
  'agent-needs-model-effort',
  'no-haiku-coding',
  'free-opencode-only',
  'release-needs-review',
  'state-file-fresh',
  'tests-before-done',
  'delegate-more',
  'no-em-dashes',
  'lean-gate-first',
  'ponytail-active',
  'wp-skills-for-wp-code',
  'no-demo-files-public',
  'review-edited-files-only',
  'max-agents',
  'docs-before-builder',
  'changelog-before-tag',
  'push-after-tag',
  'one-pr-per-fix',
  'distinctive-session-names',
  'phpcs-before-done',
  'wporg-audit-before-release',
] as const
export type Rule = (typeof RULES)[number]
// Old rule ids from before the rename to lean-gate, still read from config files.
export const RENAMED_RULES: Record<string, Rule> = { 'lean-project-first': 'lean-gate-first' }

// A rule the person builds in the band: which tools it watches ("Edit|Write", "*" = all), a regex over the call's text, a message.
// The shell helpers lean-gate switches: startup notes, the context nudge, doc and test guard hints, session drafts.
export const HELPERS = ['startup_notes', 'context_nudge', 'guard_hints', 'session_drafts', 'ponytail'] as const
export type HelperKey = (typeof HELPERS)[number]

export type CustomRule = { id: string; tool: string; match: string; message: string; level: Level }

// read = reading and writing text and images; complex = hard coding; the rest are what they say.
export const ROUTING_KEYS = ['read', 'code', 'complex', 'review', 'plan'] as const
export type RoutingKey = (typeof ROUTING_KEYS)[number]

export const CODING_SECTIONS: readonly RoutingKey[] = ['code', 'complex']

// The sections whose model:effort an agent was started with; an agent counts toward each of them.
export function sectionsFor(routing: Record<RoutingKey, string>, input: { model?: unknown; effort?: unknown }): RoutingKey[] {
  if (typeof input.model !== 'string' || typeof input.effort !== 'string') return []
  const want = `${input.model}:${input.effort}`.toLowerCase()
  return ROUTING_KEYS.filter(k => routing[k].toLowerCase() === want)
}

export type Config = {
  mode: Level
  // Built-in rule names and custom rule ids.
  rules: Record<string, Level>
  custom: CustomRule[]
  delegate_after_lead_calls: number
  context_limit: number
  // Model:effort for each kind of work; a project file can change any of them.
  routing: Record<RoutingKey, string>
  // Most agents in one turn started with each section's model:effort (0 = no limit).
  agent_caps: Record<RoutingKey, number>
  // Most Agent calls in one turn (0 = no limit), a short workflow text shown to Claude each session, and the repo folders that take pull requests only.
  max_agents: number
  workflow: string
  pr_repos: string[]
  // When on, the session prompt tells Claude to record project memory notes, or lessons, by itself.
  auto_memory: boolean
  phpcs_standard: string
  helpers: Record<HelperKey, boolean>
  auto_lessons: boolean
  state_file: string
  // Paths a public repo must not receive (rule no-demo-files-public); a regex source, case-insensitive.
  demo_pattern: string
  // End-of-turn reminders (state file, tests, PHPCS): 'once' a session until a turn fixes it, or 'every' turn.
  reminders: Record<string, 'once' | 'every'>
  // Session rules judge 'projects' only (a registered folder or one with a project marker), or 'everywhere'.
  scope: 'projects' | 'everywhere'
  // Warnings are counted and listed without the pop-up.
  quiet: boolean
  // How the panel opens at session start.
  panel_start: 'details' | 'compact' | 'closed'
}

export const DEFAULTS: Config = {
  mode: 'warn',
  custom: [],
  demo_pattern: '(^|/)(demos?|examples?|samples?|screenshots?|scratch|backups?|fixtures)/|\\.(zip|sql|log|env)$',
  rules: {
    'no-em-dashes': 'warn',
    'lean-gate-first': 'warn',
    'ponytail-active': 'warn',
    'wp-skills-for-wp-code': 'warn',
    'no-demo-files-public': 'warn',
    'review-edited-files-only': 'warn',
    'agent-needs-model-effort': 'block',
    'no-haiku-coding': 'block',
    'free-opencode-only': 'block',
    'release-needs-review': 'block',
    'state-file-fresh': 'warn',
    'tests-before-done': 'warn',
    'delegate-more': 'warn',
    'max-agents': 'warn',
    'docs-before-builder': 'warn',
    'changelog-before-tag': 'warn',
    'push-after-tag': 'warn',
    'one-pr-per-fix': 'warn',
    'distinctive-session-names': 'block',
    'phpcs-before-done': 'warn',
    'wporg-audit-before-release': 'warn',
  },
  max_agents: 0,
  workflow: '',
  pr_repos: [],
  auto_memory: false,
  phpcs_standard: 'WordPress',
  helpers: { startup_notes: true, context_nudge: true, guard_hints: true, session_drafts: true, ponytail: true },
  auto_lessons: false,
  delegate_after_lead_calls: 8,
  context_limit: 300000,
  routing: { read: 'sonnet:medium', code: 'sonnet:high', complex: 'opus:high', review: 'opus:high', plan: 'opus:high' },
  agent_caps: { read: 0, code: 0, complex: 0, review: 0, plan: 0 },
  state_file: '',
  reminders: {},
  scope: 'projects',
  quiet: false,
  panel_start: 'compact',
}

export const norm = (p: string) => p.replace(/\\/g, '/')

// undefined = not a JSON object: the caller decides whether that is "defaults" (reading) or "do not touch" (writing).
export function parseStrict(text: string): Record<string, unknown> | undefined {
  try {
    const v: unknown = JSON.parse(text)
    return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined
  } catch {
    return undefined
  }
}

export const parseJson = (text: string): Record<string, unknown> => parseStrict(text) ?? {}

const isLevel = (v: unknown): v is Level => v === 'off' || v === 'warn' || v === 'block'
const obj = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {})

// Defaults, then global, then project; `rules` and `routing` merge per key. Wrong-typed values are ignored.
// A pattern the gate will run: it compiles, is short, has no backreference and no quantified group that already holds a quantifier
// (the shape of (a+)+ and (a|aa)*, which can hang a regex engine for minutes). The match text is also capped at MATCH_CHARS.
// shortcut: a heuristic, not a proof; other exponential shapes are possible, so the global config stays the only place patterns come from.
export const MATCH_CHARS = 4000
const NESTED_QUANTIFIER = /\((?:[^()\\]|\\.)*(?:[+*]|\{\d+,\d*\})(?:[^()\\]|\\.)*\)(?:[+*]|\{\d+(?:,\d*)?\})/
const QUANTIFIED_ALT = /\((?:[^()\\]|\\.)*\|(?:[^()\\]|\\.)*\)(?:[+*]|\{\d+(?:,\d*)?\})/
const BACKREF = /\\[1-9]|\\k</
// Three or more unbounded wildcards backtrack polynomially on a long line with no match.
const MANY_WILDCARDS = (s: string) => (s.match(/(?<!\\)\.[*+]/g) ?? []).length >= 3
export const regexOk = (s: string) => {
  if (s.length > 300 || NESTED_QUANTIFIER.test(s) || QUANTIFIED_ALT.test(s) || BACKREF.test(s) || MANY_WILDCARDS(s)) return false
  try {
    new RegExp(s, 'i')
    return true
  } catch {
    return false
  }
}

// One entry of `custom_rules`, or undefined when it is malformed: bad id, a built-in's name, an empty or invalid regex.
function customRule(v: unknown): CustomRule | undefined {
  const r = obj(v)
  const { id, tool, match, message } = r
  if (typeof id !== 'string' || !/^[\w-]{1,40}$/.test(id) || (RULES as readonly string[]).includes(id)) return undefined
  if (typeof tool !== 'string' || tool === '' || tool.length > 60 || typeof match !== 'string' || match === '' || match.length > 300 || !regexOk(match)) return undefined
  return { id, tool, match, message: typeof message === 'string' ? message.slice(0, 200) : '', level: isLevel(r.level) ? r.level : 'warn' }
}

export function mergeConfig(...layers: Record<string, unknown>[]): Config {
  const c: Config = { ...DEFAULTS, helpers: { ...DEFAULTS.helpers }, rules: { ...DEFAULTS.rules }, routing: { ...DEFAULTS.routing }, agent_caps: { ...DEFAULTS.agent_caps }, custom: [], pr_repos: [], reminders: {} }
  for (const l of layers) {
    if (isLevel(l.mode)) c.mode = l.mode
    if (typeof l.demo_pattern === 'string' && regexOk(l.demo_pattern)) c.demo_pattern = l.demo_pattern
    // A later layer's rule with the same id replaces the earlier one; its level is its own until `rules` says otherwise.
    for (const raw of Array.isArray(l.custom_rules) ? l.custom_rules : []) {
      const cr = customRule(raw)
      if (cr === undefined) continue
      c.custom = [...c.custom.filter(x => x.id !== cr.id), cr]
      c.rules[cr.id] = cr.level
    }
    const rules = obj(l.rules)
    for (const [raw, v] of Object.entries(rules)) {
      // An old rule id still sets its new one, unless the same layer also names the new id.
      const k = RENAMED_RULES[raw] ?? raw
      if (k !== raw && k in rules) continue
      if (((RULES as readonly string[]).includes(k) || c.custom.some(x => x.id === k)) && isLevel(v)) c.rules[k] = v
    }
    for (const k of ROUTING_KEYS) {
      const v = obj(l.routing)[k]
      if (typeof v === 'string') c.routing[k] = v
      const cap = obj(l.agent_caps)[k]
      if (typeof cap === 'number' && Number.isInteger(cap) && cap >= 0) c.agent_caps[k] = cap
    }
    if (typeof l.delegate_after_lead_calls === 'number' && l.delegate_after_lead_calls > 0) c.delegate_after_lead_calls = l.delegate_after_lead_calls
    if (typeof l.context_limit === 'number' && l.context_limit > 0) c.context_limit = l.context_limit
    if (typeof l.state_file === 'string') c.state_file = l.state_file
    if (typeof l.max_agents === 'number' && Number.isInteger(l.max_agents) && l.max_agents >= 0) c.max_agents = l.max_agents
    if (typeof l.workflow === 'string') c.workflow = l.workflow.slice(0, 600)
    for (const k of HELPERS) if (typeof obj(l.helpers)[k] === 'boolean') c.helpers[k] = obj(l.helpers)[k] as boolean
    if (typeof l.phpcs_standard === 'string' && /^[A-Za-z-]{3,30}$/.test(l.phpcs_standard)) c.phpcs_standard = l.phpcs_standard
    if (typeof l.auto_memory === 'boolean') c.auto_memory = l.auto_memory
    if (typeof l.auto_lessons === 'boolean') c.auto_lessons = l.auto_lessons
    if (Array.isArray(l.pr_repos)) c.pr_repos = l.pr_repos.filter((n): n is string => typeof n === 'string' && n !== '').slice(0, 40)
    for (const [k, v] of Object.entries(obj(l.reminders))) if (v === 'once' || v === 'every') c.reminders[k] = v
    if (l.scope === 'projects' || l.scope === 'everywhere') c.scope = l.scope
    if (typeof l.quiet === 'boolean') c.quiet = l.quiet
    if (l.panel_start === 'details' || l.panel_start === 'compact' || l.panel_start === 'closed') c.panel_start = l.panel_start
  }
  return c
}

// A project's own config file can ship inside a cloned repo, so it may tune rules, routing and limits but cannot switch the whole
// gate off, add rules, set the demo pattern or put text into the session prompt: those come from the global file only.
// Rules it turns down are allowed but never silent: loweredRules names them for the session start and the panel.
export function projectLayer(l: Record<string, unknown>): Record<string, unknown> {
  const { mode: _m, workflow: _w, custom_rules: _c, demo_pattern: _d, ...rest } = l
  return rest
}

// The rules whose level the project file sets below the global one (block to warn, or anything to off).
export function loweredRules(global: Config, merged: Config): string[] {
  return Object.keys(global.rules).filter(r => LEVELS.indexOf(merged.rules[r] ?? 'off') < LEVELS.indexOf(global.rules[r] ?? 'off'))
}

// off if the mode or the rule is off; warn if the mode is warn; else the rule's own value.
export function effective(c: Config, rule: string): Level {
  const own = c.rules[rule] ?? 'off'
  if (c.mode === 'off' || own === 'off') return 'off'
  return c.mode === 'warn' ? 'warn' : own
}

// ---- Rules added from your recurring reminders. Pure checks; register.tsx supplies the session facts.

// The command a shell tool runs, or undefined for any other tool. Bash and PowerShell are both shells to every rule; PowerShell's
// backtick escapes are dropped, since the command parser reads a backtick as bash command substitution.
export function shellCommand(tool: string, input: Record<string, unknown>): string | undefined {
  if (tool !== 'Bash' && tool !== 'PowerShell') return undefined
  const c = typeof input.command === 'string' ? input.command : ''
  // A backtick before a line break continues the line; before anything else it escapes that character.
  return tool === 'PowerShell' ? c.replace(/`\r?\n/g, ' ').replace(/`(.)/g, '$1') : c
}

// What a tool call says, as text a rule can read: the command, the new file text, the agent's prompt, else the input as JSON.
export function callText(tool: string, input: Record<string, unknown>): string {
  const s = (k: string) => (typeof input[k] === 'string' ? (input[k] as string) : '')
  const text = shellCommand(tool, input) ?? (tool === 'Edit' ? s('new_string') : tool === 'Write' ? s('content') : tool === 'Agent' ? `${s('description')}\n${s('prompt')}` : JSON.stringify(input))
  return text.slice(0, 20000)
}

// A custom rule's tool field: "Edit|Write", or "*" for any tool. "Bash" covers PowerShell too: both are the shell.
export const toolMatches = (spec: string, tool: string) => spec === '*' || spec.split('|').some(t => t.trim() === tool || (t.trim() === 'Bash' && tool === 'PowerShell'))

export function customHit(r: CustomRule, tool: string, input: Record<string, unknown>): boolean {
  if (!toolMatches(r.tool, tool)) return false
  try {
    return new RegExp(r.match, 'i').test(callText(tool, input).slice(0, MATCH_CHARS))
  } catch {
    return false
  }
}

// no-em-dashes: file text or a commit message. A shell command counts only when it commits.
export const hasEmDash = (tool: string, input: Record<string, unknown>) => {
  const shell = shellCommand(tool, input)
  if (shell !== undefined && !/\bgit\b[^|;&]*\bcommit\b/.test(shell)) return false
  return (shell !== undefined || tool === 'Edit' || tool === 'Write') && callText(tool, input).includes(String.fromCharCode(0x2014))
}

// lean-gate-first and wp-skills-for-wp-code: a skill call names the skill in `skill` (lean-project is the old name).
export const isLeanSkill = (name: string) => /lean-(gate|project)/i.test(name)
export const isWpSkill = (name: string) => /^wp-|wordpress|woocommerce/i.test(name.split(':').pop() ?? name)

// wp-skills-for-wp-code: a PHP file that is WordPress code, by its path or by what is being written.
// shortcut: an Edit that changes plain lines of a WordPress file has no WordPress word in it and passes; upgrade by reading the file.
const WP_HINT = /\b(add_action|add_filter|wp_[a-z_]+|esc_(html|attr|url)|__\(|ABSPATH|WC_[A-Za-z_]+|woocommerce_[a-z_]+)\b|Plugin Name:/
export const isWpCode = (path: string, text: string) => /\.php$/i.test(path) && (/(^|\/)wp-content\//i.test(norm(path)) || WP_HINT.test(text))

// review-edited-files-only: an agent asked to review or audit, with nothing that scopes it to the edited files.
const SCOPED = /review-scope|edited files|changed files|git diff|\bonly (the )?(edited|changed)|[\w./-]+\.(php|js|jsx|ts|tsx|py|sh|css|scss)\b/i
export function reviewUnscoped(input: Record<string, unknown>): boolean {
  const text = callText('Agent', input)
  return /\b(review|audit)\b/i.test(text) && !SCOPED.test(text)
}

// docs-before-builder: a call that reads documentation. Fetching or searching the web, reading a docs file, or loading a WordPress or Bricks skill.
const DOCS_PATH = /(^|[\\/])(docs?|documentation|reference)[\\/]|WORDPRESS\.md|developer\.wordpress|woocommerce\.github|academy\.bricksbuilder/i
export function readsDocs(tool: string, input: Record<string, unknown>): boolean {
  if (tool === 'WebFetch' || tool === 'WebSearch') return true
  if (tool === 'Read') return DOCS_PATH.test(String(input.file_path ?? ''))
  if (tool === 'Skill') return isWpSkill(String(input.skill ?? '')) || /bricks/i.test(String(input.skill ?? ''))
  return false
}

// Builder code: WordPress code, or anything that names Bricks.
export const isBuilderCode = (path: string, text: string) => isWpCode(path, text) || (/\.(php|js|jsx|ts|tsx|css|scss|json)$/i.test(path) && /\bbricks\b/i.test(`${norm(path)} ${text}`))

// changelog-before-tag: none of the files changed since the last tag is a changelog or readme.
export const changelogMissing = (changed: string[]) => changed.length > 0 && !changed.some(f => /(^|\/)(changelog|changes|history|readme)[^/]*$/i.test(f.trim()))

// True when a segment is `git push` that sends commits (not `--delete`). A directory from -C or cd is not followed: the session cwd is used.
export function isGitPush(command: string): boolean {
  return allSegments(command).some(seg => {
    const t = exe(seg)
    if (progName(t[0]?.v ?? '') !== 'git') return false
    const a = t.slice(1).map(x => x.v)
    let i = 0
    while (i < a.length && (a[i] ?? '').startsWith('-')) i += ['-C', '-c', '--git-dir', '--work-tree', '--namespace'].includes(a[i] ?? '') ? 2 : 1
    return a[i] === 'push' && !a.slice(i + 1).some(v => v === '--delete' || v === '-d')
  })
}

// no-demo-files-public: the changed paths a public repo should not get.
export const demoPaths = (files: string[], pattern: string): string[] => {
  const re = new RegExp(pattern, 'i')
  return files.map(f => f.trim()).filter(f => f !== '' && re.test(f))
}

export const nextLevel = (l: Level): Level => LEVELS[(LEVELS.indexOf(l) + 1) % LEVELS.length] ?? 'off'

// Rules 1 and 2: the Agent tool input.
// Haiku passes only when its model and effort match a section that does no coding (the routing table says which).
export function agentProblems(input: { model?: unknown; effort?: unknown }, routing?: Record<RoutingKey, string>): { rule: Rule; detail: string }[] {
  const out: { rule: Rule; detail: string }[] = []
  const model = typeof input.model === 'string' ? input.model : ''
  const effort = typeof input.effort === 'string' ? input.effort : ''
  if (model === '' || effort === '') out.push({ rule: 'agent-needs-model-effort', detail: `model=${model || '-'} effort=${effort || '-'}` })
  if (/haiku/i.test(model)) {
    const hit = routing === undefined ? [] : sectionsFor(routing, input)
    if (hit.length === 0 || hit.some(k => CODING_SECTIONS.includes(k))) out.push({ rule: 'no-haiku-coding', detail: `model=${model}` })
  }
  return out
}

// ---- Command parsing: segments of tokens, with quoted text and heredoc bodies kept out of the way.

export type Tok = { v: string; q: boolean }

// The line after the heredoc's closing delimiter, or the end of the text.
function afterHeredoc(cmd: string, from: number, delim: string): number {
  let i = from
  while (i < cmd.length) {
    const nl = cmd.indexOf('\n', i)
    const end = nl < 0 ? cmd.length : nl
    if (cmd.slice(i, end).trim() === delim) return end + 1
    i = end + 1
  }
  return cmd.length
}

// Splits a shell command on unquoted && || ; | & newlines and ( ). A quoted word is one token flagged `q`.
// Command substitutions ($( ) and backticks, also inside double quotes) are parsed too and their segments come last.
// shortcut: no variable expansion, aliases, functions or arithmetic; a backslash outside quotes only escapes a space
// (so a Windows path stays literal).
export function segments(cmd: string): Tok[][] {
  const extra: Tok[][] = []
  const scan = (start: number, inSub: boolean): { out: Tok[][]; end: number } => {
    const out: Tok[][] = [[]]
    let cur = ''
    let has = false
    let quoted = false
    let heredoc: string | undefined
    const last = () => out[out.length - 1] as Tok[]
    const word = () => {
      if (has) last().push({ v: cur, q: quoted })
      cur = ''
      has = false
      quoted = false
    }
    const cut = () => {
      word()
      if (last().length > 0) out.push([])
    }
    // A `...` substitution; returns the index after the closing backtick.
    const tick = (i: number) => {
      const j = cmd.indexOf('`', i + 1)
      const end = j < 0 ? cmd.length : j
      extra.push(...segments(cmd.slice(i + 1, end)))
      return end + 1
    }
    let i = start
    while (i < cmd.length) {
      const c = cmd[i] as string
      const next = cmd[i + 1]
      if (c === ')' && inSub) {
        word()
        return { out: out.filter(x => x.length > 0), end: i + 1 }
      }
      if (c === "'") {
        const j = cmd.indexOf("'", i + 1)
        const end = j < 0 ? cmd.length : j
        cur += cmd.slice(i + 1, end)
        has = quoted = true
        i = end + 1
      } else if (c === '"') {
        i++
        while (i < cmd.length && cmd[i] !== '"') {
          if (cmd[i] === '$' && cmd[i + 1] === '(') {
            const r = scan(i + 2, true)
            extra.push(...r.out)
            i = r.end
          } else if (cmd[i] === '`') i = tick(i)
          else {
            if (cmd[i] === '\\' && '$`"\\\n'.includes(cmd[i + 1] ?? 'x')) i++
            cur += cmd[i]
            i++
          }
        }
        has = quoted = true
        i++
      } else if (c === '$' && next === '(') {
        const r = scan(i + 2, true)
        extra.push(...r.out)
        i = r.end
      } else if (c === '`') i = tick(i)
      else if (c === '\\' && next === ' ') {
        cur += ' '
        has = true
        i += 2
      } else if (c === '\n') {
        cut()
        i = heredoc === undefined ? i + 1 : afterHeredoc(cmd, i + 1, heredoc)
        heredoc = undefined
      } else if (c === '<' && next === '<' && cmd[i + 2] !== '<' && cmd[i - 1] !== '<') {
        word()
        const m = /^<<-?\s*(['"]?)\\?([\w.-]+)\1/.exec(cmd.slice(i))
        heredoc = m?.[2]
        i += m ? m[0].length : 2
      } else if (c === '#' && !has) {
        while (i < cmd.length && cmd[i] !== '\n') i++
      } else if (c === ' ' || c === '\t' || c === '\r') {
        word()
        i++
      } else if (c === ';' || c === '(' || c === ')') {
        cut()
        i++
      } else if (c === '|') {
        cut()
        i += next === '|' ? 2 : 1
      } else if (c === '&' && next === '&') {
        cut()
        i += 2
      } else if (c === '&' && (next === '>' || cmd[i - 1] === '>')) {
        cur += c
        has = true
        i++
      } else if (c === '&') {
        cut()
        i++
      } else {
        cur += c
        has = true
        i++
      }
    }
    word()
    return { out: out.filter(x => x.length > 0), end: i }
  }
  return [...scan(0, false).out, ...extra]
}

const baseName = (w: string) => (norm(w).split('/').pop() ?? w).toLowerCase()
// A program's name without directory or launcher extension: C:\x\opencode.cmd -> opencode.
export const progName = (w: string) => baseName(w).replace(/\.(exe|cmd|bat|phar|js|mjs|cjs)$/, '')
const ENV_ASSIGN = /^[A-Za-z_]\w*=/
const WRAPPERS = new Set(['env', 'npx', 'bunx', 'time', 'nohup', 'command', 'exec', 'sudo'])

// The command a segment really runs: env-var prefixes and wrappers (env, timeout N, npx, ...) stripped.
export function exe(seg: Tok[]): Tok[] {
  const t = seg.slice()
  for (;;) {
    const w = t[0]?.v
    if (w === undefined) return t
    if (ENV_ASSIGN.test(w)) t.shift()
    else if (WRAPPERS.has(progName(w))) {
      t.shift()
      while (t[0] !== undefined && (t[0].v.startsWith('-') || ENV_ASSIGN.test(t[0].v))) t.shift()
    } else if (progName(w) === 'timeout') {
      t.shift()
      while (t[0]?.v.startsWith('-')) t.shift()
      t.shift()
    } else return t
  }
}

// The command string a segment hands to another shell, if it does: bash/sh/zsh -c|-lc|-ec, eval, cmd /c, powershell -Command.
function inner(t: Tok[]): string | undefined {
  const n = progName(t[0]?.v ?? '')
  const a = t.slice(1)
  const rest = (k: number) => (k >= 0 ? a.slice(k + 1).map(x => x.v).join(' ') : undefined)
  if (['bash', 'sh', 'zsh', 'dash'].includes(n)) {
    const k = a.findIndex(x => /^-[a-zA-Z]*c$/.test(x.v))
    return k >= 0 ? a[k + 1]?.v : undefined
  }
  if (n === 'eval') return a.map(x => x.v).join(' ')
  if (n === 'cmd') return rest(a.findIndex(x => /^\/[ck]$/i.test(x.v)))
  if (n === 'powershell' || n === 'pwsh') return rest(a.findIndex(x => /^-(c|command)$/i.test(x.v)))
  return undefined
}

// Every segment of the command, plus the segments of the string a shell is handed, right after that segment.
export function allSegments(command: string, depth = 0): Tok[][] {
  return segments(command).flatMap(seg => {
    const s = depth < 3 ? inner(exe(seg)) : undefined
    return s === undefined ? [seg] : [seg, ...allSegments(s, depth + 1)]
  })
}

// Rule 3. Only `-free` ends an allowed model name. A model is read from -m/--model; `run` without one is a problem.
// --help, -h, --version, models and auth never run a model.
export function opencodeProblem(command: string): string | undefined {
  for (const seg of allSegments(command)) {
    const t = exe(seg)
    if (!['opencode', 'opencode-ai'].includes(progName(t[0]?.v ?? ''))) continue
    const args = t.slice(1)
    const first = args[0]?.v ?? ''
    if (['models', 'auth'].includes(first) || args.some(a => ['--help', '-h', '--version'].includes(a.v))) continue
    let model: string | undefined
    args.forEach((a, i) => {
      if (a.v === '-m' || a.v === '--model') model = args[i + 1]?.v ?? ''
      else if (a.v.startsWith('--model=')) model = a.v.slice(8)
      else if (a.v.startsWith('-m=')) model = a.v.slice(3)
    })
    // shortcut: a bare `opencode` (the TUI) or another subcommand without -m passes; only `run` or an explicit model is checked.
    if (model === undefined && first !== 'run') continue
    const name = (model ?? '').split('/').pop() ?? ''
    if (!name.endsWith('-free')) return model === undefined ? 'no model given' : `model ${model}`
  }
  return undefined
}

// ---- Rule 4: real release actions only.

export const SHA = /^[0-9a-f]{7,64}$/

// A path as the next command sees it: backslashes to slashes, ~ to home, Git Bash /e/x to E:/x, relative joined to dir.
export function resolveDir(dir: string, p: string, home = ''): string {
  let q = norm(p)
  if (home !== '' && (q === '~' || q.startsWith('~/'))) q = norm(home).replace(/\/+$/, '') + q.slice(1)
  q = q.replace(/^\/([a-zA-Z])(?=\/|$)/, (_m, d: string) => `${d.toUpperCase()}:`)
  return /^([a-zA-Z]:)?\//.test(q) || /^[a-zA-Z]:$/.test(q) ? q : `${norm(dir).replace(/\/+$/, '')}/${q}`
}

const TAG_READONLY = /^(-l|--list|-d|--delete|-v|--verify|--contains|--no-contains|--merged|--no-merged|--points-at|-n\d*)$/
const TAG_VALUE = /^(-m|-F|-u|--message|--file|--local-user|--cleanup|--format|--sort)$|^-[a-zA-Z]*m$/
const PUSH_VALUE = /^(-o|--push-option|--repo|--receive-pack|--exec)$/
// A refspec that names a tag: refs/tags/..., anything built from a variable, or the word `tag`. A version-shaped name (v1.2.0, but
// also a branch called 1.x or v2) is a tag only if the repo has that tag; `check` carries the name for the caller to ask git.
const TAGLIKE = /refs\/tags\/|\$|^tag$/
const VERSIONLIKE = /^\+?v?\d+(\.\d+)*([-+.][\w.]+)?(:.*)?$/
export type Release = { dir: string; what: string; check?: string }

function gitRelease(a: Tok[], dir: string, home: string): Release | undefined {
  let d = dir
  let i = 0
  for (; i < a.length; i++) {
    const v = a[i]?.v ?? ''
    if (v === '-C') d = resolveDir(d, a[++i]?.v ?? '.', home)
    else if (v === '-c' || v === '--git-dir' || v === '--work-tree' || v === '--namespace') i++
    else if (!v.startsWith('-')) break
  }
  const sub = a[i]?.v
  const rest = a.slice(i + 1).map(t => t.v)
  if (sub === 'tag') {
    let name: string | undefined
    for (let k = 0; k < rest.length; k++) {
      const v = rest[k] as string
      if (TAG_READONLY.test(v) || v.startsWith('--list=')) return undefined
      if (TAG_VALUE.test(v)) k++
      else if (!v.startsWith('-')) name ??= v
    }
    return name === undefined ? undefined : { dir: d, what: `git tag ${name}` }
  }
  if (sub === 'push') {
    let all = false
    const pos: string[] = []
    for (let k = 0; k < rest.length; k++) {
      const v = rest[k] as string
      if (v === '--delete' || v === '-d') return undefined
      if (v === '--tags' || v === '--follow-tags' || v === '--mirror') all = true
      else if (PUSH_VALUE.test(v)) k++
      else if (!v.startsWith('-')) pos.push(v)
    }
    const refs = pos.slice(1)
    if (all || refs.some(r => TAGLIKE.test(r))) return { dir: d, what: 'git push of tags' }
    const v = refs.find(r => VERSIONLIKE.test(r))
    return v === undefined ? undefined : { dir: d, what: 'git push of tags', check: v.replace(/^\+/, '').split(':')[0] }
  }
  return undefined
}

// The first release action in the command and the directory it runs in, or undefined.
export const releaseAction = (command: string, cwd: string, home = ''): Release | undefined => releaseActions(command, cwd, home)[0]

// Every release action in the command, in order (a tag and its push can share one command).
// shortcut: cd, pushd and -C are followed inside one command only; a cd made by an earlier Bash call is not visible, so the
// session cwd is used (upgrade if the engine exposes the Bash tool's working directory).
export function releaseActions(command: string, cwd: string, home = ''): Release[] {
  const found: Release[] = []
  let dir = norm(cwd)
  for (const seg of allSegments(command)) {
    const t = exe(seg)
    const n = progName(t[0]?.v ?? '')
    const a = t.slice(1)
    if (n === 'cd' || n === 'pushd') {
      const p = a.find(x => !x.v.startsWith('-'))
      if (p !== undefined) dir = resolveDir(dir, p.v, home)
    } else if (n === 'git') {
      const r = gitRelease(a, dir, home)
      if (r) found.push(r)
    } else if (n === 'gh') {
      const pos: string[] = []
      for (let k = 0; k < a.length; k++) {
        const v = (a[k] as Tok).v
        if (v === '-R' || v === '--repo') k++
        else if (!v.startsWith('-')) pos.push(v)
      }
      if (pos[0] === 'release' && ['create', 'upload', 'edit', 'delete'].includes(pos[1] ?? '')) found.push({ dir, what: `gh release ${pos[1]}` })
    } else if (n === 'php') {
      if (!a.some(x => x.v === '-l') && a.some(x => baseName(x.v) === 'zip.php')) found.push({ dir, what: 'zip.php' })
    } else if (['node', 'bash', 'sh'].includes(n)) {
      const script = a.find(x => !x.v.startsWith('-'))
      if (script !== undefined && baseName(script.v) === 'zip.php') found.push({ dir, what: 'zip.php' })
    }
  }
  return found
}

export async function sha1Hex(text: string): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text)))
  return [...hash].map(b => b.toString(16).padStart(2, '0')).join('')
}

// Where the reviewed state of a repo is kept: outside the repo, so it never ships in a zip and a repo cannot plant it.
export async function repoKey(top: string): Promise<string> {
  return (await sha1Hex(norm(top).replace(/\/+$/, '').toLowerCase())).slice(0, 16)
}

export const CODE_RELEASE = /\.(php|js|jsx|ts|tsx|py|sh)$/i
export const CODE_EDITED = /\.(php|js|jsx|ts|tsx|py|sh|css|scss)$/i
export const STATE_FILE = /(HANDOFF|STATE)[^/\\]*\.md$/i

export const isStateFile = (path: string, configured: string) => (configured !== '' ? norm(path).endsWith(norm(configured)) : STATE_FILE.test(path))

// ---- Rule 7: a test command is a test runner, or an interpreter running a test script. Lint and typecheck are not tests.
const TEST_NAMES = new Set(['phpunit', 'pytest', 'vitest', 'jest', 'pest', 'mocha', 'ava'])
// Tools whose `test` subcommand runs the tests: bun test, go test, cargo test, make test.
const TEST_SUBCOMMAND = new Set(['bun', 'deno', 'go', 'cargo', 'dotnet', 'make'])
const INTERPRETERS = new Set(['php', 'node', 'bash', 'sh', 'python', 'python3', 'py'])
const TEST_PATH = /(^|[\\/])tests?[\\/][^ ]*\.(php|js|mjs|sh)$/i
const TEST_SCRIPT = /(test|check|harness)[^/\\]*\.php$/i

// PHP_CodeSniffer or its fixer, run directly, through composer scripts or through lean-gate phpcs.
export function isPhpcsCommand(command: string): boolean {
  return allSegments(command).some(seg => {
    const t = exe(seg)
    const n = progName(t[0]?.v ?? '')
    const a = t.slice(1).map(x => x.v)
    if (n === 'phpcs' || n === 'phpcbf') return true
    if (n === 'lean-gate' || n === 'lean-project') return a[0] === 'phpcs'
    if (n === 'composer') return a[0] === 'run' && /^(lint|phpcs|cs)/.test(a[1] ?? '') || a[0] === 'lint' || a[0] === 'phpcs'
    return INTERPRETERS.has(n) && a.some(x => /(^|\/)phpc(s|bf)(\.phar)?$/.test(x))
  })
}

// lean-gate audit wporg, run directly or through bash.
export function isWporgAuditCommand(command: string): boolean {
  return allSegments(command).some(seg => {
    let a = exe(seg).map(x => x.v)
    if (INTERPRETERS.has(progName(a[0] ?? ''))) a = a.slice(1).filter(x => !x.startsWith('-'))
    return ['lean-gate', 'lean-project'].includes(progName(a[0] ?? '')) && a[1] === 'audit' && a[2] === 'wporg'
  })
}

// The message of an `svn commit` / `svn ci` in the command: '' when none is given, undefined when there is no svn commit.
export function svnCommitMessage(command: string): string | undefined {
  for (const seg of allSegments(command)) {
    const a = exe(seg).map(x => x.v)
    if (progName(a[0] ?? '') !== 'svn' || !['commit', 'ci'].includes(a[1] ?? '')) continue
    const k = a.findIndex(x => x === '-m' || x === '--message')
    const eq = a.find(x => x.startsWith('--message='))
    return k > 0 ? (a[k + 1] ?? '') : eq !== undefined ? eq.slice(10) : ''
  }
  return undefined
}

// G14: a WordPress.org SVN commit message that says nothing about the change ("update", "cleanup", one or two words).
export const vagueCommitMessage = (msg: string) => msg.trim().split(/\s+/).filter(Boolean).length < 3 || /^(update[sd]?|clean ?up|fix(es)?|wip|test|changes|minor( changes)?|commit)\.?$/i.test(msg.trim())

export function isTestCommand(command: string): boolean {
  return allSegments(command).some(seg => {
    const t = exe(seg)
    const n = progName(t[0]?.v ?? '')
    const a = t.slice(1).map(x => x.v)
    if (TEST_NAMES.has(n)) return true
    if (TEST_SUBCOMMAND.has(n)) return a[0] === 'test'
    if (['npm', 'pnpm', 'yarn', 'composer'].includes(n)) return a[0] === 'test' || (a[0] === 'run' && (a[1] ?? '').startsWith('test')) || (n === 'npm' && (a[0] ?? '') === 'run-script' && (a[1] ?? '').startsWith('test'))
    if (n === 'claude') return a[0] === 'plugin' && a[1] === 'test'
    if (!INTERPRETERS.has(n)) return false
    if (n === 'node' && a.includes('--test')) return true
    const k = a.findIndex(x => !x.startsWith('-'))
    const script = a[k]
    if (script === undefined) return false
    if (n === 'php' && progName(script) === 'artisan') return a[k + 1] === 'test'
    return TEST_NAMES.has(progName(script)) || TEST_PATH.test(script) || (n === 'php' && TEST_SCRIPT.test(script))
  })
}

// Project registry: the projects the hub knows, matched by folder or by name. Detection reads; it never acts.
export type Project = { name: string; path: string; aliases: string[] }

export function parseRegistry(text: string | undefined): Project[] {
  const list = (() => {
    try {
      return JSON.parse(text ?? '[]') as unknown
    } catch {
      return []
    }
  })()
  if (!Array.isArray(list)) return []
  const out: Project[] = []
  for (const p of list) {
    const o = obj(p)
    if (typeof o.name !== 'string' || typeof o.path !== 'string' || o.name === '' || o.path === '') continue
    out.push({ name: o.name, path: norm(o.path), aliases: Array.isArray(o.aliases) ? o.aliases.filter((a): a is string => typeof a === 'string' && a.length >= 4) : [] })
  }
  return out.slice(0, 200)
}

// The project whose folder holds `cwd` (the longest path wins).
export function projectAt(reg: Project[], cwd: string): Project | undefined {
  const c = norm(cwd).toLowerCase()
  return reg.filter(p => c === p.path.toLowerCase() || c.startsWith(`${p.path.toLowerCase()}/`)).sort((a, b) => b.path.length - a.path.length)[0]
}

// A project named in the prompt (name or alias, whole word, 4+ letters) that is not the one already open.
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
export function projectMentioned(reg: Project[], text: string, cwd: string): Project | undefined {
  const here = projectAt(reg, cwd)
  const t = text.toLowerCase()
  const named = (n: string) => n.length >= 4 && new RegExp('(^|[^a-z0-9])' + escRe(n.toLowerCase()) + '($|[^a-z0-9])').test(t)
  return reg.find(p => p !== here && [p.name, ...p.aliases].some(named))
}

// `lean-gate stats` output, trimmed lines: the rows under "by rule:" as [rule, hits, blocks], noisiest first.
export function statRules(out: string[]): [string, number, number][] {
  const from = out.indexOf('by rule:')
  const to = out.indexOf('by project:')
  if (from < 0) return []
  return out.slice(from + 1, to < 0 ? undefined : to).flatMap(l => {
    const m = /^(\d+)\s+(\S+)/.exec(l)
    return m?.[1] && m[2] ? [[m[2], Number(m[1]), Number(/(\d+) block/.exec(l)?.[1] ?? 0)] as [string, number, number]] : []
  })
}

// The same output with only the first n rows of each group (rows start with their hit count).
export function statsView(out: string[], n = 5): string[] {
  let kept = 0
  return out.filter(l => (/^\d/.test(l) ? ++kept <= n : ((kept = 0), true)))
}

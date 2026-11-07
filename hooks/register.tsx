import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderChildren, ToolCallInput } from 'claude-code'

import type { LeanGateBand, LeanGateRoute, LeanGateViolation } from '../types/index'
import {
  CODE_EDITED,
  CODE_RELEASE,
  RULES,
  ROUTING_KEYS,
  HELPERS,
  parseRegistry,
  projectAt,
  projectMentioned,
  CODING_SECTIONS,
  sectionsFor,
  changelogMissing,
  isBuilderCode,
  readsDocs,
  SHA,
  agentProblems,
  callText,
  customHit,
  demoPaths,
  effective,
  hasEmDash,
  isGitPush,
  isLeanSkill,
  isStateFile,
  isTestCommand,
  isPhpcsCommand,
  isWpCode,
  isWpSkill,
  reviewUnscoped,
  mergeConfig,
  nextLevel,
  norm,
  projectLayer,
  opencodeProblem,
  parseJson,
  parseStrict,
  releaseAction,
  sha1Hex,
  repoKey,
} from './gate'
import type { Config, Level, Project, RoutingKey } from './gate'

const EMPTY: LeanGateBand = {
  details: false,
  route: 'main',
  run: 0,
  lead: 0,
  sub: 0,
  violations: [],
  stateAt: 0,
  codeAt: 0,
  tests: 'none',
  release: 'unknown',
  noRoute: false,
  packs: '',
  memory: '',
  memoryProjects: [],
  dueRepos: [],
  shut: [],
  board: [],
  lessons: [],
  ptMode: '',
  tools: [],
  proj: '',
  projNew: false,
  projHit: null,
}
const band = atom({ plugin: 'lean-project', key: 'band' } as const, EMPTY)
const PANE = 'lean-gate'

// The route is "main" (no instruction), "free", or "<model>:<effort>", the same choices as Model routing.
const ROUTE_MODELS = ['main', 'haiku', 'sonnet', 'opus', 'fable', 'free']
const EFFORT_LIST = ['low', 'medium', 'high', 'xhigh', 'max']
const routeOk = (v: unknown): v is LeanGateRoute => typeof v === 'string' && /^(main|free|(haiku|sonnet|opus|fable):(low|medium|high|xhigh|max))$/.test(v)
const routeText = (r: LeanGateRoute) => (r === 'free' ? 'a free OpenCode model (name ends in -free)' : r)
const HELPER_LABEL: Record<(typeof HELPERS)[number], string> = { startup_notes: 'startup notes', context_nudge: 'context nudge', guard_hints: 'doc and test hints', session_drafts: 'session drafts', ponytail: 'ponytail hooks' }
const PACKS = ['wp', 'bricks', 'ui-ux']
// Ready-made patterns for the rule builder: the band has buttons, not a text field. Anything else goes in custom_rules by hand or via Ask Claude.
const PRESETS = [
  { id: 'force-push', label: 'force push', tool: 'Bash', match: '\\bgit\\s+push\\b[^|;&]*(--force\\b|--force-with-lease|\\s-f\\b)', message: 'no force push' },
  { id: 'rm-rf', label: 'rm -rf', tool: 'Bash', match: '\\brm\\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)\\b', message: 'recursive force delete' },
  { id: 'sudo', label: 'sudo', tool: 'Bash', match: '\\bsudo\\b', message: 'no sudo' },
  { id: 'npm-install', label: 'new dependency', tool: 'Bash', match: '\\b(npm|pnpm|yarn)\\s+(i|install|add)\\b', message: 'adding a dependency: is it needed?' },
  { id: 'secret', label: 'hardcoded secret', tool: 'Edit|Write', match: '(password|passwd|secret|api[_-]?key|token)\\s*[:=]\\s*[\'"][^\'"\\s]{8,}[\'"]', message: 'looks like a hardcoded secret' },
  { id: 'debug', label: 'debug leftover', tool: 'Edit|Write', match: 'console\\.log\\(|var_dump\\(|print_r\\(', message: 'debug output left in code' },
  { id: 'todo', label: 'TODO left', tool: 'Edit|Write', match: '\\b(TODO|FIXME|XXX)\\b', message: 'unfinished marker written' },
] as const
// What a routing button steps through; a value typed into the config by hand is kept until the button is pressed.
const MODEL_NAMES = ['haiku', 'sonnet', 'opus', 'fable', 'free'] as const
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const
const AGENT_LIMITS = [0, 2, 3, 4, 6, 8] as const
const SECTION_CAPS = [0, 1, 2, 3, 4, 6] as const
const DELEGATE_AFTER = [4, 6, 8, 12, 16] as const
const CONTEXT_LIMITS = [200000, 300000, 500000, 1000000] as const
const ROUTING_LABEL: Record<RoutingKey, string> = { read: 'Reading and writing (text, images)', code: 'Coding', complex: 'Complex coding', review: 'Review', plan: 'Planning' }
// Rules that only ever warn (they run after the work), so a block override has nothing to act on.
const WARN_ONLY = new Set(['routing-line', 'state-file-fresh', 'tests-before-done', 'phpcs-before-done', 'push-after-tag'])
// The details view lists rules by group, each with a one-line meaning.
const RULE_GROUPS: readonly (readonly [string, readonly string[]])[] = [
  ['Agents and models', ['agent-needs-model-effort', 'no-haiku-coding', 'free-opencode-only', 'delegate-more', 'max-agents', 'review-edited-files-only', 'distinctive-session-names']],
  ['Every session', ['lean-project-first', 'ponytail-active', 'routing-line', 'state-file-fresh', 'tests-before-done', 'no-em-dashes']],
  ['Releases and git', ['release-needs-review', 'changelog-before-tag', 'push-after-tag', 'one-pr-per-fix', 'no-demo-files-public']],
  ['WordPress and docs', ['wp-skills-for-wp-code', 'docs-before-builder', 'phpcs-before-done']],
]
const RULE_INFO: Record<string, string> = {
  'agent-needs-model-effort': 'Agent calls must set a model and effort',
  'no-haiku-coding': 'Haiku never writes code',
  'free-opencode-only': 'OpenCode runs must use a free model',
  'delegate-more': 'Long runs of reads go to a subagent',
  'max-agents': 'Limit on subagents per turn',
  'review-edited-files-only': 'A review agent is scoped to files',
  'lean-project-first': 'Load lean-project before editing code',
  'ponytail-active': 'Ponytail on before editing code',
  'routing-line': 'State the model routing before the first call',
  'state-file-fresh': 'Touch the state file after code edits',
  'tests-before-done': 'Run tests after code edits',
  'phpcs-before-done': 'Run PHPCS after PHP edits',
  'no-em-dashes': 'No em dashes in files or commit messages',
  'distinctive-session-names': 'Sub-session titles start with date and time',
  'release-needs-review': 'Review before a release tag',
  'changelog-before-tag': 'Changelog or readme change before a tag',
  'push-after-tag': 'Push the tag in the same turn',
  'one-pr-per-fix': 'Listed repos take PRs, not pushes to main',
  'no-demo-files-public': 'No demo files in a push to a public repo',
  'wp-skills-for-wp-code': 'Load the wp-* skills for WordPress code',
  'docs-before-builder': 'Read the docs before builder or WordPress code',
}
// Rule 8 counts reading tools only: Bash is neither counted nor ever denied.
const DELEGATE = new Set(['Read', 'Grep', 'Glob'])
const TOOL_MS = 3000
const OTHER_MS = 5000
const GIT_BASH = 'C:/Program Files/Git/bin/bash.exe'
const LOG_LINES = 500

const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
const age = (ms: number) => (ms < 60000 ? '<1m' : ms < 3600000 ? `${Math.floor(ms / 60000)}m` : `${Math.floor(ms / 3600000)}h${Math.floor((ms % 3600000) / 60000)}m`)
const kilo = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n))
const base = (path: string) => norm(path).replace(/\/+$/, '').split('/').pop() ?? path

// Persisted state from any older version: every field is checked, so nothing throws or turns into NaN.
function sane(raw: unknown): LeanGateBand {
  const r = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
  const oneOf = <T extends string>(v: unknown, all: readonly T[], d: T): T => (all.includes(v as T) ? (v as T) : d)
  const rows = Array.isArray(r.violations) ? r.violations : []
  const violations = rows
    .filter((v): v is LeanGateViolation => typeof v === 'object' && v !== null && typeof v.rule === 'string' && typeof v.action === 'string' && typeof v.detail === 'string' && Number.isFinite(v.at))
    .slice(-50)
  return {
    details: r.details === true,
    route: routeOk(r.route) ? r.route : 'main',
    run: num(r.run, 0),
    lead: num(r.lead, 0),
    sub: num(r.sub, 0),
    violations,
    stateAt: num(r.stateAt, 0),
    codeAt: num(r.codeAt, 0),
    tests: oneOf(r.tests, ['none', 'pass', 'fail'] as const, 'none'),
    release: oneOf(r.release, ['unknown', 'due', 'ok'] as const, 'unknown'),
    noRoute: r.noRoute === true,
    packs: typeof r.packs === 'string' ? r.packs : '',
    memory: typeof r.memory === 'string' ? r.memory : '',
    memoryProjects: Array.isArray(r.memoryProjects) ? r.memoryProjects.filter((n): n is string => typeof n === 'string').slice(0, 12) : [],
    dueRepos: Array.isArray(r.dueRepos) ? r.dueRepos.filter((n): n is string => typeof n === 'string').slice(0, 40) : [],
    shut: Array.isArray(r.shut) ? r.shut.filter((n): n is string => typeof n === 'string').slice(0, 40) : [],
    board: Array.isArray(r.board) ? r.board.filter((n): n is string => typeof n === 'string').slice(0, 16) : [],
    ptMode: typeof r.ptMode === 'string' ? r.ptMode : '',
    tools: Array.isArray(r.tools) ? r.tools.filter((n): n is string => typeof n === 'string').slice(0, 8) : [],
    proj: typeof r.proj === 'string' ? r.proj : '',
    projNew: r.projNew === true,
    projHit: typeof (r.projHit as { name?: unknown } | null)?.name === 'string' && typeof (r.projHit as { path?: unknown }).path === 'string' ? (r.projHit as { name: string; path: string }) : null,
    lessons: Array.isArray(r.lessons) ? r.lessons.filter((n): n is string => typeof n === 'string').slice(0, 12) : [],
  }
}
const load = async ($: EngineInterface): Promise<LeanGateBand> => sane(await read($, band))
const patch = ($: EngineInterface, change: Partial<LeanGateBand>) => update($, band, b => ({ ...sane(b), ...change }))

// What the lead session did, kept in module memory and updated before any await, so parallel tool calls cannot lose a count.
type Mem = {
  edited: Set<string>
  stateTouched: boolean
  tested: boolean
  phpcs: boolean
  php: number
  routed: boolean
  warned: Set<string>
  // Skills loaded this session (kept across turns) and the rule-builder draft the band is editing.
  leanLoaded: boolean
  wpSkill: boolean
  draft: { preset: number; level: Level }
  // Documentation read this session; Agent calls this turn; a tag made and a push done this turn.
  docsRead: boolean
  agents: number
  // Agents this turn per routing section, and the sections each call counted toward (so a refused call can be taken back out).
  agentsBy: Record<string, number>
  counted: Map<string, RoutingKey[]>
  tagged: boolean
  pushed: boolean
  // One-shot overrides from the band: the next hit of this rule is allowed (even a block) or blocked (even a warn).
  once: Map<string, 'allow' | 'block'>
  run: number
  lead: number
  sub: number
  chain: Promise<void>
}

// One queue for every config and log write.
function enqueue<T>(mem: Mem, job: () => Promise<T>): Promise<T> {
  const run = mem.chain.then(job)
  mem.chain = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

// Windows sets USERPROFILE, not HOME.
const home = async ($: EngineInterface) => (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE'))
const claudeDir = async ($: EngineInterface) => norm((await $.env.get('CLAUDE_CONFIG_DIR')) ?? `${await home($)}/.claude`)

type Read = { kind: 'missing' } | { kind: 'error' } | { kind: 'ok'; text: string }

// A missing file and an unreadable one are different things: only the first is "nothing there".
async function readFile($: EngineInterface, path: string): Promise<Read> {
  try {
    if (!(await $.fs.exists(path))) return { kind: 'missing' }
    const text = await $.fs.read(path)
    return typeof text === 'string' ? { kind: 'ok', text } : { kind: 'error' }
  } catch {
    return { kind: 'error' }
  }
}
const readText = async ($: EngineInterface, path: string) => {
  const r = await readFile($, path)
  return r.kind === 'ok' ? r.text : undefined
}

// Global file, then the session project's file; a missing or bad file reads as defaults.
async function loadConfig($: EngineInterface): Promise<Config> {
  const global = parseJson((await readText($, `${await claudeDir($)}/lean-project.json`)) ?? '')
  const project = parseJson((await readText($, `${norm(await $.session.cwd())}/.lean-project.json`)) ?? '')
  return mergeConfig(global, projectLayer(project))
}

// Read-modify-write of the GLOBAL file, keeping unknown keys. A file that is unreadable or not a JSON object is never written.
// shortcut: the band shows the merged value, so a rule a project file overrides looks unchanged after a press; edit the project file then.
function editGlobal($: EngineInterface, mem: Mem, edit: (json: Record<string, unknown>) => void): Promise<void> {
  return enqueue(mem, async () => {
    const file = `${await claudeDir($)}/lean-project.json`
    const r = await readFile($, file)
    let json: Record<string, unknown> | undefined = {}
    if (r.kind === 'ok' && r.text.trim() !== '') json = parseStrict(r.text)
    if (r.kind === 'error' || json === undefined) return $.ui.toast('lean-gate: global config unreadable, not changed')
    edit(json)
    await $.fs.write(file, `${JSON.stringify(json, null, 2)}\n`)
    $.ui.invalidate('ui.render')
  }).catch(() => undefined)
}

// The violation log has no append, so each row is read, extended and written inside the queue.
// shortcut: two sessions logging in the same instant can drop a row; use $.fs append if the API gets one.
function logRow($: EngineInterface, mem: Mem, row: string): Promise<void> {
  return enqueue(mem, async () => {
    const file = `${await claudeDir($)}/lean-violations.tsv`
    const r = await readFile($, file)
    if (r.kind !== 'error') await $.fs.write(file, `${r.kind === 'ok' ? r.text : ''}${row}\n`)
  }).catch(() => undefined)
}

function trimLog($: EngineInterface, mem: Mem): Promise<void> {
  return enqueue(mem, async () => {
    const file = `${await claudeDir($)}/lean-violations.tsv`
    const r = await readFile($, file)
    if (r.kind !== 'ok') return
    const lines = r.text.split('\n').filter(l => l !== '')
    if (lines.length > LOG_LINES) await $.fs.write(file, `${lines.slice(-LOG_LINES).join('\n')}\n`)
  }).catch(() => undefined)
}

const git = ($: EngineInterface, dir: string, ms: number, args: string[], env?: Record<string, string>) =>
  $.process.run(['git', ...args], { cwd: dir, timeoutMs: ms, ...(env ? { env } : {}) }).catch(() => undefined)
const CODE_GLOBS = ['*.php', '*.js', '*.jsx', '*.ts', '*.tsx', '*.py', '*.sh']

// Git Bash when it is installed (plain `bash` on Windows may be WSL's), else whatever `bash` is on PATH.
async function shell($: EngineInterface, cwd: string, command: string) {
  const bash = (await $.fs.exists(GIT_BASH).catch(() => false)) ? GIT_BASH : 'bash'
  return $.process.run([bash, '-c', command], { cwd, timeoutMs: OTHER_MS }).catch(() => undefined)
}

// A fingerprint of the uncommitted code: the diff of tracked code files against HEAD, plus the untracked code files' names and sizes.
// '' = no uncommitted code. undefined = git did not answer.
// shortcut: an untracked file edited without changing its size keeps the same fingerprint; hash its content if that matters.
async function workFp($: EngineInterface, repo: string, ms: number): Promise<string | undefined> {
  const [diff, others] = await Promise.all([git($, repo, ms, ['diff', 'HEAD', '--', ...CODE_GLOBS]), git($, repo, ms, ['ls-files', '--others', '--exclude-standard'])])
  if (diff === undefined || others === undefined) return undefined
  const names = others.stdout
    .split('\n')
    .map(f => f.trim())
    .filter(f => CODE_RELEASE.test(f))
    .sort()
    .slice(0, 200)
  if (diff.stdout.trim() === '' && names.length === 0) return ''
  const sizes = await Promise.all(names.map(async n => (await $.fs.stat(`${repo}/${n}`).catch(() => undefined))?.size ?? 0))
  return sha1Hex(`${diff.stdout}\n${names.map((n, i) => `${n}:${sizes[i]}`).join('\n')}`)
}

// The tree git would commit if everything in the working tree were committed now, built in a private index so the repo's own
// index stays untouched. Empty when git cannot say; the "committed after review" path then never matches.
// shortcut: leaves one small <hash>.index file per reviewed repo in lean-review/.
async function workTree($: EngineInterface, repo: string): Promise<string> {
  const env = { GIT_INDEX_FILE: `${await claudeDir($)}/lean-review/${await repoKey(repo)}.index` }
  let out
  for (const step of [['read-tree', 'HEAD'], ['add', '-A'], ['write-tree']]) {
    out = await git($, repo, OTHER_MS, step, env)
    if (out === undefined || out.exitCode !== 0) return ''
  }
  const tree = out?.stdout.trim() ?? ''
  return /^[0-9a-f]{40,64}$/.test(tree) ? tree : ''
}

type Review = 'ok' | 'due' | 'unknown' | 'silent'

// Rule 4's check. unknown = not a repo; silent = git did not answer in time. Both fail open for the caller.
// Due when code changed between the reviewed commit and HEAD, or the uncommitted code is not what was reviewed. Committing exactly
// what was reviewed (HEAD's tree is the reviewed tree, nothing left uncommitted) is not due.
async function reviewState($: EngineInterface, dir: string, ms: number): Promise<Review> {
  const top = await git($, dir, ms, ['rev-parse', '--show-toplevel'])
  if (top === undefined) return 'silent'
  if (top.exitCode !== 0) return 'unknown'
  const repo = norm(top.stdout.trim())
  const r = await readFile($, `${await claudeDir($)}/lean-review/${await repoKey(repo)}.json`)
  const m = r.kind === 'ok' ? parseJson(r.text) : {}
  // The sha goes to git as an argument: it must be hex, never something shaped like an option.
  if (typeof m.sha !== 'string' || !SHA.test(m.sha) || m.repo !== repo || typeof m.fp !== 'string' || typeof m.tree !== 'string') return 'due'
  const [now, tree, names] = await Promise.all([workFp($, repo, ms), git($, repo, ms, ['rev-parse', 'HEAD^{tree}']), git($, repo, ms, ['diff', '--name-only', m.sha, 'HEAD', '--'])])
  if (now === undefined || tree === undefined || names === undefined) return 'silent'
  const committedCode = names.exitCode !== 0 || names.stdout.split('\n').some(f => CODE_RELEASE.test(f.trim()))
  if (!committedCode && now === m.fp) return 'ok'
  return m.tree !== '' && tree.stdout.trim() === m.tree && now === '' ? 'ok' : 'due'
}

// The immediate child folders of a non-repo cwd that are repos with a review due.
async function dueChildren($: EngineInterface, cwd: string): Promise<string[]> {
  const own = await git($, cwd, OTHER_MS, ['rev-parse', '--show-toplevel'])
  if (own === undefined || own.exitCode === 0) return []
  const dirs = (await $.fs.list(cwd).catch(() => [])).filter(f => f.kind === 'dir' && !f.name.startsWith('.')).slice(0, 40)
  const states = await Promise.all(dirs.map(d => reviewState($, `${cwd}/${d.name}`, OTHER_MS)))
  return dirs.filter((_, i) => states[i] === 'due').map(d => d.name)
}

async function refreshRelease($: EngineInterface) {
  const cwd = norm(await $.session.cwd())
  const state = await reviewState($, cwd, OTHER_MS)
  const details = (await load($)).details
  await patch($, { release: state === 'silent' ? 'unknown' : state, ...(details ? { dueRepos: await dueChildren($, cwd) } : {}) })
}

// Writes the reviewed state for the repo at dir; returns its name, or undefined when dir is not a repo.
async function markRepo($: EngineInterface, dir: string): Promise<string | undefined> {
  const top = await git($, dir, OTHER_MS, ['rev-parse', '--show-toplevel'])
  if (top === undefined || top.exitCode !== 0) return undefined
  const repo = norm(top.stdout.trim())
  const file = `${await claudeDir($)}/lean-review/${await repoKey(repo)}.json`
  // The folder has to exist before git writes its private index there; until the real marker lands this one reads as "due".
  await $.fs.write(file, `${JSON.stringify({ repo })}\n`)
  const [head, fp, tree] = await Promise.all([git($, repo, OTHER_MS, ['rev-parse', 'HEAD']), workFp($, repo, OTHER_MS), workTree($, repo)])
  const sha = head?.stdout.trim() ?? ''
  if (head === undefined || head.exitCode !== 0 || !SHA.test(sha) || fp === undefined) return undefined
  await $.fs.write(file, `${JSON.stringify({ repo, sha, tree, fp, at: await $.clock.now() })}\n`)
  return base(repo)
}

// The Reviewed button marks the cwd repo; in a folder that is not a repo it marks nothing.
async function markReviewed($: EngineInterface, cwd: string): Promise<string> {
  const own = await markRepo($, cwd)
  return own !== undefined ? `Marked reviewed: ${own}` : 'cd into a repo, or use a per-repo button in Details'
}

// Project memory for the cwd: its one-line index and the other projects that have notes (to link to). Both come from the CLI.
async function readMemory($: EngineInterface) {
  const cwd = norm(await $.session.cwd())
  const [index, projects] = await Promise.all([shell($, cwd, 'lean-project memory index'), shell($, cwd, 'lean-project memory projects')])
  const names = (projects?.stdout ?? '').split('\n').map(l => l.trim().split(/\s+/)[1]).filter((n): n is string => !!n && /^[a-z0-9._-]+$/.test(n))
  await patch($, { memory: cut((index?.stdout ?? '').trim(), 160), memoryProjects: names.slice(0, 12) })
}

// The shared task board and the lessons, as the CLI prints them: a few trimmed lines each, shown in the details.
const lines = (out: string, n: number) => out.split('\n').map(l => cut(l.trim(), 100)).filter(Boolean).slice(0, n)
async function readBoard($: EngineInterface) {
  const r = await shell($, norm(await $.session.cwd()), 'lean-project board')
  await patch($, { board: r === undefined || r.exitCode ? ['no board here yet: cards appear when work is delegated'] : lines(r.stdout, 16) })
}
async function readLessons($: EngineInterface) {
  const r = await shell($, norm(await $.session.cwd()), 'lean-project lessons')
  await patch($, { lessons: lines(r?.stdout ?? '', 12) })
}

// Project registry (~/.claude/lean-projects.json): which project the folder is, and whether a prompt names another one.
// Ponytail mode (the flag file its hooks keep) and the status lines of the vendored tools and PHPCS.
async function readTools($: EngineInterface) {
  const mode = ((await readText($, `${await claudeDir($)}/.ponytail-active`)) ?? 'off').trim() || 'off'
  const r = await shell($, norm(await $.session.cwd()), 'lean-project vendor status; lean-project phpcs status')
  await patch($, { ptMode: mode, tools: lines(r?.stdout ?? '', 8) })
}
const loadRegistry = async ($: EngineInterface) => parseRegistry((await readText($, `${await claudeDir($)}/lean-projects.json`)) ?? undefined)
function editRegistry($: EngineInterface, mem: Mem, edit: (list: Project[]) => Project[]): Promise<void> {
  return enqueue(mem, async () => {
    const file = `${await claudeDir($)}/lean-projects.json`
    await $.fs.write(file, `${JSON.stringify(edit(parseRegistry((await readText($, file)) ?? undefined)), null, 2)}
`)
    $.ui.invalidate('ui.render')
  }).catch(() => undefined)
}
const PROJECT_MARKERS = ['AGENTS.md', 'CLAUDE.md', '.git', 'README.md', 'package.json', 'composer.json']
async function detectProject($: EngineInterface) {
  const cwd = norm(await $.session.cwd())
  const hit = projectAt(await loadRegistry($), cwd)
  const marked = hit === undefined ? (await $.fs.list(cwd).catch(() => [])).some(f => PROJECT_MARKERS.includes(f.name)) : false
  await patch($, { proj: hit?.name ?? '', projNew: marked })
}

// Rule 5: was the "routing:" line in the assistant text before this first Edit/Write/Agent call?
// shortcut: reads the transcript, so it judges only when the call's own assistant row is already stored; otherwise it stays silent.
export async function lacksRoutingLine($: EngineInterface, id: string): Promise<boolean> {
  const rows = await $.session.messages()
  const last = rows[rows.length - 1]
  if (last?.role !== 'assistant' || !last.toolUses.some(u => u.tool_use_id === id)) return false
  let text = ''
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i]
    if (r === undefined || (r.role === 'user' && !r.toolResults?.length)) break
    if (r.role === 'assistant') text += `${r.text}\n`
  }
  return !/routing:/i.test(text)
}

// no-demo-files-public: demo-like paths in the commits a push would send, only when the repo is public. Any failure reads as "none".
// shortcut: needs the gh CLI to learn visibility; without it the rule stays silent.
async function publicDemoFiles($: EngineInterface, dir: string, pattern: string): Promise<string[]> {
  const vis = await $.process.run(['gh', 'repo', 'view', '--json', 'isPrivate', '-q', '.isPrivate'], { cwd: dir, timeoutMs: TOOL_MS }).catch(() => undefined)
  if (vis === undefined || vis.exitCode !== 0 || vis.stdout.trim() !== 'false') return []
  let names = await git($, dir, TOOL_MS, ['diff', '--name-only', '@{u}..HEAD'])
  // No upstream yet: the whole tree is what the push sends.
  if (names === undefined || names.exitCode !== 0) names = await git($, dir, TOOL_MS, ['ls-files'])
  return names === undefined || names.exitCode !== 0 ? [] : demoPaths(names.stdout.split('\n'), pattern).slice(0, 5)
}

// changelog-before-tag: since the last tag, no changelog or readme file changed (committed or not). No tag yet, or git silent: false.
async function changelogUnchanged($: EngineInterface, dir: string): Promise<boolean> {
  const tag = await git($, dir, TOOL_MS, ['describe', '--tags', '--abbrev=0'])
  const last = tag?.exitCode === 0 ? tag.stdout.trim() : ''
  if (!/^[\w./+-]+$/.test(last)) return false
  const names = await git($, dir, TOOL_MS, ['diff', '--name-only', last])
  return names !== undefined && names.exitCode === 0 && changelogMissing(names.stdout.split('\n').filter(f => f.trim() !== ''))
}

// Records a violation and returns the deny text when the rule blocks. Warn: allow and toast once per turn.
async function trip($: EngineInterface, mem: Mem, cfg: Config, rule: string, detail: string, message: string, canBlock = true): Promise<string | undefined> {
  const level = effective(cfg, rule)
  if (level === 'off') return undefined
  // A one-shot override is spent on the first hit of its rule; a rule that cannot block ignores "block once" and keeps it.
  // Allow once is spent only on a hit that would really have blocked.
  const once = mem.once.get(rule)
  const allow = once === 'allow' && level === 'block' && canBlock
  const forceBlock = once === 'block' && canBlock
  if (allow || forceBlock) mem.once.delete(rule)
  const action = allow ? 'allow-once' : (level === 'block' || forceBlock) && canBlock ? 'block' : 'warn'
  const v: LeanGateViolation = { at: await $.clock.now(), rule, action, detail: detail.slice(0, 200) }
  await update($, band, b => ({ ...sane(b), violations: [...sane(b).violations, v].slice(-50) }))
  const row = [new Date(v.at).toISOString(), base(await $.session.cwd()), rule, action, detail].map(s => s.replace(/[\t\r\n]+/g, ' ')).join('\t')
  await logRow($, mem, row)
  if (action === 'block') return message
  if (action === 'allow-once') return undefined
  if (!mem.warned.has(rule)) {
    mem.warned.add(rule)
    $.ui.toast(`lean-gate: ${rule}: ${cut(detail, 60)}`)
  }
  return undefined
}

// Before the tool runs: returns a deny text, or undefined to let it through.
async function gate($: EngineInterface, mem: Mem, e: ToolCallInput): Promise<string | undefined> {
  const tool = String(e.tool)
  const isLead = e.agentId === undefined

  // Counters first and synchronously: nothing awaited yet, so parallel calls each get their own count.
  let before = 0
  if (isLead) {
    if (tool === 'Edit' || tool === 'Write') mem.run = 0
    else if (DELEGATE.has(tool)) {
      before = mem.run
      mem.run++
      mem.lead++
    }
    if (tool !== 'Agent') void patch($, { run: mem.run, lead: mem.lead, sub: mem.sub }).catch(() => undefined)
  }

  // Skills loaded stay true for the whole session.
  const rec = e as unknown as Record<string, unknown>
  if (isLead && tool === 'Skill') {
    const name = String(rec.skill ?? '')
    if (isLeanSkill(name)) mem.leanLoaded = true
    if (isWpSkill(name)) mem.wpSkill = true
  }

  if (readsDocs(tool, rec)) mem.docsRead = true
  if (isLead && tool === 'Agent') mem.agents++

  const cfg = await loadConfig($)

  if (hasEmDash(tool, rec)) {
    const deny = await trip($, mem, cfg, 'no-em-dashes', `em dash in ${tool === 'Bash' ? 'a commit message' : base(String(rec.file_path ?? tool))}`, 'lean-gate: no em dashes; use a colon, a comma or parentheses')
    if (deny !== undefined) return deny
  }

  // A new session must be findable later: its title starts with the date and time. A card the user accepts (proposal_id) keeps its own title.
  if ((tool === 'mcp__ccd_session__start_session' || tool === 'mcp__ccd_session__hand_off_to_session') && rec.proposal_id === undefined && !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} \S/.test(String(rec.title ?? ''))) {
    const deny = await trip($, mem, cfg, 'distinctive-session-names', 'sub-session title lacks a date and time', 'lean-gate: name the session distinctively: start the title with the date and time (YYYY-MM-DD HH:MM), then what it is about')
    if (deny !== undefined) return deny
  }

  if (isLead && (tool === 'Edit' || tool === 'Write')) {
    const path = norm(String(rec.file_path ?? ''))
    if (CODE_EDITED.test(path) && !mem.leanLoaded) {
      const deny = await trip($, mem, cfg, 'lean-project-first', `code edit before the lean-project skill: ${base(path)}`, 'lean-gate: load the lean-project skill before editing code')
      if (deny !== undefined) return deny
    }
    if (CODE_EDITED.test(path) && effective(cfg, 'ponytail-active') !== 'off' && ((await readText($, `${await claudeDir($)}/.ponytail-active`))?.trim() ?? 'off') === 'off') {
      const deny = await trip($, mem, cfg, 'ponytail-active', `ponytail is off: ${base(path)}`, 'lean-gate: turn ponytail on (/ponytail full) before editing code')
      if (deny !== undefined) return deny
    }
    if (!mem.wpSkill && isWpCode(path, callText(tool, rec))) {
      const deny = await trip($, mem, cfg, 'wp-skills-for-wp-code', `WordPress code edited with no wp-* skill: ${base(path)}`, 'lean-gate: load the matching wp-* skills before editing WordPress code')
      if (deny !== undefined) return deny
    }
    if (!mem.docsRead && !mem.wpSkill && isBuilderCode(path, callText(tool, rec))) {
      const deny = await trip($, mem, cfg, 'docs-before-builder', `builder or WordPress code edited before reading its docs: ${base(path)}`, 'lean-gate: read the official docs for the part you are changing first (only that part), and note the page')
      if (deny !== undefined) return deny
    }
  }

  for (const r of cfg.custom) {
    if (!customHit(r, tool, rec)) continue
    const deny = await trip($, mem, cfg, r.id, r.message || `matched ${r.match}`, `lean-gate: ${r.message || `custom rule ${r.id}`}`)
    if (deny !== undefined) return deny
  }

  if (e.tool === 'Agent') {
    if (isLead && cfg.max_agents > 0 && mem.agents > cfg.max_agents) {
      const deny = await trip($, mem, cfg, 'max-agents', `${mem.agents} subagents this turn, the limit is ${cfg.max_agents}`, `lean-gate: at most ${cfg.max_agents} subagents per turn for this project; fold the work into fewer agents`)
      if (deny !== undefined) return deny
    }
    if (isLead) {
      // Count and check in one step, with nothing awaited between, so parallel agents are each counted.
      const hit = sectionsFor(cfg.routing, rec)
      for (const k of hit) mem.agentsBy[k] = (mem.agentsBy[k] ?? 0) + 1
      mem.counted.set(e.tool_use_id, hit)
      const over = hit.find(k => cfg.agent_caps[k] > 0 && (mem.agentsBy[k] ?? 0) > cfg.agent_caps[k])
      if (over !== undefined) {
        const deny = await trip($, mem, cfg, 'max-agents', `${mem.agentsBy[over]} ${cfg.routing[over]} agents this turn, the limit is ${cfg.agent_caps[over]}`, `lean-gate: at most ${cfg.agent_caps[over]} ${cfg.routing[over]} agents per turn; fold the work into fewer agents`)
        if (deny !== undefined) return deny
      }
    }
    if (reviewUnscoped(rec)) {
      const deny = await trip($, mem, cfg, 'review-edited-files-only', cut(String(rec.description ?? 'review agent'), 60), 'lean-gate: scope the review to the edited files (list them or run lean-project review-scope)')
      if (deny !== undefined) return deny
    }
    const msg = {
      'agent-needs-model-effort': `lean-gate: set model and effort on every subagent (routing: ${ROUTING_KEYS.map(k => `${k}=${cfg.routing[k]}`).join(', ')})`,
      'no-haiku-coding': 'lean-gate: never use Haiku for coding, pick sonnet or opus',
    } as const
    for (const p of agentProblems(e, cfg.routing)) {
      const deny = await trip($, mem, cfg, p.rule, p.detail, msg[p.rule as keyof typeof msg])
      if (deny !== undefined) return deny
    }
  }

  if (e.tool === 'Bash') {
    if (effective(cfg, 'no-demo-files-public') !== 'off' && isGitPush(e.command)) {
      const files = await publicDemoFiles($, norm(await $.session.cwd()), cfg.demo_pattern)
      if (files.length > 0) {
        const deny = await trip($, mem, cfg, 'no-demo-files-public', `public repo would get: ${cut(files.join(', '), 100)}`, 'lean-gate: this push sends demo or scratch files to a public repo; keep it to changelog, readme and descriptions')
        if (deny !== undefined) return deny
      }
    }
    if (cfg.pr_repos.length > 0 && isGitPush(e.command)) {
      const cwd = norm(await $.session.cwd())
      const [top, branch] = await Promise.all([git($, cwd, TOOL_MS, ['rev-parse', '--show-toplevel']), git($, cwd, TOOL_MS, ['rev-parse', '--abbrev-ref', 'HEAD'])])
      const name = base(top?.stdout.trim() ?? '')
      if (cfg.pr_repos.includes(name) && /^(main|master)$/.test(branch?.stdout.trim() ?? '')) {
        const deny = await trip($, mem, cfg, 'one-pr-per-fix', `push to ${branch?.stdout.trim()} in ${name}`, `lean-gate: ${name} takes pull requests only: push a branch and open one PR per fix, merge after the owner's go-ahead`)
        if (deny !== undefined) return deny
      }
    }
    const oc = opencodeProblem(e.command)
    if (oc !== undefined) {
      const deny = await trip($, mem, cfg, 'free-opencode-only', oc, 'lean-gate: OpenCode runs must name a free model (the name ends in -free)')
      if (deny !== undefined) return deny
    }
    const relAny = releaseAction(e.command, await $.session.cwd(), (await home($)) ?? '')
    if (relAny !== undefined && effective(cfg, 'changelog-before-tag') !== 'off' && !relAny.what.startsWith('git push') && (await changelogUnchanged($, relAny.dir))) {
      const deny = await trip($, mem, cfg, 'changelog-before-tag', `${relAny.what} with no changelog or readme change since the last tag`, 'lean-gate: write the changelog (and readme if behaviour changed) before tagging')
      if (deny !== undefined) return deny
    }
    const rel = effective(cfg, 'release-needs-review') === 'off' ? undefined : relAny
    if (rel !== undefined) {
      const state = await reviewState($, rel.dir, TOOL_MS)
      // Warn mode allows an unknown repo and logs it; block mode asks for an explicit directory. Git not answering always fails open.
      if (state === 'unknown') {
        const deny = await trip($, mem, cfg, 'release-needs-review', `repo unknown: ${cut(rel.dir, 60)} (${rel.what})`, 'lean-gate: release action with unknown repo: use `git -C <dir> ...` or `cd <dir> &&` in the same command')
        if (deny !== undefined) return deny
      } else if (state === 'silent') await trip($, mem, cfg, 'release-needs-review', `git did not answer for ${cut(rel.dir, 60)} (${rel.what})`, '', false)
      else if (state === 'due') {
        const deny = await trip($, mem, cfg, 'release-needs-review', `${rel.what} in ${cut(rel.dir, 50)}`, 'lean-gate: review the changed code first (press Reviewed in the band after lean-project review-scope), then release')
        if (deny !== undefined) return deny
      }
    }
  }

  if (isLead && (e.tool === 'Edit' || e.tool === 'Write' || e.tool === 'Agent') && !mem.routed) {
    mem.routed = true
    if (effective(cfg, 'routing-line') !== 'off' && (await lacksRoutingLine($, e.tool_use_id).catch(() => false))) {
      await patch($, { noRoute: true })
      await trip($, mem, cfg, 'routing-line', `no "routing:" line before the first ${tool}`, '', false)
    }
  }

  if (isLead && DELEGATE.has(tool)) {
    const limit = cfg.delegate_after_lead_calls
    if (before >= limit && effective(cfg, 'delegate-more') === 'block') {
      const deny = await trip($, mem, cfg, 'delegate-more', `${before} reads since the last prompt, edit or agent call`, `lean-gate: delegate bulk reading to a subagent (${cfg.routing.read}), then continue`)
      if (deny !== undefined) return deny
    } else if (before + 1 === limit) await trip($, mem, cfg, 'delegate-more', `${limit} reads in a row, consider a subagent`, '', false)
  }

  if (isLead && tool === 'Agent') {
    mem.sub++
    mem.run = 0
    void patch($, { run: 0, sub: mem.sub }).catch(() => undefined)
  }
  return undefined
}

// After the tool ran: what the turn-end rules and the band need to know.
async function after($: EngineInterface, mem: Mem, e: ToolCallInput, ran: { deny?: string; isError?: true }) {
  if (ran.deny !== undefined) return
  if (e.tool === 'Bash' && !ran.isError) {
    const rel = releaseAction(e.command, await $.session.cwd(), (await home($)) ?? '')
    if (rel?.what.startsWith('git tag')) mem.tagged = true
    // Only a push that sends tags publishes the release; a plain push leaves the tag local.
    if (rel?.what === 'git push of tags') mem.pushed = true
  }
  if (e.tool === 'Bash' && isTestCommand(e.command)) {
    mem.tested = true
    await patch($, { tests: ran.isError ? 'fail' : 'pass' })
  }
  if (e.tool === 'Bash' && isPhpcsCommand(e.command)) mem.phpcs = true
  if ((e.tool === 'Edit' || e.tool === 'Write') && !ran.isError) {
    const path = norm(e.file_path)
    const now = await $.clock.now()
    if (isStateFile(path, (await loadConfig($)).state_file)) {
      mem.stateTouched = true
      await patch($, { stateAt: now })
    } else if (CODE_EDITED.test(path)) {
      mem.edited.add(path)
      if (/.php$/i.test(path)) mem.php++
      await patch($, { codeAt: now })
    }
  }
}

export const register: Register = on => {
  const mem: Mem = { edited: new Set(), stateTouched: false, tested: false, phpcs: false, php: 0, routed: false, warned: new Set(), leanLoaded: false, wpSkill: false, draft: { preset: 0, level: 'warn' }, docsRead: false, agents: 0, agentsBy: {}, counted: new Map(), tagged: false, pushed: false, once: new Map(), run: 0, lead: 0, sub: 0, chain: Promise.resolve() }
  const resetTurn = () => {
    mem.edited.clear()
    mem.stateTouched = false
    mem.tested = false
    mem.phpcs = false
    mem.php = 0
    mem.routed = false
    mem.tagged = false
    mem.pushed = false
    mem.warned.clear()
  }

  on('tool.call', async ($, e, next) => {
    let deny: string | undefined
    try {
      deny = await gate($, mem, e)
    } catch {
      // A rule's own failure never breaks the call.
    }
    if (deny !== undefined) {
      // A denied subagent never ran, so it does not count toward max_agents.
      if (e.tool === 'Agent' && e.agentId === undefined) {
        mem.agents = Math.max(0, mem.agents - 1)
        for (const k of mem.counted.get(e.tool_use_id) ?? []) mem.agentsBy[k] = Math.max(0, (mem.agentsBy[k] ?? 0) - 1)
      }
      mem.counted.delete(e.tool_use_id)
      return { deny }
    }
    const ran = await next(e)
    await after($, mem, e, ran).catch(() => undefined)
    return ran
  }).catch(($, e, next) => next(e))

  on('prompt.submit', async ($, e, next) => {
    mem.run = 0
    mem.agents = 0
    mem.agentsBy = {}
    mem.counted.clear()
    await patch($, { run: 0, noRoute: false }).catch(() => undefined)
    void (async () => {
      const hit = projectMentioned(await loadRegistry($), String((e as { text?: unknown }).text ?? ''), norm(await $.session.cwd()))
      await patch($, { projHit: hit === undefined ? null : { name: hit.name, path: hit.path } })
    })().catch(() => undefined)
    return next(e)
  }).catch(($, e, next) => next(e))

  // The rules run after the turn has completed for everyone else, never in front of it.
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId === undefined) {
      // The turn's facts are taken now; the checks and the git work run after this hook has answered.
      const n = mem.edited.size
      const stateTouched = mem.stateTouched
      const tested = mem.tested
      const phpUnchecked = mem.php > 0 && !mem.phpcs
      const unpushed = mem.tagged && !mem.pushed
      resetTurn()
      void (async () => {
        const cfg = await loadConfig($)
        if (unpushed) await trip($, mem, cfg, 'push-after-tag', 'a tag was made this turn and nothing was pushed', '', false)
        if (n > 0 && !stateTouched) await trip($, mem, cfg, 'state-file-fresh', `${n} code file(s) edited, no state file touched`, '', false)
        if (n > 0 && !tested) await trip($, mem, cfg, 'tests-before-done', `${n} code file(s) edited, no test command ran`, '', false)
        if (phpUnchecked) await trip($, mem, cfg, 'phpcs-before-done', 'PHP files edited, PHPCS did not run', '', false)
        await refreshRelease($)
      })().catch(() => undefined)
    }
    return result
  }).catch(($, e, next) => next(e))

  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      mem.run = mem.lead = mem.sub = 0
      mem.leanLoaded = mem.wpSkill = mem.docsRead = false
      mem.once.clear()
      await patch($, { lead: 0, sub: 0, run: 0, violations: [] }).catch(() => undefined)
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await $.command.register({ name: 'lean-gate', description: 'Open the lean-gate panel' }).catch(() => undefined)
    void $.ui.open({ id: PANE, title: 'lean-gate' }).catch(() => undefined)
    // Log housekeeping and git work run after the session has started, not in front of it.
    void (async () => {
      await trimLog($, mem)
      await refreshRelease($)
      // The panel can open with its details already showing, so these are read now, not only when Details is pressed.
      await readMemory($)
      await readBoard($)
      await readLessons($)
      await readTools($)
      await detectProject($)
    })().catch(() => undefined)
    return result
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'lean-gate' }, async $ => {
    const r = await $.ui.open({ id: PANE, title: 'lean-gate' })
    return { text: r.isPlaced ? 'lean-gate panel opened' : `lean-gate panel not shown: ${r.reason}` }
  })

  on('prompt.compose', async ($, e, next) => {
    const result = await next(e)
    const { route } = await load($)
    const { workflow, auto_memory, auto_lessons, mode, routing, agent_caps } = await loadConfig($)
    const sections = [...result.sections]
    if (mode !== 'off') {
      const table = ROUTING_KEYS.map(k => `${k} ${routing[k]}${agent_caps[k] ? ` (max ${agent_caps[k]} agents)` : ''}`).join('; ')
      sections.push({ id: 'lean-gate:precedence', text: `lean-gate is on (${mode}) and takes precedence over lean-project: where ROUTING.md, BUILD.md or any lean-project guide names a model, effort or agent count, use the lean-gate routing instead: ${table}. lean-project only fills gaps lean-gate does not cover. Every Agent call needs model and effort; a rule that blocks is a stop, not a suggestion.`, scope: 'session' as const })
    }
    if (auto_memory) sections.push({ id: 'lean-gate:auto-memory', text: 'Project memory is automatic: when you decide something, finish a milestone or learn a fact the next session needs, record it yourself with lean-project memory add "<one line>" --tag decision|state|link|note. One line each, no progress chatter.', scope: 'session' as const })
    if (auto_lessons) sections.push({ id: 'lean-gate:auto-lessons', text: 'Lessons are automatic: when the person corrects you, or you repeat a mistake, record it yourself with lean-project lesson "<what to do differently>". The second sighting of the same text becomes a local rule.', scope: 'session' as const })
    if (workflow !== '') sections.push({ id: 'lean-gate:workflow', text: `Workflow for this project: ${workflow}`, scope: 'session' as const })
    if (route !== 'main') sections.push({ id: 'lean-gate:route', text: `Routing for this task: ${routeText(route)}`, scope: 'session' as const })
    return sections.length === result.sections.length ? result : { sections }
  }).catch(($, e, next) => next(e))

  // While the panel is closed, a one-button row above the prompt reopens it (the app has no toolbar slot for a mod).
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const open = (await $.ui.panes().catch(() => [])).some(p => p.id === PANE)
    if (open) return next(e)
    // Other mods share this slot: draw theirs below ours. next(e) rejects only when nothing answers beneath (the test harness).
    const below = await next(e).catch(() => undefined)
    const { Box, Button } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        <Button key="open-panel" plain label="Open lean-gate panel" onPress={() => void $.ui.open({ id: PANE, title: 'lean-gate' }).then(() => $.ui.invalidate('ui.render')).catch(() => undefined)} />
        {below}
      </Box>
    )
  }).catch(($, e, next) => next(e))

  on('ui.close', async ($, e, next) => {
    const result = await next(e)
    if (e.id === PANE) $.ui.invalidate('ui.render')
    return result
  }).catch(($, e, next) => next(e))

  // The band lives in a pane the surface docks beside the transcript, not above the prompt.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const b = await load($)
    const cfg = await loadConfig($)
    const now = await $.clock.now()
    const tokens = (await $.session.usage().catch(() => undefined))?.context.tokens
    const { Box, Text, Button } = $.ui.resolve(e)
    // A labelled rule above our band, with a blank line before it, keeps it visibly apart from ponytail's.
    const stack = (mine: RenderChildren) => <Box flexDirection="column">{mine}</Box>

    // Buttons that need a prompt submit it as the person's own words, else toast it.
    const ask = (text: string, hint = text) => () => void $.prompt.submit({ text, asUser: true }).catch(() => $.ui.toast(hint))
    const newSession = ask('Update the state file with where we are, then tell me to start a fresh session.', 'Ask Claude: update state file, then start a fresh session')
    const updateState = ask('Update the project state file (HANDOFF or STATE) with the current progress.', 'Ask Claude: update the state file')
    const runTests = ask("Run the project's tests and report the result.", 'Ask Claude: run the tests')
    const here = async () => norm(await $.session.cwd())
    const toggle = async () => {
      const opening = !b.details
      await patch($, { details: opening })
      if (opening) {
        await patch($, { packs: cut(((await shell($, await here(), 'lean-project pack status'))?.stdout ?? '').trim().split('\n').slice(0, 2).join(' | '), 100) })
        await patch($, { dueRepos: await dueChildren($, await here()) })
        await readMemory($)
        await readBoard($)
        await readLessons($)
        await readTools($)
      }
    }
    const review = async () => {
      const r = await shell($, await here(), 'lean-project review-scope')
      $.ui.toast(r === undefined ? 'lean-project not found' : (r.stdout || r.stderr).trim().split('\n').slice(0, 2).join('\n') || 'review-scope printed nothing')
    }
    const reviewed = async () => {
      $.ui.toast(await markReviewed($, await here()))
      await refreshRelease($)
    }
    const reviewChild = async (name: string) => {
      const cwd = await here()
      $.ui.toast((await markRepo($, `${cwd}/${name}`)) === undefined ? `lean-gate: ${name} is not a repo` : `Marked reviewed: ${name}`)
      await patch($, { dueRepos: await dueChildren($, cwd) })
    }
    const setPack = async (name: string, state: string) => {
      const r = await shell($, await here(), `lean-project pack ${state} ${name}`)
      $.ui.toast(`${name} ${state}: takes effect next session${r?.exitCode ? ` (${cut((r.stderr || r.stdout).trim(), 60)})` : ''}`)
    }
    const [rModel = 'main', rEffort = 'medium'] = b.route.split(':')
    const setRoute = (m: string, ef: string) => patch($, { route: m === 'main' || m === 'free' ? m : `${m}:${ef}` })
    const cycleRouteModel = () => setRoute(ROUTE_MODELS[(ROUTE_MODELS.indexOf(rModel) + 1) % ROUTE_MODELS.length] ?? 'main', rEffort)
    const cycleRouteEffort = () => setRoute(rModel, EFFORT_LIST[(EFFORT_LIST.indexOf(rEffort) + 1) % EFFORT_LIST.length] ?? 'medium')

    const levelColor = { off: 'inactive', warn: 'warning', block: 'success' } as const
    const stateAge = now - b.stateAt
    const stale = b.codeAt > b.stateAt || (b.stateAt > 0 && stateAge > 3600000)
    const ctxPct = tokens === undefined ? 0 : tokens / cfg.context_limit
    const gb = (key: string, label: string, onPress: () => unknown) => <Button key={key} plain label={label} onPress={() => void onPress()} />
    const dot = <Text dimColor>·</Text>
    // flexShrink 0: a cell wraps as a whole to the next line, never mid-label.
    // The dot trails its cell, so a wrapped line never starts with one.
    const join = (parts: RenderChildren[]) => parts.map((p, i) => <Box key={`cell-${i}`} flexShrink={0} gap={1}>{p}{i < parts.length - 1 ? dot : null}</Box>)

    // A Button here takes a label only: Text beside a string inside one is refused by this build.
    const parts: RenderChildren[] = [
      <Box flexDirection="row" gap={1}>
        <Text color={levelColor[cfg.mode]}>●</Text>
        <Button key="mode" plain label={cfg.mode} onPress={() => void editGlobal($, mem, j => (j.mode = nextLevel(cfg.mode)))} />
      </Box>,
      <Button key="route" plain label={`route ${rModel}`} onPress={cycleRouteModel} />,
    ]
    if (b.proj === '') parts.push(<Button key="setup" plain label="Set up project" onPress={() => void (b.projNew ? adoptProject() : startProject())} />)
    if (rModel !== 'main' && rModel !== 'free') parts.push(<Button key="route-effort" plain label={rEffort} onPress={cycleRouteEffort} />)
    if (b.noRoute) parts.push(<Text color="warning">no route</Text>)
    parts.push(
      <Text color={b.run >= cfg.delegate_after_lead_calls ? 'warning' : undefined}>
        lead {b.lead} / sub {b.sub}
      </Text>
    )
    if (tokens !== undefined) {
      parts.push(<Text color={ctxPct >= 1 ? 'error' : ctxPct >= 0.8 ? 'warning' : undefined}>{kilo(tokens)}/{kilo(cfg.context_limit)}</Text>)
      if (ctxPct >= 0.8) parts.push(gb('new', 'New session', newSession))
    }
    parts.push(
      b.stateAt === 0 && b.codeAt === 0 ? (
        <Text dimColor>state -</Text>
      ) : (
        <Text color={stale ? 'warning' : 'success'}>{stale ? '⚠ stale' : `✓ ${age(stateAge)}`}</Text>
      )
    )
    if (stale) parts.push(gb('state', 'Update state', updateState))
    parts.push(
      <Text color={b.tests === 'pass' ? 'success' : b.tests === 'fail' ? 'error' : undefined} dimColor={b.tests === 'none'}>
        tests {b.tests}
      </Text>
    )
    if (b.tests !== 'pass') parts.push(gb('tests', 'Run tests', runTests))
    if (b.release === 'due') parts.push(<Text color="warning">review due</Text>, gb('review', 'Review', review), gb('reviewed', 'Reviewed', reviewed))
    else if (b.release === 'ok') parts.push(<Text color="success">reviewed</Text>)
    parts.push(<Text color={b.violations.length > 0 ? 'warning' : undefined} dimColor={b.violations.length === 0}>⚠ {b.violations.length}</Text>)
    parts.push(gb('details', b.details ? 'Compact' : 'Details', toggle))

    const compact = (
      <Box flexDirection="row" alignItems="center" gap={1} flexWrap="wrap" width={e.props.bodyColumns}>
        {join(parts)}
      </Box>
    )
    if (!b.details) return stack(compact)

    const level = (rule: string) => cfg.rules[rule] ?? 'off'
    // A title that folds its body shut or open; the folded ids are kept in the band state.
    const flip = (id: string) => update($, band, x => { const s = sane(x); return { ...s, shut: s.shut.includes(id) ? s.shut.filter(n => n !== id) : [...s.shut, id] } })
    const fold = (id: string, title: string, body: RenderChildren[]) => (
      <Box key={id} flexDirection="column">
        {gb(`sec-${id}`, `${b.shut.includes(id) ? '▸' : '▾'} ${title}`, () => flip(id))}
        {!b.shut.includes(id) && <Box flexDirection="column" paddingLeft={2}>{body}</Box>}
      </Box>
    )
    // One rule per row: the level button, then the name over a dim one-line meaning. Rules sit in groups, each under a title.
    const ruleRow = (rule: string, info: string) => (
      <Box key={`row-${rule}`} flexDirection="row" gap={1}>
        <Box width={7}>
          <Button key={`rule-${rule}`} plain label={level(rule)} onPress={() => void editGlobal($, mem, j => (j.rules = { ...(j.rules as object), [rule]: nextLevel(level(rule)) }))} />
        </Box>
        <Box flexDirection="column" flexShrink={1}>
          <Text>{rule}</Text>
          <Text dimColor>{info}</Text>
        </Box>
      </Box>
    )
    const grouped = new Set(RULE_GROUPS.flatMap(([, rules]) => rules))
    const groups: [string, RenderChildren[]][] = RULE_GROUPS.map(([title, rules]) => [title, rules.map(r => ruleRow(r, RULE_INFO[r] ?? ''))])
    const loose = RULES.filter(r => !grouped.has(r))
    if (loose.length > 0) groups.push(['Other', loose.map(r => ruleRow(r, ''))])
    if (cfg.custom.length > 0) groups.push(['Your rules', cfg.custom.map(r => ruleRow(r.id, r.message))])
    const ruleRows = groups.map(([title, rows], i) => (
      <Box key={`group-${title}`} flexDirection="column" marginTop={i === 0 ? 0 : 1}>{fold(`rules:${title}`, `${title} (${rows.length})`, rows)}</Box>
    ))
    const recent = b.violations.slice(-5).reverse()

    // Rule builder: pick a ready-made pattern and a level, then Add. The draft lives in module memory, so a press only redraws.
    const preset = PRESETS[mem.draft.preset] ?? PRESETS[0]
    const redraw = () => $.ui.invalidate('ui.render')
    const customList = (j: Record<string, unknown>) => (Array.isArray(j.custom_rules) ? (j.custom_rules as { id?: unknown }[]) : [])
    // Read the draft at press time: the band may not have redrawn since the last cycle.
    const addRule = () =>
      editGlobal($, mem, j => {
        const p = PRESETS[mem.draft.preset] ?? PRESETS[0]
        const list = customList(j)
        let id = `custom-${p.id}`
        for (let n = 2; list.some(r => r.id === id); n++) id = `custom-${p.id}-${n}`
        j.custom_rules = [...list, { id, tool: p.tool, match: p.match, message: p.message, level: mem.draft.level }]
      })
    const removeRule = (id: string) =>
      editGlobal($, mem, j => {
        j.custom_rules = customList(j).filter(r => r.id !== id)
        const { [id]: _gone, ...rest } = (j.rules ?? {}) as Record<string, unknown>
        j.rules = rest
      })
    const askRule = ask('Add a custom rule to the custom_rules list in ~/.claude/lean-project.json (fields: id, tool such as Bash or Edit|Write, match as a regex over the command or new file text, message, level warn or block). Ask me what it should catch first.', 'Ask Claude: write a custom lean-gate rule')

    // Project memory: the CLI keeps the notes; the band shows the index line and runs the small actions, then re-reads it.
    const memShell = async (command: string) => {
      const r = await shell($, await here(), command)
      $.ui.toast(cut((r?.stdout || r?.stderr || 'lean-project not found').trim().split('\n')[0] ?? '', 100))
      await readMemory($)
    }
    // Project buttons: the registry is a file in ~/.claude; start, adopt and the walk test are asks that follow STRUCTURE.md.
    const registerHere = async () => {
      const dir = await here()
      await editRegistry($, mem, list => (projectAt(list, dir) ? list : [...list, { name: base(dir), path: dir, aliases: [] }]))
      await detectProject($)
    }
    const unregisterHere = async () => {
      const dir = await here()
      await editRegistry($, mem, list => list.filter(p => p.path.toLowerCase() !== projectAt(list, dir)?.path.toLowerCase()))
      await detectProject($)
    }
    const startProject = ask('Start a new project in this folder: follow STRUCTURE.md in the lean-project skill (the setup cards, then the stage scaffold with AGENTS.md as the entry). Ask me what it is for first.', 'Ask Claude: start a project')
    const adoptProject = ask('Adopt this folder as a hub project: audit it, show me a migration map and wait for my approval before changing anything (STRUCTURE.md, adopting). Keep my existing CLAUDE.md and state file.', 'Ask Claude: adopt this folder')
    const walkTest = ask('Run the walk test on this project (STRUCTURE.md): from the files alone, orient, say what the next step is and report the status. List anything you could not find.', 'Ask Claude: walk test')
    const attachHit = ask(`Read the entry file (AGENTS.md, else CLAUDE.md) and the state file of ${b.projHit?.name ?? 'the project'} at ${b.projHit?.path ?? ''}, and use them for this chat. Do not edit anything there.`, 'Ask Claude: read that project')
    const switchHit = ask(`Change this session\x27s working directory to ${b.projHit?.path ?? ''} with the change_directory tool, then read its entry file and state file.`, 'Ask Claude: switch folder')
    // Ponytail, the performance audit and PHPCS: each button runs the matching lean-project command and toasts its first line.
    const PT_MODES = ['off', 'lite', 'full', 'ultra']
    const stepPonytail = async () => {
      const cur = ((await readText($, `${await claudeDir($)}/.ponytail-active`)) ?? 'off').trim()
      await $.fs.write(`${await claudeDir($)}/.ponytail-active`, PT_MODES[(PT_MODES.indexOf(cur) + 1) % PT_MODES.length] ?? 'off')
      await readTools($)
    }
    const runTool = (label: string, command: string, andThen?: () => Promise<void>) => async () => {
      const r = await shell($, await here(), command)
      const text = (r?.stdout || r?.stderr || '').trim().split(/\r?\n/).filter(l => l.trim() !== '')
      $.ui.toast(`${label}: ${cut(text[text.length - 1] ?? (r?.exitCode ? 'failed' : 'done'), 80)}`)
      if (andThen) await andThen()
    }
    const PHPCS_STANDARDS = ['WordPress', 'WordPress-Extra', 'WordPress-Core', 'WordPress-Docs']
    const stepStandard = () => editGlobal($, mem, j => {
      const cur = typeof j.phpcs_standard === 'string' ? j.phpcs_standard : 'WordPress'
      j.phpcs_standard = PHPCS_STANDARDS[(PHPCS_STANDARDS.indexOf(cur) + 1) % PHPCS_STANDARDS.length]
    })
    const toggleHelper = (key: (typeof HELPERS)[number]) => editGlobal($, mem, j => {
        const stored = (j.helpers as Record<string, unknown> | undefined)?.[key]
        j.helpers = { ...(j.helpers as object), [key]: stored === false }
      })
    const toggleAuto = (key: 'auto_memory' | 'auto_lessons') => editGlobal($, mem, j => (j[key] = j[key] !== true))
    const askBoard = ask('Run lean-project board and tell me in a few lines which cards are blocked or waiting on another card, and what each needs.', 'Ask Claude: check the board')
    const addLesson = ask('Record a lesson with lean-project lesson "<what to do differently>" for what went wrong or was corrected in this session. Ask me what it should say first.', 'Ask Claude: record a lesson')
    const reviewLessons = ask('Run lean-project lessons review, then rewrite each old lesson into a rule (record it again) or drop it with lean-project lessons drop.', 'Ask Claude: review old lessons')
    const remember = ask('Add a project memory note for what we decided or did in this session: lean-project memory add "<one line>" --tag decision|state|link|note.', 'Ask Claude: add a project memory note')
    const recall = ask('Run lean-project memory recall and tell me in a few lines where this project stands.', 'Ask Claude: recall project memory')
    const forgetLast = () => memShell(String.raw`n=$(lean-project memory list | tail -n 1 | cut -d" " -f1); case "$n" in ''|*[!0-9]*) echo "memory: nothing to forget" ;; *) lean-project memory forget "$n" ;; esac`)

    // Model routing and the workflow limits: each button steps through a short list and writes the global config.
    const cycle = <T,>(list: readonly T[], cur: T): T => list[(list.indexOf(cur) + 1) % list.length] as T
    // Steps one part of a section's model:effort from the value in the file, so two quick presses build on each other.
    const stepRouting = (key: RoutingKey, part: 'model' | 'effort') =>
      editGlobal($, mem, j => {
        const stored = (j.routing as Record<string, unknown> | undefined)?.[key]
        const [m = 'sonnet', ef = 'medium'] = (typeof stored === 'string' ? stored : cfg.routing[key]).split(':')
        // Haiku is left out of the coding sections: it never writes code.
        const choices = CODING_SECTIONS.includes(key) ? MODEL_NAMES.filter(n => n !== 'haiku') : MODEL_NAMES
        const next = part === 'model' ? cycle(choices, m) : m
        const value = next === 'free' ? 'free' : `${next}:${part === 'effort' ? cycle(EFFORTS, ef) : ef || 'medium'}`
        j.routing = { ...(j.routing as object), [key]: value }
      })
    const setMaxAgents = (n: number) => editGlobal($, mem, j => (j.max_agents = n))
    const setCap = (key: string, n: number) => editGlobal($, mem, j => (j.agent_caps = { ...(j.agent_caps as object), [key]: n }))
    const setNum = (key: string, n: number) => editGlobal($, mem, j => (j[key] = n))
    const editWorkflow = ask('Set the "workflow" text in ~/.claude/lean-project.json (or this project\'s .lean-project.json): a few short lines saying where each kind of work happens, how many agents and at what effort, and the order of steps. Ask me what it should say first.', 'Ask Claude: write the workflow text')
    const lastHit = recent[0]
    const onceRule = lastHit === undefined ? undefined : lastHit.rule
    const setOnce = (kind: 'allow' | 'block') => {
      if (onceRule === undefined) return
      if (kind === 'block' && WARN_ONLY.has(onceRule)) return $.ui.toast(`lean-gate: ${onceRule} can only warn, so Block once does nothing`)
      mem.once.set(onceRule, kind)
      $.ui.toast(`lean-gate: the next ${onceRule} hit is ${kind === 'allow' ? 'allowed' : 'blocked'} once`)
    }

    // A plain Button pads its label by one column, so text lines get the same pad to line up with the buttons.
    const note = (child: RenderChildren) => <Box paddingLeft={1}>{child}</Box>
    const section = (id: string, title: string, ...body: RenderChildren[]) => <Box key={id} flexDirection="column" marginTop={1}>{fold(id, title, body)}</Box>

    return stack(
      <Box flexDirection="column" width={e.props.bodyColumns}>
        {compact}
        {section(
          'project', 'Project',
          note(<Text dimColor wrap="truncate-end">{b.proj ? `registered: ${b.proj}` : b.projNew ? 'a project folder that is not registered' : 'no project detected in this folder'}</Text>),
          <Box flexDirection="row" gap={1} flexWrap="wrap">
            {b.proj === '' ? gb('proj-add', 'Register this folder', registerHere) : gb('proj-remove', 'Unregister', unregisterHere)}
            {gb('proj-start', 'Start project', startProject)}
            {gb('proj-adopt', 'Adopt this folder', adoptProject)}
            {gb('proj-walk', 'Walk test', walkTest)}
          </Box>,
          b.projHit !== null && note(<Text color="warning" wrap="truncate-end">you mentioned {b.projHit.name} ({b.projHit.path})</Text>),
          b.projHit !== null && (
            <Box flexDirection="row" gap={1} flexWrap="wrap">
              {gb('proj-attach', `Attach ${b.projHit.name}`, attachHit)}
              {gb('proj-switch', 'Switch folder', switchHit)}
              {gb('proj-ignore', 'Ignore', () => patch($, { projHit: null }))}
            </Box>
          )
        )}
        {section('rules', 'Rules', note(<Text dimColor>press a level to cycle off, warn, block</Text>), ...ruleRows)}
        {section(
          'builder', 'Rule builder',
          note(<Text dimColor>make your own rule: pick a ready-made pattern and a level, then Add rule. It appears under Your rules.</Text>),
          <Box flexDirection="row" gap={1} flexWrap="wrap">
            {gb('rb-pattern', `pattern: ${preset.label} (${preset.tool})`, () => { mem.draft.preset = (mem.draft.preset + 1) % PRESETS.length; redraw() })}
            {gb('rb-level', `level: ${mem.draft.level}`, () => { mem.draft.level = nextLevel(mem.draft.level); redraw() })}
            {gb('rb-add', 'Add rule', addRule)}
          </Box>,
          note(<Text dimColor wrap="truncate-end">{preset.match}</Text>),
          cfg.custom.length > 0 && (
            <Box flexDirection="row" gap={1} flexWrap="wrap">
              {cfg.custom.map(r => gb(`rb-del-${r.id}`, `Remove ${r.id}`, () => removeRule(r.id)))}
            </Box>
          ),
          gb('rb-ask', 'Ask Claude to write a custom rule', askRule)
        )}
        {section(
          'routing', 'Model routing',
          note(<Text dimColor>press a button to step through its choices</Text>),
          ...ROUTING_KEYS.map(k => {
            const [m = 'sonnet', ef = 'medium'] = cfg.routing[k].split(':')
            const cap = cfg.agent_caps[k]
            return fold(`rt:${k}`, ROUTING_LABEL[k], [
              <Box flexDirection="row" gap={1} flexWrap="wrap">
                {gb(`rt-${k}-model`, `model: ${m}`, () => stepRouting(k, 'model'))}
                {m !== 'free' && gb(`rt-${k}-effort`, `effort: ${ef}`, () => stepRouting(k, 'effort'))}
                {gb(`rt-${k}-cap`, `agents at once: ${cap === 0 ? 'no limit' : cap}`, () => setCap(k, cycle(SECTION_CAPS, cap)))}
              </Box>,
            ])
          }),
          note(<Text dimColor>Haiku is not offered for coding and is refused there. An agent counts toward every section with its model and effort. A project's own .lean-project.json overrides these.</Text>)
        )}
        {section(
          'workflow', 'Workflow and limits',
          note(<Text dimColor>agent and read limits, and a note added to every session's prompt (Edit workflow text asks Claude to write it)</Text>),
          <Box flexDirection="row" gap={1} flexWrap="wrap">
            {gb('wf-agents', `max agents per turn: ${cfg.max_agents === 0 ? 'no limit' : cfg.max_agents}`, () => setMaxAgents(cycle(AGENT_LIMITS, cfg.max_agents)))}
            {gb('wf-delegate', `delegate after ${cfg.delegate_after_lead_calls} reads`, () => setNum('delegate_after_lead_calls', cycle(DELEGATE_AFTER, cfg.delegate_after_lead_calls)))}
            {gb('wf-context', `context limit ${kilo(cfg.context_limit)}`, () => setNum('context_limit', cycle(CONTEXT_LIMITS, cfg.context_limit)))}
            {gb('wf-edit', 'Edit workflow text', editWorkflow)}
          </Box>,
          note(<Text dimColor wrap="truncate-end">{cfg.workflow === '' ? 'no workflow text set' : cfg.workflow}</Text>)
        )}
        {section(
          'helpers', 'Built-in helpers',
          note(<Text dimColor>small scripts that run on their own; each is one click</Text>),
          <Box flexDirection="row" gap={1} flexWrap="wrap">
            {HELPERS.map(k => gb(`hk-${k}`, `${HELPER_LABEL[k]}: ${cfg.helpers[k] ? 'on' : 'off'}`, () => toggleHelper(k)))}
          </Box>
        )}
        {section(
          'memory', 'Project memory',
          note(<Text dimColor wrap="truncate-end">{b.memory || 'no memory for this project yet'}</Text>),
          <Box flexDirection="row" gap={1} flexWrap="wrap">
            {gb('mem-remember', 'Remember', remember)}
            {gb('mem-recall', 'Recall', recall)}
            {gb('mem-forget', 'Forget last', forgetLast)}
            {gb('mem-auto', `automatic: ${cfg.auto_memory ? 'on' : 'off'}`, () => toggleAuto('auto_memory'))}
          </Box>,
          note(<Text dimColor>automatic: Claude records decisions and milestones by itself</Text>),
          b.memoryProjects.length > 0 && (
            <Box flexDirection="row" gap={1} flexWrap="wrap">
              <Text dimColor>link to</Text>
              {b.memoryProjects.map(n => gb(`mem-link-${n}`, n, () => memShell(`lean-project memory link ${n}`)))}
            </Box>
          )
        )}
        {section(
          'board', 'Board (how agents talk to each other)',
          ...(b.board.length === 0 ? [note(<Text dimColor>not read yet: press Refresh</Text>)] : b.board.map(l => note(<Text dimColor wrap="truncate-end">{l}</Text>))),
          <Box flexDirection="row" gap={1} flexWrap="wrap">
            {gb('board-refresh', 'Refresh', () => readBoard($))}
            {gb('board-ask', 'Ask Claude to check it', askBoard)}
          </Box>
        )}
        {section(
          'lessons', 'Lessons and local rules',
          ...(b.lessons.length === 0 ? [note(<Text dimColor>not read yet: press Refresh</Text>)] : b.lessons.map(l => note(<Text dimColor wrap="truncate-end">{l}</Text>))),
          <Box flexDirection="row" gap={1} flexWrap="wrap">
            {gb('les-refresh', 'Refresh', () => readLessons($))}
            {gb('les-add', 'Add lesson', addLesson)}
            {gb('les-review', 'Review old', reviewLessons)}
            {gb('les-auto', `automatic: ${cfg.auto_lessons ? 'on' : 'off'}`, () => toggleAuto('auto_lessons'))}
          </Box>,
          note(<Text dimColor>a lesson seen twice becomes a local rule; automatic: Claude records them itself</Text>)
        )}
        {section(
          'review', 'Review',
          note(<Text dimColor>Reviewed marks the current commit as reviewed, so release tags pass the release-needs-review rule</Text>),
          <Box flexDirection="row" gap={1} flexWrap="wrap">
            {b.release !== 'due' && gb('a-reviewed', 'Reviewed', reviewed)}
            {b.dueRepos.map(n => gb(`rv-${n}`, `Reviewed ${n}`, () => reviewChild(n)))}
          </Box>,
          b.release === 'due' && b.dueRepos.length === 0 && note(<Text dimColor>a review is due: use Review and Reviewed in the top row</Text>)
        )}
        {section(
          'ponytail', 'Ponytail',
          note(<Text dimColor wrap="truncate-end">{b.tools.find(l => l.startsWith('ponytail')) ?? 'ponytail: not read yet'}</Text>),
          <Box flexDirection="row" gap={1} flexWrap="wrap">
            {gb('pt-mode', `mode: ${b.ptMode || 'off'}`, stepPonytail)}
            {gb('hk-ponytail', `hooks: ${cfg.helpers.ponytail ? 'on' : 'off'}`, () => toggleHelper('ponytail'))}
            {gb('pt-update', 'Update', runTool('ponytail', 'lean-project vendor update ponytail', () => readTools($)))}
            {b.tools.some(l => l.startsWith('standalone')) && gb('pt-retire', 'Switch off standalone plugins', runTool('hub', 'lean-project vendor retire', () => readTools($)))}
          </Box>,
          note(<Text dimColor>mode cycles off, lite, full, ultra (the lazy-senior-dev rules); hooks switches its startup and prompt hooks</Text>)
        )}
        {section(
          'wpdev', 'WordPress checks (performance audit, PHPCS)',
          note(<Text dimColor wrap="truncate-end">{b.tools.find(l => l.startsWith('phpcs')) ?? 'phpcs: not read yet'}</Text>),
          <Box flexDirection="row" gap={1} flexWrap="wrap">
            {gb('audit-run', 'Performance audit', runTool('audit', 'lean-project audit perf'))}
            {gb('phpcs-run', 'Run PHPCS', runTool('phpcs', 'lean-project phpcs'))}
            {gb('phpcs-fix', 'Fix with PHPCBF', runTool('phpcbf', 'lean-project phpcs fix'))}
            {gb('phpcs-std', `standard: ${cfg.phpcs_standard}`, stepStandard)}
            {gb('phpcs-status', 'Refresh', () => readTools($))}
          </Box>,
          note(<Text dimColor>the audit and PHPCS check the PHP files changed since the last tag; PHPCS needs PHP and Composer on this machine</Text>)
        )}
        {section(
          'packs', 'Packs (apply next session)',
          <Box flexDirection="row" gap={1} flexWrap="wrap">
            {PACKS.flatMap(p => [gb(`${p}-on`, `${p} on`, () => setPack(p, 'on')), gb(`${p}-off`, `${p} off`, () => setPack(p, 'off'))])}
          </Box>,
          b.packs !== '' && note(<Text dimColor wrap="truncate-end">{b.packs}</Text>),
          note(<Text dimColor>Skill sets kept off so they cost no tokens at startup. on brings one back, off parks it. wp = WordPress skills, bricks = Bricks and BricksExtras skills, ui-ux = the UI/UX plugin.</Text>)
        )}
        {section(
          'violations', 'Recent violations',
          note(<Text dimColor>newest first. Allow once or Block once overrides the last rule that fired, for one hit only</Text>),
          recent.length === 0 ? note(<Text dimColor>none</Text>) : recent.map(v => note(<Text wrap="truncate-end" color={v.action === 'block' ? 'error' : 'warning'}>{v.action} {v.rule} {cut(v.detail, 60)}</Text>)),
          onceRule !== undefined && (
            <Box flexDirection="row" gap={1} flexWrap="wrap">
              {gb('once-allow', `Allow once: ${onceRule}`, () => setOnce('allow'))}
              {gb('once-block', `Block once: ${onceRule}`, () => setOnce('block'))}
            </Box>
          )
        )}
        <Box marginTop={1}>{gb('hide', 'Close lean-gate panel', () => $.ui.close({ id: PANE }))}</Box>
      </Box>
    )
  }).catch(($, e, next) => next(e))
}

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderChildren, SessionMessage, ToolCallInput } from 'claude-code'

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
  shellCommand,
  releaseActions,
  isLeanSkill,
  isStateFile,
  isTestCommand,
  isPhpcsCommand,
  isWporgAuditCommand,
  svnCommitMessage,
  vagueCommitMessage,
  isWpCode,
  isWpSkill,
  reviewUnscoped,
  mergeConfig,
  nextLevel,
  norm,
  projectLayer,
  loweredRules,
  opencodeProblem,
  parseJson,
  parseStrict,
  releaseAction,
  sha1Hex,
  repoKey,
  statRules,
  statsView,
} from './gate'
import type { Config, Level, Project, Release, RoutingKey } from './gate'
import { DEMO_PRESETS, GROUP_COLOR, GROUP_HELP, HELPER_LABEL, LEVEL_COLOR, MODEL_COLOR, PACKS, PRESETS, REMINDER_LABEL, REMINDER_RULES, ROUTING_HELP, ROUTING_LABEL, RULE_GROUPS, RULE_INFO, SECTION_COLOR, STATE_FILES, TOP_LEGEND, explainFor } from './text'

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
  packs: '',
  memory: '',
  memoryProjects: [],
  dueRepos: [],
  shut: [],
  board: [],
  lessons: [],
  stats: [],
  ptMode: '',
  tools: [],
  proj: '',
  projNew: false,
  projHit: null,
  explain: false,
  target: 'global',
}
const band = atom({ plugin: 'lean-gate', key: 'band' } as const, EMPTY)
const PANE = 'lean-gate'

// The route is "main" (no instruction), "free", or "<model>:<effort>", the same choices as Model routing.
const ROUTE_MODELS = ['main', 'haiku', 'sonnet', 'opus', 'fable', 'free']
const EFFORT_LIST = ['low', 'medium', 'high', 'xhigh', 'max']
const routeOk = (v: unknown): v is LeanGateRoute => typeof v === 'string' && /^(main|free|(haiku|sonnet|opus|fable):(low|medium|high|xhigh|max))$/.test(v)
const routeText = (r: LeanGateRoute) => (r === 'free' ? 'a free OpenCode model (name ends in -free)' : r)
// What a routing button steps through; a value typed into the config by hand is kept until the button is pressed.
const MODEL_NAMES = ['haiku', 'sonnet', 'opus', 'fable', 'free'] as const
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const
const AGENT_LIMITS = [0, 2, 3, 4, 6, 8] as const
const SECTION_CAPS = [0, 1, 2, 3, 4, 6] as const
const DELEGATE_AFTER = [4, 6, 8, 12, 16] as const
const CONTEXT_LIMITS = [200000, 300000, 500000, 1000000] as const
// Rules that only ever warn (they run after the work), so a block override has nothing to act on.
const WARN_ONLY = new Set(['state-file-fresh', 'tests-before-done', 'phpcs-before-done', 'push-after-tag'])
// Rule 8 counts reading tools only: Bash is neither counted nor ever denied.
const DELEGATE = new Set(['Read', 'Grep', 'Glob'])
const TOOL_MS = 3000
const OTHER_MS = 5000
const TOOL_RUN_MS = 180000
const GIT_BASH = 'C:/Program Files/Git/bin/bash.exe'
const LOG_LINES = 2000

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
    explain: r.explain === true,
    target: r.target === 'project' ? 'project' : 'global',
    lessons: Array.isArray(r.lessons) ? r.lessons.filter((n): n is string => typeof n === 'string').slice(0, 12) : [],
    stats: Array.isArray(r.stats) ? r.stats.filter((n): n is string => typeof n === 'string').slice(0, 60) : [],
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
  warned: Set<string>
  // End-of-turn rules already warned this session, quiet until a turn fixes them.
  nagged: Set<string>
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
  // lean-gate audit wporg ran this session (wporg-audit-before-release).
  wporg: boolean
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

// lean-project is the old name: its file is read while the new one is missing (the session start copies it over once).
const readNewOrOld = async ($: EngineInterface, dir: string, name: string): Promise<Read> => {
  const r = await readFile($, `${dir}/${name.replace('lean-project', 'lean-gate')}`)
  return r.kind === 'missing' ? readFile($, `${dir}/${name}`) : r
}
const configText = async ($: EngineInterface, dir: string, name: string) => {
  const r = await readNewOrOld($, dir, name)
  return r.kind === 'ok' ? r.text : ''
}

// Global file, then the session project's file; a missing or bad file reads as defaults.
async function loadConfig($: EngineInterface): Promise<Config> {
  const global = parseJson(await configText($, await claudeDir($), 'lean-project.json'))
  const project = parseJson(await configText($, norm(await $.session.cwd()), '.lean-project.json'))
  return mergeConfig(global, projectLayer(project))
}

// The rules this folder's .lean-gate.json turns down against the global file; a repo can ship that file, so it is shown, never silent.
async function projectLowers($: EngineInterface): Promise<string[]> {
  const global = parseJson(await configText($, await claudeDir($), 'lean-project.json'))
  const project = parseJson(await configText($, norm(await $.session.cwd()), '.lean-project.json'))
  return loweredRules(mergeConfig(global), mergeConfig(global, projectLayer(project)))
}

// Read-modify-write of one config file, keeping unknown keys. A file that is unreadable or not a JSON object is never written.
// The edit also gets the merged config read inside the queue, so two quick presses build on each other.
type Edit = (json: Record<string, unknown>, now: Config) => void
function editFile($: EngineInterface, mem: Mem, dir: string, oldName: string, label: string, edit: Edit): Promise<void> {
  return enqueue(mem, async () => {
    const file = `${dir}/${oldName.replace('lean-project', 'lean-gate')}`
    const r = await readNewOrOld($, dir, oldName)
    let json: Record<string, unknown> | undefined = {}
    if (r.kind === 'ok' && r.text.trim() !== '') json = parseStrict(r.text)
    if (r.kind === 'error' || json === undefined) return $.ui.toast(`lean-gate: ${label} config unreadable, not changed`)
    edit(json, await loadConfig($))
    await $.fs.write(file, `${JSON.stringify(json, null, 2)}\n`)
    $.ui.invalidate('ui.render')
  }).catch(() => undefined)
}
const editGlobal = async ($: EngineInterface, mem: Mem, edit: Edit) => editFile($, mem, await claudeDir($), 'lean-project.json', 'global', edit)
const editProject = async ($: EngineInterface, mem: Mem, edit: Edit) => editFile($, mem, norm(await $.session.cwd()), '.lean-project.json', 'project', edit)
// A panel press saves where the Settings switch points. A project file cannot set these keys (it may arrive with a cloned repo), so they go global.
const GLOBAL_ONLY = /^(mode|workflow|custom_rules|demo_pattern)$/
async function editConfig($: EngineInterface, mem: Mem, key: string, edit: Edit): Promise<void> {
  const { target } = await load($)
  return target === 'project' && !GLOBAL_ONLY.test(key) ? editProject($, mem, edit) : editGlobal($, mem, edit)
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

// Git Bash when it is installed (plain `bash` on Windows may be WSL's), else whatever `bash` is on PATH. Git Bash is found at its
// usual place, else next to the git on PATH (a per-user or scoop install); the answer is kept for the session.
let bashFound: string | undefined
async function bashPath($: EngineInterface): Promise<string> {
  if (bashFound !== undefined) return bashFound
  if (await $.fs.exists(GIT_BASH).catch(() => false)) return (bashFound = GIT_BASH)
  const r = await $.process.run(['git', '--exec-path'], { timeoutMs: TOOL_MS }).catch(() => undefined)
  const top = r?.exitCode === 0 ? norm(r.stdout.trim()).replace(/\/(mingw64|mingw32|clangarm64)\/libexec\/git-core\/?$/, '') : ''
  const guess = top !== '' && top !== norm(r?.stdout.trim() ?? '') ? `${top}/bin/bash.exe` : ''
  return (bashFound = guess !== '' && (await $.fs.exists(guess).catch(() => false)) ? guess : 'bash')
}

// `ms` defaults to the short budget of a status read; the panel's tool buttons pass a longer one.
async function shell($: EngineInterface, cwd: string, command: string, ms = OTHER_MS) {
  const bash = await bashPath($)
  // The app does not put the plugin's bin folder on PATH for its own processes, so `lean-gate` is found through the plugin root.
  // The root goes in through the environment, so a quote in the path cannot break the command.
  const pluginRoot = $.plugin.root
  const root = pluginRoot ? 'export PATH="$(cygpath -u "$LG_ROOT" 2>/dev/null || printf %s "$LG_ROOT")/bin:$PATH"; ' : ''
  return $.process.run([bash, '-c', `${root}${command}`], { cwd, timeoutMs: ms, ...(pluginRoot ? { env: { LG_ROOT: norm(pluginRoot) } } : {}) }).catch(() => undefined)
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
  if (now !== '' || !SHA.test(m.tree)) return 'due'
  if (tree.stdout.trim() === m.tree) return 'ok'
  // Committed what was reviewed plus non-code files (the changelog a tag asks for, notes): only the code has to match.
  const same = await git($, repo, ms, ['diff', '--quiet', m.tree, 'HEAD', '--', ...CODE_GLOBS])
  return same === undefined ? 'silent' : same.exitCode === 0 ? 'ok' : 'due'
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
  const [index, projects] = await Promise.all([shell($, cwd, 'lean-gate memory index'), shell($, cwd, 'lean-gate memory projects')])
  const names = (projects?.stdout ?? '').split('\n').map(l => l.trim().split(/\s+/)[1]).filter((n): n is string => !!n && /^[a-z0-9._-]+$/.test(n))
  await patch($, { memory: cut((index?.stdout ?? '').trim(), 160), memoryProjects: names.slice(0, 12) })
}

// The shared task board and the lessons, as the CLI prints them: a few trimmed lines each, shown in the details.
const lines = (out: string, n: number) => out.split('\n').map(l => cut(l.trim(), 100)).filter(Boolean).slice(0, n)
async function readBoard($: EngineInterface) {
  const r = await shell($, norm(await $.session.cwd()), 'lean-gate board')
  await patch($, { board: r === undefined || r.exitCode ? ['no board here yet: cards appear when work is delegated'] : lines(r.stdout, 16) })
}
async function readLessons($: EngineInterface) {
  const r = await shell($, norm(await $.session.cwd()), 'lean-gate lessons')
  await patch($, { lessons: lines(r?.stdout ?? '', 12) })
}
async function readStats($: EngineInterface) {
  const r = await shell($, norm(await $.session.cwd()), 'lean-gate stats 7')
  await patch($, { stats: lines(r?.stdout ?? '', 60) })
}

// Project registry (~/.claude/lean-projects.json): which project the folder is, and whether a prompt names another one.
// Ponytail mode (the flag file its hooks keep) and the status lines of the vendored tools and PHPCS.
async function readTools($: EngineInterface) {
  const mode = ((await readText($, `${await claudeDir($)}/.ponytail-active`)) ?? 'off').trim() || 'off'
  const r = await shell($, norm(await $.session.cwd()), 'lean-gate vendor status; lean-gate phpcs status')
  await patch($, { ptMode: mode, tools: lines(r?.stdout ?? '', 8) })
}
const loadRegistry = async ($: EngineInterface) => parseRegistry((await readText($, `${await claudeDir($)}/lean-projects.json`)) ?? undefined)
const isJsonList = (text: string) => {
  try {
    return Array.isArray(JSON.parse(text))
  } catch {
    return false
  }
}
// A registry that is unreadable or not a JSON list is never rewritten: a hand edit with a typo must not cost every other project.
function editRegistry($: EngineInterface, mem: Mem, edit: (list: Project[]) => Project[]): Promise<void> {
  return enqueue(mem, async () => {
    const file = `${await claudeDir($)}/lean-projects.json`
    const r = await readFile($, file)
    if (r.kind === 'error' || (r.kind === 'ok' && r.text.trim() !== '' && !isJsonList(r.text))) return $.ui.toast('lean-gate: lean-projects.json is unreadable or not a list, not changed')
    await $.fs.write(file, `${JSON.stringify(edit(parseRegistry(r.kind === 'ok' ? r.text : undefined)), null, 2)}
`)
    $.ui.invalidate('ui.render')
  }).catch(() => undefined)
}
const PROJECT_MARKERS = ['AGENTS.md', 'CLAUDE.md', '.git', 'README.md', 'package.json', 'composer.json']
// Registers every immediate child folder that looks like a project (not archives, backups or reference copies).
async function registerChildren($: EngineInterface, mem: Mem): Promise<number> {
  const cwd = norm(await $.session.cwd())
  const dirs = (await $.fs.list(cwd).catch(() => [])).filter(f => f.kind === 'dir' && !f.name.startsWith('.') && !/(-reference|^archive|^backups?)$/i.test(f.name)).slice(0, 60)
  const found: Project[] = []
  for (const d of dirs) {
    const inside = await $.fs.list(`${cwd}/${d.name}`).catch(() => [])
    if (inside.some(f => PROJECT_MARKERS.filter(m => m !== 'README.md').includes(f.name))) found.push({ name: d.name, path: `${cwd}/${d.name}`, aliases: [] })
  }
  let added = 0
  await editRegistry($, mem, list => {
    const fresh = found.filter(p => !list.some(x => x.path.toLowerCase() === p.path.toLowerCase()))
    added = fresh.length
    return [...list, ...fresh]
  })
  return added
}
async function detectProject($: EngineInterface) {
  const cwd = norm(await $.session.cwd())
  const hit = projectAt(await loadRegistry($), cwd)
  const marked = hit === undefined ? (await $.fs.list(cwd).catch(() => [])).some(f => PROJECT_MARKERS.includes(f.name)) : false
  await patch($, { proj: hit?.name ?? '', projNew: marked })
}
// A registered project, or a folder with a project marker. Not one: a scratch chat folder, where session rules do not apply
// (unless the Settings scope says everywhere).
async function inProject($: EngineInterface): Promise<boolean> {
  if ((await loadConfig($)).scope === 'everywhere') return true
  const cwd = norm(await $.session.cwd())
  return projectAt(await loadRegistry($), cwd) !== undefined || (await $.fs.list(cwd).catch(() => [])).some(f => PROJECT_MARKERS.includes(f.name))
}

// A skill load is kept in this module's memory, which a reload (plugin update, resume) empties; the transcript still has it.
// shortcut: after a compaction the old Skill call may be gone from the transcript, so the rule asks for one more load.
async function skillInTranscript($: EngineInterface, matches: (name: string) => boolean): Promise<boolean> {
  const rows: unknown = await $.session.messages().catch(() => [])
  return Array.isArray(rows) && (rows as SessionMessage[]).some(r => r.role === 'assistant' && r.toolUses.some(u => u.tool === 'Skill' && matches(String(u.input.skill ?? ''))))
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

// wporg-audit-before-release: a WordPress.org SVN commit needs a message that says what changed (G14), and an SVN commit,
// zip or tag of a WordPress.org plugin (readme.txt with a Stable tag) needs lean-gate audit wporg earlier in the session.
async function wporgCheck($: EngineInterface, mem: Mem, cfg: Config, cmd: string, rel: Release | undefined): Promise<string | undefined> {
  const msg = svnCommitMessage(cmd)
  if (msg !== undefined && vagueCommitMessage(msg)) {
    const deny = await trip($, mem, cfg, 'wporg-audit-before-release', `svn commit message "${cut(msg, 40)}"`, 'lean-gate: WordPress.org SVN is for releases only (G14): commit a finished version with a message that says what changed')
    if (deny !== undefined) return deny
  }
  if (mem.wporg) return undefined
  if (msg === undefined) {
    if (rel === undefined || rel.what.startsWith('git push')) return undefined
    const r = await readFile($, `${rel.dir}/readme.txt`)
    if (r.kind !== 'ok' || !/^Stable tag:/im.test(r.text)) return undefined
  }
  return trip($, mem, cfg, 'wporg-audit-before-release', `${msg === undefined ? rel?.what : 'svn commit'} with no lean-gate audit wporg this session`, 'lean-gate: run lean-gate audit wporg on the release zip (or the plugin folder) and fix what it finds, then release')
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
  // Quiet warnings (Settings): counted and listed, no pop-up.
  if (!cfg.quiet && !mem.warned.has(rule)) {
    mem.warned.add(rule)
    $.ui.toast(`lean-gate: ${rule}: ${cut(detail, 60)}`)
  }
  return undefined
}

// A push of a version-shaped name is a release only when the repo has that tag: a branch called 1.x or v2 is not.
// Git not answering counts as no tag (fails open, as the review check does).
async function tagExists($: EngineInterface, rel: Release | undefined): Promise<Release | undefined> {
  if (rel?.check === undefined) return rel
  const r = await git($, rel.dir, TOOL_MS, ['rev-parse', '-q', '--verify', `refs/tags/${rel.check}`])
  return r?.exitCode === 0 ? rel : undefined
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
    const deny = await trip($, mem, cfg, 'no-em-dashes', `em dash in ${shellCommand(tool, rec) !== undefined ? 'a commit message' : base(String(rec.file_path ?? tool))}`, 'lean-gate: no em dashes; use a colon, a comma or parentheses')
    if (deny !== undefined) return deny
  }

  // A new session must be findable later: its title starts with the date and time. A card the user accepts (proposal_id) keeps its own title.
  if ((tool === 'mcp__ccd_session__start_session' || tool === 'mcp__ccd_session__hand_off_to_session') && rec.proposal_id === undefined && !/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}|\d{2}:\d{2} \d{2}-\d{2}-\d{4}) \S/.test(String(rec.title ?? ''))) {
    const deny = await trip($, mem, cfg, 'distinctive-session-names', 'sub-session title lacks a date and time', 'lean-gate: name the session distinctively: start the title with the date and time (HH:MM DD-MM-YYYY, or YYYY-MM-DD HH:MM), then what it is about')
    if (deny !== undefined) return deny
  }

  if (isLead && (tool === 'Edit' || tool === 'Write')) {
    const path = norm(String(rec.file_path ?? ''))
    if (CODE_EDITED.test(path) && !mem.leanLoaded && (await inProject($)) && !(mem.leanLoaded = await skillInTranscript($, isLeanSkill))) {
      const deny = await trip($, mem, cfg, 'lean-gate-first', `code edit before the lean-gate skill: ${base(path)}`, 'lean-gate: load the lean-gate skill before editing code')
      if (deny !== undefined) return deny
    }
    if (CODE_EDITED.test(path) && effective(cfg, 'ponytail-active') !== 'off' && ((await readText($, `${await claudeDir($)}/.ponytail-active`))?.trim() ?? 'off') === 'off') {
      const deny = await trip($, mem, cfg, 'ponytail-active', `ponytail is off: ${base(path)}`, 'lean-gate: turn ponytail on (/ponytail full) before editing code')
      if (deny !== undefined) return deny
    }
    if (!mem.wpSkill && isWpCode(path, callText(tool, rec)) && !(mem.wpSkill = await skillInTranscript($, isWpSkill))) {
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
      const deny = await trip($, mem, cfg, 'review-edited-files-only', cut(String(rec.description ?? 'review agent'), 60), 'lean-gate: scope the review to the edited files (list them or run lean-gate review-scope)')
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

  const cmd = shellCommand(tool, rec)
  if (cmd !== undefined) {
    if (effective(cfg, 'no-demo-files-public') !== 'off' && isGitPush(cmd)) {
      const files = await publicDemoFiles($, norm(await $.session.cwd()), cfg.demo_pattern)
      if (files.length > 0) {
        const deny = await trip($, mem, cfg, 'no-demo-files-public', `public repo would get: ${cut(files.join(', '), 100)}`, 'lean-gate: this push sends demo or scratch files to a public repo; keep it to changelog, readme and descriptions')
        if (deny !== undefined) return deny
      }
    }
    if (cfg.pr_repos.length > 0 && isGitPush(cmd)) {
      const cwd = norm(await $.session.cwd())
      const [top, branch] = await Promise.all([git($, cwd, TOOL_MS, ['rev-parse', '--show-toplevel']), git($, cwd, TOOL_MS, ['rev-parse', '--abbrev-ref', 'HEAD'])])
      const name = base(top?.stdout.trim() ?? '')
      if (cfg.pr_repos.includes(name) && /^(main|master)$/.test(branch?.stdout.trim() ?? '')) {
        const deny = await trip($, mem, cfg, 'one-pr-per-fix', `push to ${branch?.stdout.trim()} in ${name}`, `lean-gate: ${name} takes pull requests only: push a branch and open one PR per fix, merge after the owner's go-ahead`)
        if (deny !== undefined) return deny
      }
    }
    const oc = opencodeProblem(cmd)
    if (oc !== undefined) {
      const deny = await trip($, mem, cfg, 'free-opencode-only', oc, 'lean-gate: OpenCode runs must name a free model (the name ends in -free)')
      if (deny !== undefined) return deny
    }
    const relAny = await tagExists($, releaseAction(cmd, await $.session.cwd(), (await home($)) ?? ''))
    if (relAny !== undefined && effective(cfg, 'changelog-before-tag') !== 'off' && !relAny.what.startsWith('git push') && (await changelogUnchanged($, relAny.dir))) {
      const deny = await trip($, mem, cfg, 'changelog-before-tag', `${relAny.what} with no changelog or readme change since the last tag`, 'lean-gate: write the changelog (and readme if behaviour changed) before tagging')
      if (deny !== undefined) return deny
    }
    if (effective(cfg, 'wporg-audit-before-release') !== 'off') {
      const deny = await wporgCheck($, mem, cfg, cmd, relAny)
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
        const deny = await trip($, mem, cfg, 'release-needs-review', `${rel.what} in ${cut(rel.dir, 50)}`, 'lean-gate: review the changed code first (press Reviewed in the band after lean-gate review-scope), then release')
        if (deny !== undefined) return deny
      }
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
  const cmd = shellCommand(String(e.tool), e as unknown as Record<string, unknown>)
  if (cmd !== undefined && !ran.isError) {
    // Every action counts: `git tag v1 && git push origin v1` is a tag and its push.
    for (const found of releaseActions(cmd, await $.session.cwd(), (await home($)) ?? '')) {
      const rel = await tagExists($, found)
      if (rel?.what.startsWith('git tag')) mem.tagged = true
      // Only a push that sends tags publishes the release; a plain push leaves the tag local.
      if (rel?.what === 'git push of tags') mem.pushed = true
    }
  }
  if (cmd !== undefined && isTestCommand(cmd)) {
    mem.tested = true
    await patch($, { tests: ran.isError ? 'fail' : 'pass' })
  }
  if (cmd !== undefined && isPhpcsCommand(cmd)) mem.phpcs = true
  if (cmd !== undefined && isWporgAuditCommand(cmd) && !ran.isError) mem.wporg = true
  if ((e.tool === 'Edit' || e.tool === 'Write') && !ran.isError) {
    const path = norm(e.file_path)
    const now = await $.clock.now()
    if (isStateFile(path, (await loadConfig($)).state_file)) {
      mem.stateTouched = true
      await patch($, { stateAt: now })
    } else if (CODE_EDITED.test(path)) {
      mem.edited.add(path)
      // PHPCS is for WordPress code only: a WordPress PHP edit, or any PHP once the WordPress skills are loaded.
      if (/\.php$/i.test(path) && (mem.wpSkill || isWpCode(path, callText(e.tool, e as unknown as Record<string, unknown>)))) mem.php++
      await patch($, { codeAt: now })
    }
  }
}

export const register: Register = on => {
  const mem: Mem = { edited: new Set(), stateTouched: false, tested: false, phpcs: false, php: 0, warned: new Set(), nagged: new Set(), leanLoaded: false, wpSkill: false, draft: { preset: 0, level: 'warn' }, docsRead: false, agents: 0, agentsBy: {}, counted: new Map(), tagged: false, pushed: false, wporg: false, once: new Map(), run: 0, lead: 0, sub: 0, chain: Promise.resolve() }
  const resetTurn = () => {
    mem.edited.clear()
    mem.stateTouched = false
    mem.tested = false
    mem.phpcs = false
    mem.php = 0
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
    await patch($, { run: 0 }).catch(() => undefined)
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
      const php = mem.php > 0
      const phpcsRan = mem.phpcs
      const unpushed = mem.tagged && !mem.pushed
      resetTurn()
      void (async () => {
        const cfg = await loadConfig($)
        if (unpushed) await trip($, mem, cfg, 'push-after-tag', 'a tag was made this turn and nothing was pushed', '', false)
        // Warned once, then quiet until a turn fixes it (touches the state file, runs tests or PHPCS), which re-arms it.
        // A folder that is not a project (a scratch chat) has no state file or tests to keep, so it is never judged.
        const project = n > 0 && (await inProject($))
        const nag = async (rule: string, broken: boolean, fixed: boolean, detail: string) => {
          if (fixed) mem.nagged.delete(rule)
          // The Settings reminder button can make it warn every turn instead.
          const every = cfg.reminders[rule] === 'every'
          if (!broken || !project || (!every && mem.nagged.has(rule))) return
          if (!every) mem.nagged.add(rule)
          await trip($, mem, cfg, rule, detail, '', false)
        }
        await nag('state-file-fresh', !stateTouched, stateTouched, `${n} code file(s) edited, no state file touched`)
        await nag('tests-before-done', !tested, tested, `${n} code file(s) edited, no test command ran`)
        await nag('phpcs-before-done', php && !phpcsRan, phpcsRan, 'PHP files edited, PHPCS did not run')
        await refreshRelease($)
      })().catch(() => undefined)
    }
    return result
  }).catch(($, e, next) => next(e))

  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      mem.run = mem.lead = mem.sub = 0
      mem.leanLoaded = mem.wpSkill = mem.docsRead = mem.wporg = false
      mem.once.clear()
      mem.nagged.clear()
      await patch($, { lead: 0, sub: 0, run: 0, violations: [] }).catch(() => undefined)
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await $.command.register({ name: 'lean-gate', description: 'Open the lean-gate panel' }).catch(() => undefined)
    // Settings: open with details, open compact, or stay closed (the Open button above the prompt still shows).
    const { panel_start } = await loadConfig($)
    if (panel_start !== 'closed') {
      await patch($, { details: panel_start === 'details' }).catch(() => undefined)
      void $.ui.open({ id: PANE, title: 'lean-gate' }).catch(() => undefined)
    }
    // Log housekeeping and git work run after the session has started, not in front of it.
    void (async () => {
      await trimLog($, mem)
      await refreshRelease($)
      // The panel can open with its details already showing, so these are read now, not only when Details is pressed.
      await readMemory($)
      await readBoard($)
      await readLessons($)
      await readStats($)
      await readTools($)
      await detectProject($)
      const lowered = await projectLowers($)
      if (lowered.length > 0) $.ui.toast(`lean-gate: this project's .lean-gate.json turns down: ${cut(lowered.join(', '), 120)}`)
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
      sections.push({ id: 'lean-gate:precedence', text: `lean-gate is on (${mode}) and its panel settings outrank the lean-gate skill guides: where ROUTING.md, BUILD.md or any guide names a model, effort or agent count, use this routing instead: ${table}. The guides only fill gaps the panel does not set. Every Agent call needs model and effort; a rule that blocks is a stop, not a suggestion.`, scope: 'session' as const })
    }
    if (auto_memory) sections.push({ id: 'lean-gate:auto-memory', text: 'Project memory is automatic: when you decide something, finish a milestone or learn a fact the next session needs, record it yourself with lean-gate memory add "<one line>" --tag decision|state|link|note. One line each, no progress chatter.', scope: 'session' as const })
    if (auto_lessons) sections.push({ id: 'lean-gate:auto-lessons', text: 'Lessons are automatic: when the person corrects you, or you repeat a mistake, record it yourself with lean-gate lesson "<what to do differently>". The second sighting of the same text becomes a local rule.', scope: 'session' as const })
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
        <Button key="open-panel" variant="primary" label="Open lean-gate panel" onPress={() => void $.ui.open({ id: PANE, title: 'lean-gate' }).then(() => $.ui.invalidate('ui.render')).catch(() => undefined)} />
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
    const lowered = await projectLowers($)
    const now = await $.clock.now()
    const tokens = (await $.session.usage().catch(() => undefined))?.context.tokens
    const els = $.ui.resolve(e)
    const { Box, Text, Button } = els
    // The app surfaces draw SVG (hover tooltips through <title>); the terminal has none and keeps Explain.
    const Svg = 'Svg' in els ? els.Svg : undefined
    const esc = (s: string) => s.replace(/[<>&"]/g, c => `&#${c.charCodeAt(0)};`)
    const info = (help: string | undefined) =>
      Svg === undefined || help === undefined ? null : (
        <Svg
          source={`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><title>${esc(help)}</title><circle cx="7" cy="7" r="6" fill="none" stroke="#8a8a8a"/><text x="7" y="10.5" text-anchor="middle" font-size="9" font-family="sans-serif" fill="#8a8a8a">i</text></svg>`}
          alt={help}
          width={14}
          height={14}
          isInteractive
        />
      )
    // A status item drawn as a coloured pill; no colour draws it dim and plain.
    const pill = (text: string, color: string | undefined) => (color === undefined ? <Text dimColor>{text}</Text> : <Text color={color} inverse>{` ${text} `}</Text>)
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
        await patch($, { packs: cut(((await shell($, await here(), 'lean-gate pack status'))?.stdout ?? '').trim().split('\n').slice(0, 2).join(' | '), 100) })
        await patch($, { dueRepos: await dueChildren($, await here()) })
        await readMemory($)
        await readBoard($)
        await readLessons($)
        await readStats($)
        await readTools($)
      }
    }
    const review = async () => {
      const r = await shell($, await here(), 'lean-gate review-scope')
      $.ui.toast(r === undefined ? 'lean-gate not found' : (r.stdout || r.stderr).trim().split('\n').slice(0, 2).join('\n') || 'review-scope printed nothing')
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
      const r = await shell($, await here(), `lean-gate pack ${state} ${name}`)
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
    // Buttons are drawn with chrome (a desktop draws native buttons) so they stand apart from status text; the main action of a
    // row is primary. With Explain on, each button sits on its own line with its one-line explanation beside it.
    const gb = (key: string, label: string, onPress: () => unknown, primary = false) => {
      const button = <Button key={key} variant={primary ? 'primary' : 'secondary'} label={label} onPress={() => void onPress()} />
      const line = b.explain ? explainFor(key) : undefined
      return line === undefined ? button : (
        <Box key={`x-${key}`} flexDirection="row" gap={1}>
          {button}
          <Box flexShrink={1}><Text dimColor>{line}</Text></Box>
        </Box>
      )
    }
    // Button rows wrap side by side; with Explain on they stack, one explained button per line.
    const rowDir = b.explain ? ('column' as const) : ('row' as const)
    const dot = <Text dimColor>·</Text>
    // flexShrink 0: a cell wraps as a whole to the next line, never mid-label.
    // The dot trails its cell, so a wrapped line never starts with one.
    const join = (parts: RenderChildren[]) => parts.map((p, i) => <Box key={`cell-${i}`} flexShrink={0} gap={1}>{p}{i < parts.length - 1 ? dot : null}</Box>)

    // A Button here takes a label only: Text beside a string inside one is refused by this build.
    const parts: RenderChildren[] = [
      <Box flexDirection="row" gap={1}>
        <Text color={levelColor[cfg.mode]}>●</Text>
        {gb('mode', cfg.mode, () => editGlobal($, mem, (j, c) => (j.mode = nextLevel(c.mode))))}
      </Box>,
      gb('route', `route ${rModel}`, cycleRouteModel),
    ]
    if (b.proj === '') parts.push(gb('setup', 'Set up project', () => (b.projNew ? adoptProject() : startProject()), true))
    if (rModel !== 'main' && rModel !== 'free') parts.push(gb('route-effort', rEffort, cycleRouteEffort))
    parts.push(
      <Text color={b.run >= cfg.delegate_after_lead_calls ? 'warning' : undefined}>
        lead {b.lead} / sub {b.sub}
      </Text>
    )
    if (tokens !== undefined) {
      // A ten-cell bar: orange from 70 percent, red from 90.
      const ctxColor = ctxPct >= 0.9 ? 'error' : ctxPct >= 0.7 ? 'warning' : 'success'
      const cells = Math.max(0, Math.min(10, Math.round(ctxPct * 10)))
      parts.push(
        <Box flexDirection="row" gap={1}>
          <Text color={ctxPct >= 0.9 ? 'error' : ctxPct >= 0.7 ? 'warning' : undefined}>{kilo(tokens)}/{kilo(cfg.context_limit)}</Text>
          <Text>
            <Text color={ctxColor}>{'▰'.repeat(cells)}</Text>
            <Text dimColor>{'▱'.repeat(10 - cells)}</Text>
          </Text>
        </Box>
      )
      if (ctxPct >= 0.8) parts.push(gb('new', 'New session', newSession, true))
    }
    parts.push(b.stateAt === 0 && b.codeAt === 0 ? pill('state -', undefined) : pill(stale ? '⚠ stale' : `✓ ${age(stateAge)}`, stale ? 'warning' : 'success'))
    if (stale) parts.push(gb('state', 'Update state', updateState, true))
    parts.push(pill(`tests ${b.tests}`, b.tests === 'pass' ? 'success' : b.tests === 'fail' ? 'error' : undefined))
    if (b.tests !== 'pass') parts.push(gb('tests', 'Run tests', runTests, true))
    if (b.release === 'due') parts.push(pill('review due', 'warning'), gb('review', 'Review', review), gb('reviewed', 'Reviewed', reviewed, true))
    else if (b.release === 'ok') parts.push(pill('reviewed', 'success'))
    parts.push(pill(`⚠ ${b.violations.length}`, b.violations.length > 0 ? 'warning' : undefined))
    if (lowered.length > 0) parts.push(pill(`project lowers ${lowered.length}`, 'warning'))
    parts.push(gb('details', b.details ? 'Compact' : 'Details', toggle))
    parts.push(gb('explain', b.explain ? 'Hide help' : 'Explain', () => patch($, { explain: !b.explain })))

    // With Explain on, the top row stacks (one item per line) and a legend says what each status item means.
    const compact = b.explain ? (
      <Box flexDirection="column" width={e.props.bodyColumns}>
        {parts.map((p, i) => <Box key={`cell-${i}`}>{p}</Box>)}
        {TOP_LEGEND.map((l, i) => <Text key={`legend-${i}`} dimColor>{l}</Text>)}
      </Box>
    ) : (
      <Box flexDirection="row" alignItems="center" gap={1} flexWrap="wrap" width={e.props.bodyColumns}>
        {join(parts)}
      </Box>
    )
    if (!b.details) return stack(compact)

    const level = (rule: string) => cfg.rules[rule] ?? 'off'
    // A title that folds its body shut or open; the folded ids are kept in the band state.
    const flip = (id: string) => update($, band, x => { const s = sane(x); return { ...s, shut: s.shut.includes(id) ? s.shut.filter(n => n !== id) : [...s.shut, id] } })
    // A Button takes no colour at rest, so a coloured bar leads the title and the title takes the colour on hover.
    // `extra` sits after the title (the current choice of a folded row); `help` is the hover text of the info icon.
    const fold = (id: string, title: string, body: RenderChildren[], o: { color?: string; help?: string; extra?: RenderChildren } = {}) => (
      <Box key={id} flexDirection="column">
        <Box key={`t-${id}`} flexDirection="row" alignItems="center" gap={1}>
          {o.color !== undefined && <Text color={o.color}>▌</Text>}
          <Button key={`sec-${id}`} plain label={`${b.shut.includes(id) ? '▸' : '▾'} ${title}`} hover={o.color === undefined ? undefined : { color: o.color }} onPress={() => void flip(id)} />
          {o.extra}
          {info(o.help)}
        </Box>
        {!b.shut.includes(id) && <Box flexDirection="column" paddingLeft={2}>{body}</Box>}
      </Box>
    )
    // One rule per row: a level dot (grey off, orange warn, red block), the level button, then the name over a dim one-line meaning.
    const ruleRow = (rule: string, info: string) => (
      <Box key={`row-${rule}`} flexDirection="row" gap={1}>
        <Text color={LEVEL_COLOR[level(rule)]}>●</Text>
        <Box width={9} flexShrink={0}>
          <Button key={`rule-${rule}`} variant="secondary" label={level(rule)} onPress={() => void editConfig($, mem, 'rules', (j, c) => (j.rules = { ...(j.rules as object), [rule]: nextLevel(c.rules[rule] ?? 'off') }))} />
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
      <Box key={`group-${title}`} flexDirection="column" marginTop={i === 0 ? 0 : 1}>{fold(`rules:${title}`, `${title} (${rows.length})`, rows, { color: GROUP_COLOR[title], help: GROUP_HELP[title] })}</Box>
    ))
    const recent = b.violations.slice(-5).reverse()
    // The noisiest rule over the last 7 days that is still on (retired and switched-off rules read as off).
    const noisy = statRules(b.stats).find(([r]) => level(r) !== 'off')

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
    const askRule = ask('Add a custom rule to the custom_rules list in ~/.claude/lean-gate.json (fields: id, tool such as Bash or Edit|Write, match as a regex over the command or new file text, message, level warn or block). Ask me what it should catch first.', 'Ask Claude: write a custom lean-gate rule')

    // Project memory: the CLI keeps the notes; the band shows the index line and runs the small actions, then re-reads it.
    const memShell = async (command: string) => {
      const r = await shell($, await here(), command)
      $.ui.toast(cut((r?.stdout || r?.stderr || 'lean-gate not found').trim().split('\n')[0] ?? '', 100))
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
    const registerAll = async () => {
      const n = await registerChildren($, mem)
      $.ui.toast(n > 0 ? `registered ${n} project folder${n === 1 ? '' : 's'}` : 'no new project folders found here')
      await detectProject($)
    }
    const startProject = ask('Start a new project in this folder: follow STRUCTURE.md in the lean-gate skill (the setup cards, then the stage scaffold with AGENTS.md as the entry). Ask me what it is for first.', 'Ask Claude: start a project')
    const adoptProject = ask('Adopt this folder as a hub project: audit it, show me a migration map and wait for my approval before changing anything (STRUCTURE.md, adopting). Keep my existing CLAUDE.md and state file.', 'Ask Claude: adopt this folder')
    const walkTest = ask('Run the walk test on this project (STRUCTURE.md): from the files alone, orient, say what the next step is and report the status. List anything you could not find.', 'Ask Claude: walk test')
    const attachHit = ask(`Read the entry file (AGENTS.md, else CLAUDE.md) and the state file of ${b.projHit?.name ?? 'the project'} at ${b.projHit?.path ?? ''}, and use them for this chat. Do not edit anything there.`, 'Ask Claude: read that project')
    const switchHit = ask(`Change this session\x27s working directory to ${b.projHit?.path ?? ''} with the change_directory tool, then read its entry file and state file.`, 'Ask Claude: switch folder')
    // Ponytail, the performance audit and PHPCS: each button runs the matching lean-gate command and toasts its first line.
    const PT_MODES = ['off', 'lite', 'full', 'ultra']
    const stepPonytail = async () => {
      const cur = ((await readText($, `${await claudeDir($)}/.ponytail-active`)) ?? 'off').trim()
      await $.fs.write(`${await claudeDir($)}/.ponytail-active`, PT_MODES[(PT_MODES.indexOf(cur) + 1) % PT_MODES.length] ?? 'off')
      await readTools($)
    }
    const runTool = (label: string, command: string, andThen?: () => Promise<void>) => async () => {
      // Audits, PHPCS and a vendor update (a download) can take minutes; no answer is a failure, never "done".
      const r = await shell($, await here(), command, TOOL_RUN_MS)
      const text = (r?.stdout || r?.stderr || '').trim().split(/\r?\n/).filter(l => l.trim() !== '')
      $.ui.toast(`${label}: ${cut(text[text.length - 1] ?? (r === undefined ? 'timed out or failed to start' : r.exitCode ? 'failed' : 'done'), 80)}`)
      if (andThen) await andThen()
    }
    const PHPCS_STANDARDS = ['WordPress', 'WordPress-Extra', 'WordPress-Core', 'WordPress-Docs']
    // Settings presses step from the value the panel shows (global and project merged) and save where the Settings switch points.
    const stepStandard = () => editConfig($, mem, 'phpcs_standard', (j, c) => (j.phpcs_standard = cycle(PHPCS_STANDARDS, c.phpcs_standard)))
    const toggleHelper = (key: (typeof HELPERS)[number]) => editConfig($, mem, 'helpers', (j, c) => (j.helpers = { ...(j.helpers as object), [key]: !c.helpers[key] }))
    const toggleAuto = (key: 'auto_memory' | 'auto_lessons') => editConfig($, mem, key, (j, c) => (j[key] = !c[key]))
    const askBoard = ask('Run lean-gate board and tell me in a few lines which cards are blocked or waiting on another card, and what each needs.', 'Ask Claude: check the board')
    const addLesson = ask('Record a lesson with lean-gate lesson "<what to do differently>" for what went wrong or was corrected in this session. Ask me what it should say first.', 'Ask Claude: record a lesson')
    const reviewLessons = ask('Run lean-gate lessons review, then rewrite each old lesson into a rule (record it again) or drop it with lean-gate lessons drop.', 'Ask Claude: review old lessons')
    const remember = ask('Add a project memory note for what we decided or did in this session: lean-gate memory add "<one line>" --tag decision|state|link|note.', 'Ask Claude: add a project memory note')
    const recall = ask('Run lean-gate memory recall and tell me in a few lines where this project stands.', 'Ask Claude: recall project memory')
    const forgetLast = () => memShell(String.raw`n=$(lean-gate memory list | tail -n 1 | cut -d" " -f1); case "$n" in ''|*[!0-9]*) echo "memory: nothing to forget" ;; *) lean-gate memory forget "$n" ;; esac`)

    // Model routing and the workflow limits: each button steps through a short list and writes the global config.
    const cycle = <T,>(list: readonly T[], cur: T): T => list[(list.indexOf(cur) + 1) % list.length] as T
    // Steps one part of a section's model:effort from the value in the file, so two quick presses build on each other.
    const stepRouting = (key: RoutingKey, part: 'model' | 'effort') =>
      editConfig($, mem, 'routing', j => {
        const stored = (j.routing as Record<string, unknown> | undefined)?.[key]
        const [m = 'sonnet', ef = 'medium'] = (typeof stored === 'string' ? stored : cfg.routing[key]).split(':')
        // Haiku is left out of the coding sections: it never writes code.
        const choices = CODING_SECTIONS.includes(key) ? MODEL_NAMES.filter(n => n !== 'haiku') : MODEL_NAMES
        const next = part === 'model' ? cycle(choices, m) : m
        const value = next === 'free' ? 'free' : `${next}:${part === 'effort' ? cycle(EFFORTS, ef) : ef || 'medium'}`
        j.routing = { ...(j.routing as object), [key]: value }
      })
    // Steps take the config read inside the save queue, so two quick presses build on each other.
    const setMaxAgents = (next: (c: Config) => number) => editConfig($, mem, 'max_agents', (j, c) => (j.max_agents = next(c)))
    const setCap = (key: RoutingKey, next: (c: Config) => number) => editConfig($, mem, 'agent_caps', (j, c) => (j.agent_caps = { ...(j.agent_caps as object), [key]: next(c) }))
    const setNum = (key: string, next: (c: Config) => number) => editConfig($, mem, key, (j, c) => (j[key] = next(c)))
    const editWorkflow = ask('Set the "workflow" text in ~/.claude/lean-gate.json (or this project\'s .lean-gate.json): a few short lines saying where each kind of work happens, how many agents and at what effort, and the order of steps. Ask me what it should say first.', 'Ask Claude: write the workflow text')
    const lastHit = recent[0]
    const onceRule = lastHit === undefined ? undefined : lastHit.rule
    const setOnce = (kind: 'allow' | 'block') => {
      if (onceRule === undefined) return
      if (kind === 'block' && WARN_ONLY.has(onceRule)) return $.ui.toast(`lean-gate: ${onceRule} can only warn, so Block once does nothing`)
      mem.once.set(onceRule, kind)
      $.ui.toast(`lean-gate: the next ${onceRule} hit is ${kind === 'allow' ? 'allowed' : 'blocked'} once`)
    }

    // Settings. Labels show the merged value; presses save where the switch points (editConfig), except the per-project state
    // file (always this project) and the global-only demo pattern.
    const dir = await claudeDir($)
    const cwd = await here()
    const SETTINGS_FILE = `${cwd}/lean-gate-settings.json`
    const [canUndo, canImport] = await Promise.all([$.fs.exists(`${dir}/lean-gate.json.reset-bak`).catch(() => false), $.fs.exists(SETTINGS_FILE).catch(() => false)])
    const flipTarget = () => patch($, { target: b.target === 'global' ? 'project' : 'global' })
    const stepReminder = (rule: string) => editConfig($, mem, 'reminders', (j, c) => (j.reminders = { ...(j.reminders as object), [rule]: c.reminders[rule] === 'every' ? 'once' : 'every' }))
    const PANEL_STARTS = ['details', 'compact', 'closed'] as const
    const stateFile = cfg.state_file
    const stepStateFile = () => editProject($, mem, (j, c) => (j.state_file = cycle<string>(STATE_FILES, c.state_file)))
    // shortcut: the label names the folder of this session, the press checks git's top level; they differ only in a subfolder.
    const repoName = base(cwd)
    const togglePr = async () => {
      const top = await git($, cwd, TOOL_MS, ['rev-parse', '--show-toplevel'])
      if (top === undefined || top.exitCode !== 0) return $.ui.toast('lean-gate: this folder is not a git repo')
      const name = base(top.stdout.trim())
      // The target file's own list: the merged one would copy the project's list into the global file and drop the global entries.
      await editConfig($, mem, 'pr_repos', j => {
        const own = Array.isArray(j.pr_repos) ? j.pr_repos.filter((n): n is string => typeof n === 'string') : []
        j.pr_repos = own.includes(name) ? own.filter(n => n !== name) : [...own, name]
      })
    }
    const demoIndex = DEMO_PRESETS.findIndex(p => p.pattern === cfg.demo_pattern)
    const stepDemo = () => editGlobal($, mem, (j, c) => (j.demo_pattern = (DEMO_PRESETS[(DEMO_PRESETS.findIndex(p => p.pattern === c.demo_pattern) + 1) % DEMO_PRESETS.length] ?? DEMO_PRESETS[0]).pattern))
    // Reset keeps one backup (the last reset); Undo reset puts it back. Import backs up first too.
    // A file that is already empty (a second press) or unchanged by the import never replaces the backup, and an unreadable file is
    // left alone, so the backup always holds the user's last real settings.
    const emptySettings = (text: string) => Object.keys(parseStrict(text) ?? { x: 1 }).length === 0
    const resetSettings = () =>
      enqueue(mem, async () => {
        const r = await readFile($, `${dir}/lean-gate.json`)
        if (r.kind === 'error') return $.ui.toast('lean-gate: lean-gate.json is unreadable, not reset')
        if (r.kind === 'ok' && !emptySettings(r.text)) await $.fs.write(`${dir}/lean-gate.json.reset-bak`, r.text)
        await $.fs.write(`${dir}/lean-gate.json`, '{}\n')
        $.ui.toast('lean-gate: settings reset to defaults (Undo reset puts them back)')
        $.ui.invalidate('ui.render')
      }).catch(() => undefined)
    const undoReset = () =>
      enqueue(mem, async () => {
        const r = await readFile($, `${dir}/lean-gate.json.reset-bak`)
        if (r.kind !== 'ok' || parseStrict(r.text) === undefined) return $.ui.toast('lean-gate: no reset to undo')
        await $.fs.write(`${dir}/lean-gate.json`, r.text)
        $.ui.toast('lean-gate: settings from before the reset are back')
        $.ui.invalidate('ui.render')
      }).catch(() => undefined)
    const exportSettings = async () => {
      const r = await readFile($, `${dir}/lean-gate.json`)
      await $.fs.write(SETTINGS_FILE, r.kind === 'ok' ? r.text : '{}\n')
      $.ui.toast(`lean-gate: settings written to ${SETTINGS_FILE}`)
      $.ui.invalidate('ui.render')
    }
    const importSettings = () =>
      enqueue(mem, async () => {
        const r = await readFile($, SETTINGS_FILE)
        if (r.kind !== 'ok' || parseStrict(r.text) === undefined) return $.ui.toast('lean-gate: lean-gate-settings.json here is not a settings object, nothing changed')
        const cur = await readFile($, `${dir}/lean-gate.json`)
        if (cur.kind === 'error') return $.ui.toast('lean-gate: lean-gate.json is unreadable, nothing imported')
        if (cur.kind === 'ok' && cur.text !== r.text && !emptySettings(cur.text)) await $.fs.write(`${dir}/lean-gate.json.import-bak`, cur.text)
        await $.fs.write(`${dir}/lean-gate.json`, r.text)
        $.ui.toast('lean-gate: settings imported (the old ones are in lean-gate.json.import-bak)')
        $.ui.invalidate('ui.render')
      }).catch(() => undefined)

    // A plain Button pads its label by one column, so text lines get the same pad to line up with the buttons.
    const note = (child: RenderChildren) => <Box paddingLeft={1}>{child}</Box>
    const section = (id: string, title: string, ...body: RenderChildren[]) => <Box key={id} flexDirection="column" marginTop={1}>{fold(id, title, body, { color: SECTION_COLOR[id] })}</Box>
    // Rule stats: each rule as a bar of ten cells at most, red for its blocks and orange for its warnings, scaled to the noisiest.
    const statRows = statRules(b.stats)
    const top = statRows[0]?.[1] ?? 0
    const statBar = ([rule, hits, blocks]: [string, number, number]) => {
      const n = Math.max(1, Math.round((hits / Math.max(1, top)) * 10))
      const red = Math.min(n, Math.round((blocks / Math.max(1, hits)) * n))
      return note(
        <Text key={`sb-${rule}`} wrap="truncate-end">
          <Text color="error">{'█'.repeat(red)}</Text>
          <Text color="warning">{'█'.repeat(n - red)}</Text>
          {`${' '.repeat(11 - n)}${hits}  ${rule}${blocks > 0 ? ` (${blocks} block)` : ''}`}
        </Text>
      )
    }

    return stack(
      <Box flexDirection="column" width={e.props.bodyColumns}>
        {compact}
        {section(
          'project', 'Project',
          note(<Text dimColor wrap="truncate-end">{b.proj ? `registered: ${b.proj}` : b.projNew ? 'a project folder that is not registered' : 'no project detected in this folder'}</Text>),
          lowered.length > 0 && note(<Text color="warning" wrap="wrap">this folder's .lean-gate.json turns down: {lowered.map(r => `${r} (${cfg.rules[r] ?? 'off'})`).join(', ')}</Text>),
          <Box flexDirection={rowDir} gap={1} flexWrap="wrap">
            {b.proj === '' ? gb('proj-add', 'Register this folder', registerHere, true) : gb('proj-remove', 'Unregister', unregisterHere)}
            {gb('proj-all', 'Register folders here', registerAll)}
            {gb('proj-start', 'Start project', startProject)}
            {gb('proj-adopt', 'Adopt this folder', adoptProject)}
            {gb('proj-walk', 'Walk test', walkTest)}
          </Box>,
          b.projHit !== null && note(<Text color="warning" wrap="truncate-end">you mentioned {b.projHit.name} ({b.projHit.path})</Text>),
          b.projHit !== null && (
            <Box flexDirection={rowDir} gap={1} flexWrap="wrap">
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
          // One card for the draft rule; the raw pattern is on the info icon (app) or shown with Explain on (terminal).
          <Box borderStyle="round" borderColor={SECTION_COLOR.builder} flexDirection="column" paddingX={1}>
            <Box flexDirection={rowDir} gap={1} flexWrap="wrap" alignItems="center">
              {gb('rb-pattern', `pattern: ${preset.label} (${preset.tool})`, () => { mem.draft.preset = (mem.draft.preset + 1) % PRESETS.length; redraw() })}
              {gb('rb-level', `level: ${mem.draft.level}`, () => { mem.draft.level = mem.draft.level === 'warn' ? 'block' : 'warn'; redraw() })}
              <Text color={LEVEL_COLOR[mem.draft.level]}>●</Text>
              {gb('rb-add', 'Add rule', addRule, true)}
              {info(`${preset.message}. ${preset.tool} calls matching: ${preset.match}`)}
            </Box>
            {b.explain && <Text dimColor wrap="truncate-end">{preset.match}</Text>}
          </Box>,
          cfg.custom.length > 0 && (
            <Box flexDirection={rowDir} gap={1} flexWrap="wrap">
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
            // Folded, the row still shows its choice: the model in its colour, the effort and the cap.
            const choice = `${m === 'free' ? 'free' : `${m}:${ef}`}${cap === 0 ? '' : `, ${cap} at once`}`
            return fold(`rt:${k}`, ROUTING_LABEL[k], [
              <Box flexDirection={rowDir} gap={1} flexWrap="wrap">
                {gb(`rt-${k}-model`, `model: ${m}`, () => stepRouting(k, 'model'))}
                {m !== 'free' && gb(`rt-${k}-effort`, `effort: ${ef}`, () => stepRouting(k, 'effort'))}
                {gb(`rt-${k}-cap`, `agents at once: ${cap === 0 ? 'no limit' : cap}`, () => setCap(k, c => cycle(SECTION_CAPS, c.agent_caps[k])))}
              </Box>,
            ], { color: MODEL_COLOR[m], help: ROUTING_HELP[k], extra: <Text color={MODEL_COLOR[m]}>{choice}</Text> })
          }),
          note(<Text dimColor>Haiku is not offered for coding and is refused there. An agent counts toward every section with its model and effort. A project's own .lean-gate.json overrides these.</Text>)
        )}
        {section(
          'workflow', 'Workflow and limits',
          note(<Text dimColor>agent and read limits, and a note added to every session's prompt (Edit workflow text asks Claude to write it)</Text>),
          <Box flexDirection={rowDir} gap={1} flexWrap="wrap">
            {gb('wf-agents', `max agents per turn: ${cfg.max_agents === 0 ? 'no limit' : cfg.max_agents}`, () => setMaxAgents(c => cycle(AGENT_LIMITS, c.max_agents)))}
            {gb('wf-delegate', `delegate after ${cfg.delegate_after_lead_calls} reads`, () => setNum('delegate_after_lead_calls', c => cycle(DELEGATE_AFTER, c.delegate_after_lead_calls)))}
            {gb('wf-context', `context limit ${kilo(cfg.context_limit)}`, () => setNum('context_limit', c => cycle(CONTEXT_LIMITS, c.context_limit)))}
            {gb('wf-edit', 'Edit workflow text', editWorkflow)}
          </Box>,
          note(<Text dimColor wrap="truncate-end">{cfg.workflow === '' ? 'no workflow text set' : cfg.workflow}</Text>)
        )}
        {section(
          'settings', 'Settings',
          note(<Text dimColor>presses save to the global file, or to this project's .lean-gate.json while the switch says so</Text>),
          <Box flexDirection={rowDir} gap={1} flexWrap="wrap">
            {gb('set-target', `saving to: ${b.target === 'global' ? 'global' : 'this project'}`, flipTarget, true)}
          </Box>,
          <Box flexDirection={rowDir} gap={1} flexWrap="wrap">
            {REMINDER_RULES.map(r => gb(`set-rem-${r}`, `${REMINDER_LABEL[r]}: ${cfg.reminders[r] === 'every' ? 'every turn' : 'once'}`, () => stepReminder(r)))}
          </Box>,
          <Box flexDirection={rowDir} gap={1} flexWrap="wrap">
            {gb('set-scope', `rules judge: ${cfg.scope === 'everywhere' ? 'everywhere' : 'projects only'}`, () => editConfig($, mem, 'scope', (j, c) => (j.scope = c.scope === 'everywhere' ? 'projects' : 'everywhere')))}
            {gb('set-quiet', `quiet warnings: ${cfg.quiet ? 'on' : 'off'}`, () => editConfig($, mem, 'quiet', (j, c) => (j.quiet = !c.quiet)))}
            {gb('set-panel', `panel at start: ${cfg.panel_start}`, () => editConfig($, mem, 'panel_start', (j, c) => (j.panel_start = cycle(PANEL_STARTS, c.panel_start))))}
          </Box>,
          <Box flexDirection={rowDir} gap={1} flexWrap="wrap">
            {gb('set-statefile', `state file: ${stateFile === '' ? 'HANDOFF or STATE' : stateFile}`, stepStateFile)}
            {gb('set-pr', `PR only for ${repoName}: ${cfg.pr_repos.includes(repoName) ? 'on' : 'off'}`, togglePr)}
            {gb('set-demo', `public push blocks: ${demoIndex < 0 ? 'custom pattern' : DEMO_PRESETS[demoIndex]?.label}`, stepDemo)}
          </Box>,
          <Box flexDirection={rowDir} gap={1} flexWrap="wrap">
            {gb('set-reset', 'Reset to defaults', resetSettings)}
            {canUndo && gb('set-undo', 'Undo reset', undoReset)}
            {gb('set-export', 'Export', exportSettings)}
            {canImport && gb('set-import', 'Import', importSettings)}
          </Box>
        )}
        {section(
          'helpers', 'Built-in helpers',
          note(<Text dimColor>small scripts that run on their own; each is one click</Text>),
          <Box flexDirection={rowDir} gap={1} flexWrap="wrap">
            {HELPERS.map(k => gb(`hk-${k}`, `${HELPER_LABEL[k]}: ${cfg.helpers[k] ? 'on' : 'off'}`, () => toggleHelper(k)))}
          </Box>
        )}
        {section(
          'memory', 'Project memory',
          note(<Text dimColor wrap="truncate-end">{b.memory || 'no memory for this project yet'}</Text>),
          <Box flexDirection={rowDir} gap={1} flexWrap="wrap">
            {gb('mem-remember', 'Remember', remember, true)}
            {gb('mem-recall', 'Recall', recall)}
            {gb('mem-forget', 'Forget last', forgetLast)}
            {gb('mem-auto', `automatic: ${cfg.auto_memory ? 'on' : 'off'}`, () => toggleAuto('auto_memory'))}
          </Box>,
          note(<Text dimColor>automatic: Claude records decisions and milestones by itself</Text>),
          b.memoryProjects.length > 0 && (
            <Box flexDirection={rowDir} gap={1} flexWrap="wrap">
              <Text dimColor>link to</Text>
              {b.memoryProjects.map(n => gb(`mem-link-${n}`, n, () => memShell(`lean-gate memory link ${n}`)))}
            </Box>
          )
        )}
        {section(
          'board', 'Board (how agents talk to each other)',
          ...(b.board.length === 0 ? [note(<Text dimColor>not read yet: press Refresh</Text>)] : b.board.map(l => note(<Text dimColor wrap="truncate-end">{l}</Text>))),
          <Box flexDirection={rowDir} gap={1} flexWrap="wrap">
            {gb('board-refresh', 'Refresh', () => readBoard($))}
            {gb('board-ask', 'Ask Claude to check it', askBoard)}
          </Box>
        )}
        {section(
          'lessons', 'Lessons and local rules',
          ...(b.lessons.length === 0 ? [note(<Text dimColor>not read yet: press Refresh</Text>)] : b.lessons.map(l => note(<Text dimColor wrap="truncate-end">{l}</Text>))),
          <Box flexDirection={rowDir} gap={1} flexWrap="wrap">
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
          <Box flexDirection={rowDir} gap={1} flexWrap="wrap">
            {b.release !== 'due' && gb('a-reviewed', 'Reviewed', reviewed)}
            {b.dueRepos.map(n => gb(`rv-${n}`, `Reviewed ${n}`, () => reviewChild(n)))}
          </Box>,
          b.release === 'due' && b.dueRepos.length === 0 && note(<Text dimColor>a review is due: use Review and Reviewed in the top row</Text>)
        )}
        {section(
          'ponytail', 'Ponytail',
          note(<Text dimColor wrap="truncate-end">{b.tools.find(l => l.startsWith('ponytail')) ?? 'ponytail: not read yet'}</Text>),
          <Box flexDirection={rowDir} gap={1} flexWrap="wrap">
            {gb('pt-mode', `mode: ${b.ptMode || 'off'}`, stepPonytail)}
            {gb('hk-ponytail', `hooks: ${cfg.helpers.ponytail ? 'on' : 'off'}`, () => toggleHelper('ponytail'))}
            {gb('pt-update', 'Update', runTool('ponytail', 'lean-gate vendor update ponytail', () => readTools($)))}
            {b.tools.some(l => l.startsWith('standalone')) && gb('pt-retire', 'Switch off standalone plugins', runTool('hub', 'lean-gate vendor retire', () => readTools($)))}
          </Box>,
          note(<Text dimColor>mode cycles off, lite, full, ultra (the lazy-senior-dev rules); hooks switches its startup and prompt hooks</Text>)
        )}
        {section(
          'wpdev', 'WordPress checks (performance audit, PHPCS)',
          note(<Text dimColor wrap="truncate-end">{b.tools.find(l => l.startsWith('phpcs')) ?? 'phpcs: not read yet'}</Text>),
          <Box flexDirection={rowDir} gap={1} flexWrap="wrap">
            {gb('audit-run', 'Performance audit', runTool('audit', 'lean-gate audit perf'), true)}
            {gb('phpcs-run', 'Run PHPCS', runTool('phpcs', 'lean-gate phpcs'), true)}
            {gb('phpcs-fix', 'Fix with PHPCBF', runTool('phpcbf', 'lean-gate phpcs fix'))}
            {gb('phpcs-std', `standard: ${cfg.phpcs_standard}`, stepStandard)}
            {gb('phpcs-status', 'Refresh', () => readTools($))}
          </Box>,
          note(<Text dimColor>the audit and PHPCS check the PHP files changed since the last tag; PHPCS needs PHP and Composer on this machine</Text>)
        )}
        {section(
          'packs', 'Packs (apply next session)',
          <Box flexDirection={rowDir} gap={1} flexWrap="wrap">
            {PACKS.flatMap(p => [gb(`${p}-on`, `${p} on`, () => setPack(p, 'on')), gb(`${p}-off`, `${p} off`, () => setPack(p, 'off'))])}
          </Box>,
          b.packs !== '' && note(<Text dimColor wrap="truncate-end">{b.packs}</Text>),
          note(<Text dimColor>Skill sets kept off so they cost no tokens at startup. on brings one back, off parks it. wp = WordPress skills, bricks = Bricks and BricksExtras skills, ui-ux = the UI/UX plugin.</Text>)
        )}
        {section(
          'stats', 'Rule stats (7 days)',
          b.stats.length === 0 ? note(<Text dimColor>no hits logged</Text>) : note(<Text dimColor wrap="truncate-end">{b.stats[0]}</Text>),
          ...statRows.slice(0, 5).map(statBar),
          ...(b.stats.includes('by project:') ? statsView(b.stats.slice(b.stats.indexOf('by project:'))) : []).map(l => note(<Text dimColor={!/^\d/.test(l)} wrap="truncate-end">{l}</Text>)),
          <Box flexDirection={rowDir} gap={1} flexWrap="wrap">
            {noisy !== undefined && gb('stats-off', `Turn off ${noisy[0]} (${noisy[1]} hits)`, () => editConfig($, mem, 'rules', j => (j.rules = { ...(j.rules as object), [noisy[0]]: 'off' })).then(() => readStats($)), true)}
            {gb('stats-refresh', 'Refresh', () => readStats($))}
          </Box>
        )}
        {section(
          'violations', 'Recent violations',
          note(<Text dimColor>newest first. Allow once or Block once overrides the last rule that fired, for one hit only</Text>),
          recent.length === 0 ? note(<Text dimColor>none</Text>) : recent.map(v => note(<Text wrap="truncate-end" color={v.action === 'block' ? 'error' : 'warning'}>{v.action} {v.rule} {cut(v.detail, 60)}</Text>)),
          onceRule !== undefined && (
            <Box flexDirection={rowDir} gap={1} flexWrap="wrap">
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

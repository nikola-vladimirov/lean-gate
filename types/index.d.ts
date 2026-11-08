/** "main", "free", or "<model>:<effort>" such as "opus:xhigh". */
export type LeanGateRoute = string

export type LeanGateViolation = {
  /** Epoch milliseconds. */
  at: number
  rule: string
  /** What was done about it: warn (allowed) or block (denied). */
  action: string
  detail: string
}

export type LeanGateBand = {
  details: boolean
  route: LeanGateRoute
  /** Lead-session Read/Grep/Glob calls since the last prompt, Edit, Write or Agent call. */
  run: number
  /** Per-task totals: lead Read/Grep/Glob calls and Agent (subagent) calls. */
  lead: number
  sub: number
  violations: LeanGateViolation[]
  /** Epoch milliseconds of the last state-file edit this session; 0 = none. */
  stateAt: number
  /** Epoch milliseconds of the last code-file edit this session; 0 = none. */
  codeAt: number
  tests: 'none' | 'pass' | 'fail'
  release: 'unknown' | 'due' | 'ok'
  /** Output of `lean-gate pack status`, read when the details open. */
  packs: string
  /** Output of `lean-gate memory index` for this project, and the other projects that have notes; read when the details open. */
  memory: string
  memoryProjects: string[]
  /** Immediate child repos of a non-repo cwd whose review is due; read when the details open. */
  dueRepos: string[]
  /** Lines of `lean-gate board` and `lean-gate lessons`, read when the details open. */
  board: string[]
  lessons: string[]
  /** Ponytail mode from ~/.claude/.ponytail-active, and the lines of lean-gate vendor status and phpcs status; read when the details open. */
  ptMode: string
  tools: string[]
  /** Name of the registered project the folder belongs to; empty when none. */
  proj: string
  /** True when the folder has project markers but is not in the registry. */
  projNew: boolean
  /** A registered project named in the last prompt that is not the open one. */
  projHit: { name: string; path: string } | null
  /** Ids of the details sections the person folded shut; everything else shows. */
  shut: string[]
}

declare module 'claude-code' {
  interface PluginState {
    'lean-gate': { band: LeanGateBand }
  }
}

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
  /** True when the first Edit/Write/Agent of the last turn had no routing line. */
  noRoute: boolean
  /** Output of `lean-project pack status`, read when the details open. */
  packs: string
  /** Output of `lean-project memory index` for this project, and the other projects that have notes; read when the details open. */
  memory: string
  memoryProjects: string[]
  /** Immediate child repos of a non-repo cwd whose review is due; read when the details open. */
  dueRepos: string[]
  /** Lines of `lean-project board` and `lean-project lessons`, read when the details open. */
  board: string[]
  lessons: string[]
  /** Ids of the details sections the person folded shut; everything else shows. */
  shut: string[]
}

declare module 'claude-code' {
  interface PluginState {
    'lean-project': { band: LeanGateBand }
  }
}

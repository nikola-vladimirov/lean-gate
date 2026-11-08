import { expect, mock, test } from 'claude-code/testing'
import type { EngineInterface, On, SessionMessage } from 'claude-code'

import { repoKey } from './gate'
import { lacksRoutingLine } from './register'

const CLAUDE = 'C:/home/.claude'
const TSV = `${CLAUDE}/lean-violations.tsv`
const CONFIG = `${CLAUDE}/lean-project.json`
const T0 = 'a'.repeat(40)
const T1 = 'b'.repeat(40)
const W0 = 'c'.repeat(40)

type Repo = { head: string; tree: string; workTree?: string; changed: string[]; dirty: string; untracked: string[]; branch?: string }

const slash = (p: string) => p.replaceAll('\\', '/')
const markerFile = async (repo: string) => `${CLAUDE}/lean-review/${await repoKey(repo)}.json`
const clean = (head: string, tree = T0): Repo => ({ head, tree, changed: [], dirty: '', untracked: [] })

// Stands in for the engine beneath the plugin: files, git repos and processes in memory.
// The hooks must be registered before the first `$` call, so a test changes the world through ctx.
function world(on: On, files: Record<string, string>) {
  const ctx = {
    files,
    cwd: 'C:/proj',
    cwdFails: false,
    repos: {} as Record<string, Repo>,
    dirs: {} as Record<string, string[]>,
    unreadable: new Set<string>(),
    messages: undefined as SessionMessage[] | undefined,
    toasts: [] as string[],
    git: [] as { argv: string[]; cwd: string; env?: Record<string, string> }[],
    order: [] as string[],
    noTimeout: [] as string[],
    shells: [] as string[],
    gitSilent: false,
    failing: undefined as RegExp | undefined,
    bottom: 0,
    // What `gh repo view` says about the repo: true = public.
    ghPublic: false,
    // `git describe --tags` answers this tag ('' = no tag yet); `git diff --name-only <tag>` lists repo.changed.
    lastTag: '',
  }
  mock.env(on, { HOME: 'C:/home' })
  mock.clock(on, { now: 1_700_000_000_000 })
  on('session.cwd', () => (ctx.cwdFails ? { deny: 'boom' } : { value: ctx.cwd }))
  // The engine hands paths over with backslashes on Windows.
  on('fs.exists', (_, e) => ({ value: slash(e.path) in ctx.files || slash(e.path) in ctx.dirs }))
  on('fs.read', (_, e) => {
    const p = slash(e.path)
    if (ctx.unreadable.has(p)) return { deny: 'EIO' }
    return p in ctx.files ? { value: ctx.files[p] ?? '' } : { deny: 'ENOENT' }
  })
  on('fs.write', (_, e) => {
    ctx.files[slash(e.path)] = e.text
    return { value: undefined }
  })
  on('fs.stat', () => ({ value: { kind: 'file' as const, size: 10, mtimeMs: 0, isLink: false } }))
  on('fs.list', (_, e) => ({ value: (ctx.dirs[slash(e.path)] ?? []).map(name => ({ name, kind: 'dir' as const, size: 0, mtimeMs: 0, isLink: false })) }))
  on('ui.toast', (_, e) => {
    ctx.toasts.push(e.text)
    return { value: undefined }
  })
  on('ui.invalidate', () => ({ value: undefined }))
  on('command.register', () => ({ value: { command: 'lean-gate' } }))
  on('session.messages', () => (ctx.messages ? { value: ctx.messages } : { deny: 'none' }))
  on('process.run', (_, e) => {
    const cwd = slash(e.init?.cwd ?? ctx.cwd)
    if (typeof e.init?.timeoutMs !== 'number') ctx.noTimeout.push(e.argv.join(' '))
    const done = (exitCode: number, stdout = '') => ({ value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } })
    if (e.argv[0] === 'gh') return done(0, ctx.ghPublic ? 'false\n' : 'true\n')
    if (e.argv[0] !== 'git') {
      ctx.shells.push(e.argv.join(' '))
      return done(0)
    }
    ctx.order.push('git')
    // A timeout rejects the call, as the engine does.
    if (ctx.gitSilent) return { deny: 'timeout' }
    ctx.git.push({ argv: [...e.argv], cwd, env: e.init?.env })
    // The repo is the longest known path that holds the cwd, as git finds its toplevel.
    const top = Object.keys(ctx.repos)
      .filter(k => cwd === k || cwd.startsWith(`${k}/`))
      .sort((a, b) => b.length - a.length)[0]
    const repo = top === undefined ? undefined : ctx.repos[top]
    const [, sub, a, b, c] = e.argv
    if (repo === undefined || top === undefined) return done(128)
    if (sub === 'describe') return ctx.lastTag === '' ? done(128) : done(0, `${ctx.lastTag}\n`)
    if (sub === 'rev-parse' && a === '--abbrev-ref') return done(0, `${repo.branch ?? 'main'}\n`)
    if (sub === 'diff' && a === '--name-only' && b !== undefined && b === ctx.lastTag) return done(0, repo.changed.join('\n'))
    if (sub === 'rev-parse') return done(0, `${a === '--show-toplevel' ? top : a === 'HEAD^{tree}' ? repo.tree : repo.head}\n`)
    // Real git refuses an option-shaped revision here; the mock does too.
    if (sub === 'diff' && a === '--name-only') return /^[0-9a-f]{7,64}$/.test(b ?? '') && c === 'HEAD' ? done(0, repo.changed.join('\n')) : done(129)
    if (sub === 'diff') return done(0, repo.dirty)
    if (sub === 'ls-files') return done(0, repo.untracked.join('\n'))
    if (sub === 'write-tree') return done(0, `${repo.workTree ?? repo.tree}\n`)
    return done(0)
  })
  on('tool.call', (_, e) => {
    ctx.bottom++
    return ctx.failing !== undefined && e.tool === 'Bash' && ctx.failing.test(e.command) ? { result: {}, isError: true as const } : { result: {} }
  })
  on('turn.complete', (_, e) => {
    ctx.order.push('engine')
    return { text: e.answer }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  return ctx
}

// Work the hooks leave running after they have answered.
const later = (globalThis as unknown as { setTimeout?: (fn: () => void, ms: number) => unknown }).setTimeout
const settle = async () => {
  for (let i = 0; i < 20 && later !== undefined; i++) await new Promise<void>(r => later(r, 5))
  for (let i = 0; i < 2000; i++) await Promise.resolve()
}

const config = (c: object): Record<string, string> => ({ [CONFIG]: JSON.stringify(c) })
const AGENT = { tool: 'Agent', description: 'd', prompt: 'p' } as const
const READ = { tool: 'Read', file_path: 'C:/proj/a.txt' } as const
const BASH = (command: string) => ({ tool: 'Bash', command }) as const
const EDIT = { tool: 'Edit', file_path: 'C:/proj/a.txt', old_string: 'a', new_string: 'b' } as const
const lines = (files: Record<string, string>) => (files[TSV] ?? '').split('\n').filter(Boolean)
const row = (role: 'user' | 'assistant', text: string, ids: string[] = []): SessionMessage => ({ role, text, toolUses: ids.map(id => ({ tool_use_id: id, tool: 'Edit', input: {} })) })
const DONE = { answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' } as const

test('rule 1 agent-needs-model-effort: block denies, warn allows and logs, off allows, compliant passes', async ($, on) => {
  const w = world(on, config({ mode: 'block' }))
  expect((await $.tool.call({ ...AGENT })).deny).toContain('set model and effort on every subagent (routing: read=sonnet:medium, code=sonnet:high, complex=opus:high, review=opus:high, plan=opus:high)')
  expect((await $.tool.call({ ...AGENT, model: 'sonnet' })).deny).toBeDefined()
  expect((await $.tool.call({ ...AGENT, model: 'sonnet', effort: 'medium' })).deny).toBeUndefined()
  expect(lines(w.files).length).toBe(2)
  expect(lines(w.files)[0]).toContain('\tagent-needs-model-effort\tblock\t')

  w.files = config({ mode: 'warn' })
  expect((await $.tool.call({ ...AGENT })).deny).toBeUndefined()
  expect(lines(w.files)[0]).toContain('\tagent-needs-model-effort\twarn\t')
  expect((await $.tool.call({ ...AGENT })).deny).toBeUndefined()
  expect(lines(w.files).length).toBe(2)
  // The same rule toasts once per turn, not once per call.
  expect(w.toasts.filter(t => t.includes('agent-needs-model-effort')).length).toBe(1)

  w.files = config({ mode: 'off' })
  expect((await $.tool.call({ ...AGENT })).deny).toBeUndefined()
  expect(lines(w.files).length).toBe(0)
})

test('rule 2 no-haiku-coding', async ($, on) => {
  const w = world(on, config({ mode: 'block' }))
  expect((await $.tool.call({ ...AGENT, model: 'haiku', effort: 'low' })).deny).toContain('Haiku')
  expect((await $.tool.call({ ...AGENT, model: 'sonnet', effort: 'low' })).deny).toBeUndefined()
  w.files = config({ mode: 'warn' })
  expect((await $.tool.call({ ...AGENT, model: 'haiku', effort: 'low' })).deny).toBeUndefined()
  expect(lines(w.files)[0]).toContain('\tno-haiku-coding\twarn\t')
  w.files = config({ mode: 'off' })
  expect((await $.tool.call({ ...AGENT, model: 'haiku', effort: 'low' })).deny).toBeUndefined()
})

test('rule 3 free-opencode-only', async ($, on) => {
  const w = world(on, config({ mode: 'block' }))
  expect((await $.tool.call(BASH('opencode run -m opencode/grok-code "x"'))).deny).toContain('free model')
  expect((await $.tool.call(BASH('opencode run "x"'))).deny).toBeDefined()
  expect((await $.tool.call(BASH('timeout 9 opencode run -m x:free "x"'))).deny).toBeDefined()
  expect((await $.tool.call(BASH('npx opencode-ai run -m paid "x"'))).deny).toBeDefined()
  for (const c of ['opencode run -m opencode/x-free "x"', 'opencode --version', 'opencode models', 'opencode export abc/def', 'ls', 'git commit -m "opencode run -m paid"']) {
    expect((await $.tool.call(BASH(c))).deny).toBeUndefined()
  }
  w.files = config({ mode: 'warn' })
  expect((await $.tool.call(BASH('opencode run -m paid "x"'))).deny).toBeUndefined()
  expect(lines(w.files)[0]).toContain('\tfree-opencode-only\twarn\t')
  w.files = config({ mode: 'off' })
  expect((await $.tool.call(BASH('opencode run -m paid "x"'))).deny).toBeUndefined()
})

const REAL = ['git tag v1.0.0', 'git -C C:/proj push origin --tags', 'git push origin v1.0.0', 'gh release create v1', 'php nashenski-tools/zip.php', 'cd C:/proj && git push --follow-tags', 'bash -lc "git tag v2"', 'git push origin "v$VER"']
const NOT_RELEASE = ['git tag -l', 'git tag --list "v*"', 'git commit -m "git tag v1 and gh release create"', 'git add zip.php', 'php -l nashenski-tools/zip.php', 'gh release list', 'gh release view v1', 'git push origin main', 'git push --delete origin v1', 'git status']

// A review of the repo as it stands at `head`, the way the Reviewed button would have stored it.
const reviewed = async (w: ReturnType<typeof world>, repo: string, v: { sha: string; tree?: string; fp?: string }) => {
  w.files[await markerFile(repo)] = JSON.stringify({ repo, sha: v.sha, tree: v.tree ?? '', fp: v.fp ?? '', at: 1 })
}

test('rule 4 release-needs-review: real release actions are denied until the repo is reviewed, other commands pass', async ($, on) => {
  const w = world(on, config({ mode: 'block' }))
  w.repos['C:/proj'] = clean('aaaaaaa1')
  for (const c of REAL) expect((await $.tool.call(BASH(c))).deny).toContain('review the changed code')
  for (const c of NOT_RELEASE) expect((await $.tool.call(BASH(c))).deny).toBeUndefined()

  // Reviewed clean at aaaaaaa1: docs-only commits pass, committed or uncommitted code changes do not.
  await reviewed(w, 'C:/proj', { sha: 'aaaaaaa1', tree: T0 })
  w.repos['C:/proj'] = { ...clean('bbbbbbb2', T1), changed: ['README.md'], untracked: ['notes.txt'] }
  for (const c of REAL) expect((await $.tool.call(BASH(c))).deny).toBeUndefined()
  w.repos['C:/proj'] = { ...clean('bbbbbbb2', T1), changed: ['README.md', 'src/a.php'] }
  expect((await $.tool.call(BASH('git tag v1'))).deny).toBeDefined()
  w.repos['C:/proj'] = { ...clean('bbbbbbb2', T1), untracked: ['new/tool.js'] }
  expect((await $.tool.call(BASH('git tag v1'))).deny).toBeDefined()
  w.repos['C:/proj'] = { ...clean('aaaaaaa1'), dirty: 'diff --git a/src/a.php b/src/a.php' }
  expect((await $.tool.call(BASH('git tag v1'))).deny).toBeDefined()

  // A marker that names another repo is not this repo's review.
  w.repos['C:/proj'] = clean('aaaaaaa1')
  await reviewed(w, 'C:/elsewhere', { sha: 'aaaaaaa1', tree: T0 })
  w.files[await markerFile('C:/proj')] = JSON.stringify({ repo: 'C:/elsewhere', sha: 'aaaaaaa1', tree: T0, fp: '', at: 1 })
  expect((await $.tool.call(BASH('git tag v1'))).deny).toBeDefined()

  // warn mode allows and logs
  w.files = { ...config({ mode: 'warn' }) }
  expect((await $.tool.call(BASH('git tag v1'))).deny).toBeUndefined()
  expect(lines(w.files).at(-1)).toContain('\trelease-needs-review\twarn\t')
  expect(w.noTimeout).toEqual([])
})

test('rule 4: an option-shaped sha in the marker is never passed to git', async ($, on) => {
  const w = world(on, config({ mode: 'block' }))
  w.repos['C:/proj'] = clean('aaaaaaa1')
  for (const sha of ['--output=C:/evil.txt', '-p', 'abc', 'zzzzzzzz', 'abc; rm -rf x']) {
    await reviewed(w, 'C:/proj', { sha, tree: T0 })
    expect((await $.tool.call(BASH('git tag v1'))).deny).toBeDefined()
  }
  expect(w.git.some(g => g.argv.some(a => a.includes('--output') || a === '-p'))).toBe(false)
  expect(w.git.some(g => g.argv[1] === 'diff')).toBe(false)
})

test('rule 4: an unknown repo is denied in block mode with a hint, allowed and logged in warn mode', async ($, on) => {
  const w = world(on, config({ mode: 'block' }))
  w.cwd = 'C:/other'
  w.repos['C:/proj'] = clean('aaaaaaa1')
  await reviewed(w, 'C:/proj', { sha: 'aaaaaaa1', tree: T0 })
  expect((await $.tool.call(BASH('git tag v1'))).deny).toContain('release action with unknown repo: use `git -C <dir> ...` or `cd <dir> &&` in the same command')
  expect((await $.tool.call(BASH('git -C C:/nowhere push --tags'))).deny).toBeDefined()
  // Naming the repo in the same command is the way through.
  expect((await $.tool.call(BASH('git -C C:/proj tag v1'))).deny).toBeUndefined()
  expect((await $.tool.call(BASH('cd C:/proj && git tag v1'))).deny).toBeUndefined()
  expect((await $.tool.call(BASH('cd "C:/proj" && gh release create v1'))).deny).toBeUndefined()

  w.files = { ...config({ mode: 'warn' }), [await markerFile('C:/proj')]: w.files[await markerFile('C:/proj')] ?? '' }
  expect((await $.tool.call(BASH('git tag v1'))).deny).toBeUndefined()
  expect(lines(w.files).at(-1)).toContain('\trelease-needs-review\twarn\trepo unknown')
  expect(w.noTimeout).toEqual([])
})

test('rule 4: git not answering fails open, even in block mode', async ($, on) => {
  const w = world(on, config({ mode: 'block' }))
  w.repos['C:/proj'] = clean('aaaaaaa1')
  w.gitSilent = true
  expect((await $.tool.call(BASH('git tag v1'))).deny).toBeUndefined()
  expect(lines(w.files).at(-1)).toContain('\trelease-needs-review\twarn\tgit did not answer')
})

const BAND = {
  plugin: 'lean-project',
  component: 'Pane',
  requestId: 'lean-gate',
  props: { title: 'lean-gate', isFocused: false, bodyColumns: 40, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const

test('Reviewed in a subfolder of a repo marks the repo, and the release then passes', async ($, on) => {
  const w = world(on, config({ mode: 'block' }))
  w.cwd = 'C:/proj/sub'
  w.repos['C:/proj'] = clean('aaaaaaa1')
  expect((await $.tool.call(BASH('git tag v1'))).deny).toBeDefined()
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'details' })
  await ui.press({ key: 'a-reviewed' })
  expect(w.toasts.at(-1)).toBe('Marked reviewed: proj')
  expect(JSON.parse(w.files[await markerFile('C:/proj')] ?? '{}')).toMatchObject({ repo: 'C:/proj', sha: 'aaaaaaa1', tree: T0, fp: '' })
  expect((await $.tool.call(BASH('git tag v1'))).deny).toBeUndefined()
  // Nothing was written inside a repo, and git's private index was used for the tree.
  expect(Object.keys(w.files).some(f => f.endsWith('.lean-review-ok'))).toBe(false)
  expect(w.git.some(g => g.argv[1] === 'add' && g.env?.GIT_INDEX_FILE?.includes('lean-review'))).toBe(true)
  expect(w.noTimeout).toEqual([])
  await ui.unmount()
})

test('Reviewed with uncommitted code clears the review; committing the same content afterwards does not bring it back', async ($, on) => {
  const w = world(on, config({ mode: 'block' }))
  const dirty = 'diff --git a/src/a.php b/src/a.php'
  w.repos['C:/proj'] = { ...clean('aaaaaaa1'), workTree: W0, dirty, untracked: ['new.js'] }
  expect((await $.tool.call(BASH('git tag v1'))).deny).toBeDefined()
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'details' })
  await ui.press({ key: 'a-reviewed' })
  expect(JSON.parse(w.files[await markerFile('C:/proj')] ?? '{}')).toMatchObject({ sha: 'aaaaaaa1', tree: W0 })
  expect((await $.tool.call(BASH('git tag v1'))).deny).toBeUndefined()

  // More edits after the review: due again, and back to clear when they are undone.
  w.repos['C:/proj'] = { ...clean('aaaaaaa1'), workTree: W0, dirty: `${dirty}\n+more`, untracked: ['new.js'] }
  expect((await $.tool.call(BASH('git tag v1'))).deny).toBeDefined()
  w.repos['C:/proj'] = { ...clean('aaaaaaa1'), workTree: W0, dirty, untracked: ['new.js'] }
  expect((await $.tool.call(BASH('git tag v1'))).deny).toBeUndefined()

  // Committed exactly what was reviewed: HEAD's tree is the reviewed tree and nothing is left over.
  w.repos['C:/proj'] = { ...clean('ccccccc3', W0), changed: ['src/a.php', 'new.js'] }
  expect((await $.tool.call(BASH('git tag v1'))).deny).toBeUndefined()
  // Committed something else.
  w.repos['C:/proj'] = { ...clean('ddddddd4', T1), changed: ['src/a.php', 'new.js'] }
  expect((await $.tool.call(BASH('git tag v1'))).deny).toBeDefined()
  await ui.unmount()
})

test('Reviewed in a folder that is not a repo marks nothing; Details lists the due child repos with their own buttons', async ($, on) => {
  const w = world(on, config({ mode: 'warn' }))
  w.cwd = 'C:/ws'
  w.dirs['C:/ws'] = ['alpha', 'beta', 'docs', '.hidden']
  w.repos['C:/ws/alpha'] = clean('aaaaaaa1')
  w.repos['C:/ws/beta'] = clean('bbbbbbb2')
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'details' })
  expect(await ui.find({ key: 'rv-alpha' })).toBeDefined()
  expect(await ui.find({ key: 'rv-beta' })).toBeDefined()
  expect(await ui.find({ key: 'rv-docs' })).toBeUndefined()
  await ui.press({ key: 'a-reviewed' })
  expect(w.toasts.at(-1)).toBe('cd into a repo, or use a per-repo button in Details')
  expect(Object.keys(w.files).some(f => f.includes('lean-review'))).toBe(false)

  await ui.press({ key: 'rv-alpha' })
  expect(w.toasts.at(-1)).toBe('Marked reviewed: alpha')
  expect(JSON.parse(w.files[await markerFile('C:/ws/alpha')] ?? '{}')).toMatchObject({ repo: 'C:/ws/alpha', sha: 'aaaaaaa1' })
  expect(w.files[await markerFile('C:/ws/beta')]).toBeUndefined()
  expect(await ui.find({ key: 'rv-alpha' })).toBeUndefined()
  expect(await ui.find({ key: 'rv-beta' })).toBeDefined()
  expect(w.noTimeout).toEqual([])
  await ui.unmount()
})

test('the compact row shows review due with its buttons, and Reviewed turns it into reviewed', async ($, on) => {
  const w = world(on, config({ mode: 'warn' }))
  w.repos['C:/proj'] = clean('aaaaaaa1')
  await $.turn.complete({ ...DONE })
  await settle()
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /review due/ })).toBeDefined()
  expect(await ui.find({ key: 'review' })).toBeDefined()
  await ui.press({ key: 'reviewed' })
  expect(w.toasts.at(-1)).toBe('Marked reviewed: proj')
  expect(await ui.find({ type: 'Text', text: /review due/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^reviewed$/ })).toBeDefined()
  await ui.unmount()
})

test('rule 8 delegate-more: only Read, Grep and Glob count; the next one is denied; Edit, Write, Agent reset', async ($, on) => {
  const w = world(on, config({ mode: 'block', delegate_after_lead_calls: 2, rules: { 'delegate-more': 'block' } }))
  for (let i = 0; i < 5; i++) expect((await $.tool.call(BASH('ls'))).deny).toBeUndefined()
  expect((await $.tool.call(READ)).deny).toBeUndefined()
  expect((await $.tool.call({ tool: 'Grep', pattern: 'x' })).deny).toBeUndefined()
  expect((await $.tool.call(READ)).deny).toContain('delegate bulk reading to a subagent (sonnet:medium), then continue')
  expect((await $.tool.call({ tool: 'Glob', pattern: '*' })).deny).toBeDefined()
  expect((await $.tool.call(BASH('ls'))).deny).toBeUndefined()
  expect((await $.tool.call(EDIT)).deny).toBeUndefined()
  // The Edit reset the counter.
  expect((await $.tool.call(READ)).deny).toBeUndefined()
  expect((await $.tool.call(READ)).deny).toBeUndefined()
  expect((await $.tool.call(READ)).deny).toBeDefined()
  expect((await $.tool.call({ ...AGENT, model: 'sonnet', effort: 'medium' })).deny).toBeUndefined()
  expect((await $.tool.call(READ)).deny).toBeUndefined()
  await $.tool.call({ tool: 'Write', file_path: 'C:/proj/b.txt', content: 'x' })
  expect((await $.tool.call(READ)).deny).toBeUndefined()
  expect((await $.tool.call(READ)).deny).toBeUndefined()
  expect((await $.tool.call(READ)).deny).toBeDefined()
  expect(lines(w.files).some(l => l.includes('\tdelegate-more\tblock\t'))).toBe(true)
})

test('rule 8: an Agent call that rule 1 denies does not reset the counter', async ($, on) => {
  world(on, config({ mode: 'block', delegate_after_lead_calls: 2, rules: { 'delegate-more': 'block' } }))
  expect((await $.tool.call(READ)).deny).toBeUndefined()
  expect((await $.tool.call(READ)).deny).toBeUndefined()
  expect((await $.tool.call({ ...AGENT })).deny).toBeDefined()
  expect((await $.tool.call(READ)).deny).toBeDefined()
  expect((await $.tool.call({ ...AGENT, model: 'sonnet', effort: 'medium' })).deny).toBeUndefined()
  expect((await $.tool.call(READ)).deny).toBeUndefined()
})

test('rule 8: parallel Read calls are each counted once', async ($, on) => {
  world(on, config({ mode: 'block', delegate_after_lead_calls: 3, rules: { 'delegate-more': 'block' } }))
  const results = await Promise.all(Array.from({ length: 6 }, () => $.tool.call(READ)))
  expect(results.filter(r => r.deny === undefined).length).toBe(3)
  expect(results.filter(r => r.deny !== undefined).length).toBe(3)
})

test('rule 8 delegate-more: warn toasts once at the threshold and allows', async ($, on) => {
  const w = world(on, config({ mode: 'warn', delegate_after_lead_calls: 2 }))
  for (let i = 0; i < 5; i++) expect((await $.tool.call(READ)).deny).toBeUndefined()
  expect(w.toasts.filter(t => t.includes('delegate-more')).length).toBe(1)
  expect(lines(w.files).filter(l => l.includes('\tdelegate-more\twarn\t')).length).toBe(1)
})

test('phpcs-before-done: PHP edited and no PHPCS run is logged at turn end, a PHPCS run clears it', async ($, on) => {
  const w = world(on, config({ mode: 'warn', rules: { 'lean-project-first': 'off', 'ponytail-active': 'off', 'wp-skills-for-wp-code': 'off', 'state-file-fresh': 'off', 'tests-before-done': 'off' } }))
  await $.tool.call({ tool: 'Edit', file_path: 'C:/proj/src/a.php', old_string: 'a', new_string: 'b' })
  await $.turn.complete({ ...DONE })
  await settle()
  expect(lines(w.files).map(l => l.split('	')[2])).toContain('phpcs-before-done')
  const before = lines(w.files).length
  await $.tool.call({ tool: 'Edit', file_path: 'C:/proj/src/a.php', old_string: 'a', new_string: 'b' })
  await $.tool.call(BASH('lean-project phpcs'))
  await $.turn.complete({ ...DONE })
  await settle()
  expect(lines(w.files).length).toBe(before)
})

test('rules 6 and 7 at turn.complete: code edited with no state file and no test run', async ($, on) => {
  // The session-fact rules would log a row per PHP edit here; they have their own test.
  const w = world(on, config({ mode: 'warn', rules: { 'lean-project-first': 'off', 'ponytail-active': 'off', 'wp-skills-for-wp-code': 'off', 'phpcs-before-done': 'off' } }))
  await $.tool.call({ tool: 'Edit', file_path: 'C:\\proj\\src\\a.php', old_string: 'a', new_string: 'b' })
  await $.turn.complete({ ...DONE })
  await settle()
  const rules = lines(w.files).map(l => l.split('\t')[2])
  expect(rules).toContain('state-file-fresh')
  expect(rules).toContain('tests-before-done')
  expect(w.toasts.length).toBeGreaterThan(0)

  // A turn that touches the state file and runs a test adds nothing.
  const before = lines(w.files).length
  await $.tool.call({ tool: 'Edit', file_path: 'C:/proj/src/a.php', old_string: 'a', new_string: 'b' })
  await $.tool.call({ tool: 'Write', file_path: 'C:/proj/docs/HANDOFF.md', content: 'x' })
  await $.tool.call(BASH('npm test'))
  await $.turn.complete({ ...DONE, turnId: 't2' })
  await settle()
  expect(lines(w.files).length).toBe(before)

  // Only text edited: nothing to report.
  await $.tool.call({ tool: 'Edit', file_path: 'C:/proj/notes.md', old_string: 'a', new_string: 'b' })
  await $.turn.complete({ ...DONE, turnId: 't3' })
  await settle()
  expect(lines(w.files).length).toBe(before)

  // Lint, typecheck and commands that only mention a test file or config are not a test run.
  await $.tool.call({ tool: 'Write', file_path: 'C:/proj/docs/STATE.md', content: 'x' })
  await $.tool.call({ tool: 'Edit', file_path: 'C:/proj/src/a.php', old_string: 'a', new_string: 'b' })
  await $.tool.call(BASH('php -l src/a.php && npx tsc --noEmit && cat tsconfig.json tests/foo.php'))
  await $.turn.complete({ ...DONE, turnId: 't4' })
  await settle()
  expect(lines(w.files).at(-1)).toContain('\ttests-before-done\twarn\t')
})

test('turn.complete answers before any git work or turn-end rule runs', async ($, on) => {
  const w = world(on, config({ mode: 'warn' }))
  w.repos['C:/proj'] = clean('aaaaaaa1')
  await $.tool.call({ tool: 'Edit', file_path: 'C:/proj/src/a.php', old_string: 'a', new_string: 'b' })
  w.order.length = 0
  await $.turn.complete({ ...DONE })
  await settle()
  expect(w.order[0]).toBe('engine')
  expect(w.order.includes('git')).toBe(true)
})

test('a failing test command still counts as a test run and shows as tests fail', async ($, on) => {
  const w = world(on, config({ mode: 'warn' }))
  w.failing = /npm test/
  await $.tool.call({ tool: 'Edit', file_path: 'C:/proj/src/a.php', old_string: 'a', new_string: 'b' })
  await $.tool.call({ tool: 'Write', file_path: 'C:/proj/docs/HANDOFF.md', content: 'x' })
  expect((await $.tool.call(BASH('npm test'))).isError).toBe(true)
  await $.turn.complete({ ...DONE })
  await settle()
  expect(lines(w.files).some(l => l.includes('tests-before-done'))).toBe(false)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /tests fail/ })).toBeDefined()
  expect(await ui.find({ key: 'tests' })).toBeDefined()
  await ui.unmount()
})

test('session.start trims the violation log to its last 500 lines, after the session has started', async ($, on) => {
  const w = world(on, config({ mode: 'warn' }))
  w.files[TSV] = `${Array.from({ length: 600 }, (_, i) => `row ${i + 1}`).join('\n')}\n`
  await $.session.start({ cwd: 'C:/proj', surface: 'terminal', isInteractive: true })
  await settle()
  const kept = lines(w.files)
  expect(kept.length).toBe(500)
  expect(kept[0]).toBe('row 101')
  expect(kept.at(-1)).toBe('row 600')
})

test('config: a project file tunes rules over the global one (but not the mode), and bad JSON falls back to defaults', async ($, on) => {
  const w = world(on, { ...config({ mode: 'block' }), 'C:/proj/.lean-project.json': '{"mode":"off","rules":{"agent-needs-model-effort":"off"}}' })
  expect((await $.tool.call({ ...AGENT })).deny).toBeUndefined()
  expect(lines(w.files).length).toBe(0)
  // The project's mode is ignored: another rule is still enforced.
  expect((await $.tool.call({ ...AGENT, model: 'haiku', effort: 'low' })).deny).toContain('Haiku')

  w.files = { [CONFIG]: '{ nope', 'C:/proj/.lean-project.json': '[]' }
  expect((await $.tool.call({ ...AGENT })).deny).toBeUndefined()
  expect(lines(w.files)[0]).toContain('\tagent-needs-model-effort\twarn\t')
})

test('config: an unreadable or invalid global file is never overwritten by the band', async ($, on) => {
  const w = world(on, { [CONFIG]: '{ nope' })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'mode' })
  expect(w.files[CONFIG]).toBe('{ nope')
  expect(w.toasts.at(-1)).toBe('lean-gate: global config unreadable, not changed')

  w.files[CONFIG] = '["not an object"]'
  await ui.press({ key: 'mode' })
  expect(w.files[CONFIG]).toBe('["not an object"]')

  w.files[CONFIG] = JSON.stringify({ mode: 'warn', custom: { keep: 1 } })
  w.unreadable.add(CONFIG)
  w.toasts.length = 0
  await ui.press({ key: 'mode' })
  expect(JSON.parse(w.files[CONFIG] ?? '{}')).toEqual({ mode: 'warn', custom: { keep: 1 } })
  expect(w.toasts.at(-1)).toContain('unreadable')

  // Readable again: the change lands and the unknown key stays.
  w.unreadable.clear()
  await ui.press({ key: 'mode' })
  expect(JSON.parse(w.files[CONFIG] ?? '{}')).toEqual({ mode: 'block', custom: { keep: 1 } })

  // A missing file is fine: it is created.
  delete w.files[CONFIG]
  await ui.press({ key: 'mode' })
  expect(JSON.parse(w.files[CONFIG] ?? '{}').mode).toBe('block')
  await ui.unmount()
})

test('a hook that throws still lets the call through', async ($, on) => {
  const w = world(on, config({ mode: 'block' }))
  w.cwdFails = true
  const r = await $.tool.call({ ...AGENT })
  expect(r.deny).toBeUndefined()
  expect(w.bottom).toBe(1)
})

test('rule 5 routing-line: judged only when the call row is stored, and only on this turn', async ($, on) => {
  const w = world(on, config({ mode: 'warn' }))
  const user = row('user', 'go')
  const check = (rows: SessionMessage[]) => {
    // Only $.session.messages() is used, so a stub stands in for the engine interface.
    const stub = { session: { messages: async () => rows } } as unknown as EngineInterface
    return lacksRoutingLine(stub, 'u1')
  }
  expect(await check([user, row('assistant', 'Routing: read=sonnet', ['u1'])])).toBe(false)
  expect(await check([user, row('assistant', 'working on it', ['u1'])])).toBe(true)
  // A routing line earlier in the same turn counts; tool results are user rows and do not end the turn.
  const result: SessionMessage = { role: 'user', text: '', toolUses: [], toolResults: [{ tool_use_id: 'u0', text: 'ok', isError: false, result: null }] }
  expect(await check([user, row('assistant', 'routing: x', ['u0']), result, row('assistant', '', ['u1'])])).toBe(false)
  // The previous turn's routing line does not.
  expect(await check([row('assistant', 'Routing: x'), user, row('assistant', 'working', ['u1'])])).toBe(true)
  // The call's own row is not in the transcript yet: no verdict.
  expect(await check([user, row('assistant', 'working', ['u0'])])).toBe(false)
  // End to end: the engine passes the given tool_use_id on, and the transcript row of that call has no routing line.
  const flagged = () => lines(w.files).filter(l => l.includes('	routing-line	warn	')).length
  w.messages = [user, row('assistant', 'working', ['u1'])]
  await $.tool.call({ ...EDIT, tool_use_id: 'u1' })
  expect(flagged()).toBe(1)
  // An Edit that follows in the same turn is not judged again.
  w.messages = [user, row('assistant', 'still working', ['u2'])]
  await $.tool.call({ ...EDIT, tool_use_id: 'u2' })
  expect(flagged()).toBe(1)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /no route/ })).toBeDefined()
  await ui.unmount()
  // Next turn, with the routing line in place: no new violation.
  await $.turn.complete({ ...DONE })
  await settle()
  w.messages = [user, row('assistant', 'Routing: read=sonnet', ['u3'])]
  await $.tool.call({ ...EDIT, tool_use_id: 'u3' })
  expect(flagged()).toBe(1)
  // And a later turn without it is flagged again.
  await $.turn.complete({ ...DONE })
  await settle()
  w.messages = [user, row('assistant', 'no line here', ['u4'])]
  await $.tool.call({ ...EDIT, tool_use_id: 'u4' })
  expect(flagged()).toBe(2)
})

test('band state stored by an older version loads without throwing or NaN', async ($, on) => {
  const w = world(on, config({ mode: 'warn' }))
  on('state.get', (_, e) => ({
    value: e.key === 'band' ? { value: { run: 'x', lead: Number.NaN, sub: Infinity, route: 'zzz', tests: 5, violations: 'nope', dueRepos: 7, stateAt: null, details: 'yes' }, version: 1 } : { value: undefined, version: 0 },
  }))
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /lead 0 \/ sub 0/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /NaN|undefined/ })).toBeUndefined()
  await ui.unmount()
  // Counting on top of it still works.
  expect((await $.tool.call(READ)).deny).toBeUndefined()
  expect(w.bottom).toBe(1)
})

test('the band renders compact and with details, and its buttons write the global config', async ($, on) => {
  const w = world(on, config({ mode: 'warn' }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 1000000, tokens: 250000 }, rateLimits: [] } }))
  for (const surface of ['terminal', 'desktop'] as const) {
    w.files[CONFIG] = JSON.stringify({ mode: 'warn' })
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /lead \d+ \/ sub \d+/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /250k\/300k/ })).toBeDefined()
    await ui.press({ key: 'mode' })
    expect(JSON.parse(w.files[CONFIG] ?? '{}').mode).toBe('block')
    await ui.press({ key: 'details' })
    expect(await ui.find({ type: 'Text', text: /press a level/ })).toBeDefined()
    await ui.press({ key: 'sec-rules' })
    expect(await ui.find({ type: 'Text', text: /press a level/ })).toBeUndefined()
    await ui.press({ key: 'sec-rules' })
    await ui.press({ key: 'rule-no-haiku-coding' })
    expect(JSON.parse(w.files[CONFIG] ?? '{}').rules['no-haiku-coding']).toBe('off')
    await ui.press({ key: 'details' })
    await ui.unmount()
  }
  expect(w.noTimeout).toEqual([])
})

test('a closed panel leaves an Open button above the prompt that reopens it', async ($, on) => {
  world(on, {})
  const opened: string[] = []
  on('ui.open', (_, e) => {
    opened.push(e.id)
    return { isPlaced: true }
  })
  const ui = await $.ui.mount({ plugin: 'lean-project', component: 'AbovePrompt', surface: 'terminal', props: { hasSurvey: false, isWorking: false, maxRows: 30, bodyColumns: 110, scroll: { offset: 0, bodyRows: 20 }, view: {} } })
  await ui.press({ key: 'open-panel' })
  await settle()
  expect(opened).toEqual(['lean-gate'])
  await ui.unmount()
})

// ---- Rules from the recurring reminders, and the rule builder.

const DASH = String.fromCharCode(0x2014)
const blockOnly = (rule: string, extra: object = {}) => config({ mode: 'block', rules: { [rule]: 'block' }, ...extra })

test('no-em-dashes: file text and commit messages are refused, other commands and clean text pass', async ($, on) => {
  const w = world(on, blockOnly('no-em-dashes'))
  expect((await $.tool.call({ tool: 'Write', file_path: 'C:/proj/a.txt', content: `a ${DASH} b` })).deny).toContain('no em dashes')
  expect((await $.tool.call({ ...EDIT, new_string: `x${DASH}y` })).deny).toContain('no em dashes')
  expect((await $.tool.call(BASH(`git commit -m "fix ${DASH} thing"`))).deny).toContain('no em dashes')
  expect((await $.tool.call(BASH(`echo ${DASH}`))).deny).toBeUndefined()
  expect((await $.tool.call({ ...EDIT, new_string: 'x-y' })).deny).toBeUndefined()
  expect(lines(w.files).at(-1)).toContain('\tno-em-dashes\tblock\t')
})

test('lean-project-first, ponytail-active and wp-skills-for-wp-code judge code edits by session facts', async ($, on) => {
  const w = world(on, blockOnly('lean-project-first', { rules: { 'lean-project-first': 'block', 'ponytail-active': 'block', 'wp-skills-for-wp-code': 'block' } }))
  const PHP = { tool: 'Edit', file_path: 'C:/proj/a.php', old_string: 'a', new_string: 'b' } as const
  w.files[`${CLAUDE}/.ponytail-active`] = 'full'
  expect((await $.tool.call({ ...PHP })).deny).toContain('lean-project skill')
  expect((await $.tool.call({ ...EDIT, file_path: 'C:/proj/notes.md' })).deny).toBeUndefined()
  await $.tool.call({ tool: 'Skill', skill: 'lean-project:lean-project' } as never)
  expect((await $.tool.call({ ...PHP })).deny).toBeUndefined()

  w.files[`${CLAUDE}/.ponytail-active`] = 'off'
  expect((await $.tool.call({ ...PHP })).deny).toContain('ponytail')
  w.files[`${CLAUDE}/.ponytail-active`] = 'full'

  const WP = { ...PHP, new_string: "add_action( 'init', 'x' );" }
  expect((await $.tool.call(WP)).deny).toContain('wp-* skills')
  expect((await $.tool.call({ ...PHP, file_path: 'C:/site/wp-content/plugins/p/p.php' })).deny).toContain('wp-* skills')
  await $.tool.call({ tool: 'Skill', skill: 'wp-plugin-development' } as never)
  expect((await $.tool.call(WP)).deny).toBeUndefined()
})

test('review-edited-files-only: a review agent must be scoped to files', async ($, on) => {
  world(on, blockOnly('review-edited-files-only'))
  const ok = { model: 'opus', effort: 'high' }
  expect((await $.tool.call({ ...AGENT, ...ok, description: 'Review code', prompt: 'review the whole plugin' })).deny).toContain('scope the review')
  expect((await $.tool.call({ ...AGENT, ...ok, description: 'Review code', prompt: 'review src/a.php and src/b.php' })).deny).toBeUndefined()
  expect((await $.tool.call({ ...AGENT, ...ok, description: 'Review', prompt: 'audit; scope: lean-project review-scope output' })).deny).toBeUndefined()
  expect((await $.tool.call({ ...AGENT, ...ok, description: 'Find files', prompt: 'list the routes' })).deny).toBeUndefined()
})

test('distinctive-session-names: a new session title must start with a date and time', async ($, on) => {
  world(on, blockOnly('distinctive-session-names'))
  const S = (extra: object) => ({ tool: 'mcp__ccd_session__start_session', ...extra }) as never
  expect((await $.tool.call(S({ title: 'Fix the panel' }))).deny).toContain('date and time')
  expect((await $.tool.call(S({}))).deny).toContain('date and time')
  expect((await $.tool.call(S({ title: '2026-11-07 14:30 Fix the panel' }))).deny).toBeUndefined()
  expect((await $.tool.call(S({ title: '14:30 07-11-2026 Fix the panel' }))).deny).toBeUndefined()
  expect((await $.tool.call(S({ title: '07-11-2026 Fix the panel' }))).deny).toContain('date and time')
  expect((await $.tool.call(S({ proposal_id: 'task_1' }))).deny).toBeUndefined()
  expect((await $.tool.call({ tool: 'mcp__ccd_session__hand_off_to_session', title: 'Move it' } as never)).deny).toContain('date and time')
})

test('no-demo-files-public: a push to a public repo is refused when demo files would go, a private one is not', async ($, on) => {
  const w = world(on, blockOnly('no-demo-files-public'))
  w.repos['C:/proj'] = { ...clean('aaaaaaa1'), untracked: ['README.md', 'demo/shot.png'] }
  w.ghPublic = true
  expect((await $.tool.call(BASH('git push origin main'))).deny).toContain('demo or scratch files')
  expect((await $.tool.call(BASH('git status'))).deny).toBeUndefined()
  expect((await $.tool.call(BASH('git push --delete origin old'))).deny).toBeUndefined()
  w.ghPublic = false
  expect((await $.tool.call(BASH('git push origin main'))).deny).toBeUndefined()
  w.ghPublic = true
  w.repos['C:/proj'] = { ...clean('aaaaaaa1'), untracked: ['README.md', 'CHANGELOG.md'] }
  expect((await $.tool.call(BASH('git push origin main'))).deny).toBeUndefined()
})

test('custom rules: a matching call is refused, malformed entries are ignored, a rule button cycles its level', async ($, on) => {
  const w = world(
    on,
    config({
      mode: 'block',
      custom_rules: [
        { id: 'no-sudo', tool: 'Bash', match: String.raw`\bsudo\b`, message: 'no sudo here', level: 'block' },
        { id: 'bad-regex', tool: 'Bash', match: '(', level: 'block' },
        { id: 'no-haiku-coding', tool: 'Bash', match: '.', level: 'block' },
        { id: 'edit-todo', tool: 'Edit|Write', match: 'TODO', level: 'warn' },
      ],
    })
  )
  expect((await $.tool.call(BASH('sudo rm x'))).deny).toContain('no sudo here')
  expect((await $.tool.call(BASH('ls'))).deny).toBeUndefined()
  // A warn-level custom rule allows the call and logs it.
  expect((await $.tool.call({ ...EDIT, new_string: 'TODO fix' })).deny).toBeUndefined()
  expect(lines(w.files).some(l => l.includes('\tedit-todo\twarn\t'))).toBe(true)
  expect(lines(w.files).some(l => l.includes('\tbad-regex\t'))).toBe(false)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'details' })
  expect(await ui.find({ key: 'rule-no-sudo' })).toBeDefined()
  await ui.press({ key: 'rule-no-sudo' })
  expect(JSON.parse(w.files[CONFIG] ?? '{}').rules['no-sudo']).toBe('off')
  expect((await $.tool.call(BASH('sudo rm x'))).deny).toBeUndefined()
  await ui.unmount()
})

test('rule builder: pick a pattern and level, Add writes the rule, Remove deletes it', async ($, on) => {
  const w = world(on, config({ mode: 'block' }))
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'details' })
  await ui.press({ key: 'rb-pattern' })
  await ui.press({ key: 'rb-level' })
  await ui.press({ key: 'rb-add' })
  const added = JSON.parse(w.files[CONFIG] ?? '{}').custom_rules
  expect(added).toHaveLength(1)
  expect(added[0]).toMatchObject({ id: 'custom-rm-rf', tool: 'Bash', level: 'block' })
  expect((await $.tool.call(BASH('rm -rf /tmp/x'))).deny).toContain('recursive force delete')
  expect(await ui.find({ key: 'rule-custom-rm-rf' })).toBeDefined()
  await ui.press({ key: 'rb-add' })
  expect(JSON.parse(w.files[CONFIG] ?? '{}').custom_rules.map((r: { id: string }) => r.id)).toEqual(['custom-rm-rf', 'custom-rm-rf-2'])
  await ui.press({ key: 'rb-del-custom-rm-rf' })
  expect(JSON.parse(w.files[CONFIG] ?? '{}').custom_rules.map((r: { id: string }) => r.id)).toEqual(['custom-rm-rf-2'])
  await ui.unmount()
})

test('project memory: the band shows the index line and its buttons ask Claude or run the CLI', async ($, on) => {
  const w = world(on, config({ mode: 'warn' }))
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'details' })
  expect(await ui.find({ type: 'Text', text: /no memory for this project yet/ })).toBeDefined()
  for (const key of ['mem-remember', 'mem-recall', 'mem-forget']) expect(await ui.find({ key })).toBeDefined()
  await ui.press({ key: 'mem-remember' })
  expect(w.toasts.at(-1)).toContain('project memory note')
  // The CLI is reached through the plugin bin folder, since the app does not put it on PATH.
  expect(w.shells.some(s => s.includes('/bin:$PATH') && s.includes('lean-project memory'))).toBe(true)
  await ui.press({ key: 'mem-forget' })
  expect(w.noTimeout).toEqual([])
  await ui.unmount()
})

// ---- Routing, workflow, docs, release trio and one-shot overrides.

const REL_OFF = { 'release-needs-review': 'off' }

test('routing: a project or global config changes any model:effort and the agent message shows all of them', async ($, on) => {
  world(on, config({ mode: 'block', routing: { code: 'opus:medium', plan: 'free' } }))
  const deny = (await $.tool.call({ ...AGENT })).deny
  expect(deny).toContain('code=opus:medium')
  expect(deny).toContain('plan=free')
  expect(deny).toContain('complex=opus:high')
})

test('agent caps: an agent counts toward the section with its model and effort; the one over the cap is refused and not counted', async ($, on) => {
  world(on, config({ mode: 'block', agent_caps: { code: 1 }, rules: { 'max-agents': 'block' } }))
  const coding = { ...AGENT, model: 'sonnet', effort: 'high' }
  expect((await $.tool.call({ ...coding })).deny).toBeUndefined()
  expect((await $.tool.call({ ...coding })).deny).toContain('at most 1 sonnet:high agents')
  // Another model and effort belongs to other sections, which have no cap.
  expect((await $.tool.call({ ...AGENT, model: 'opus', effort: 'high' })).deny).toBeUndefined()
  await $.prompt.submit({ text: 'next', asUser: true }).catch(() => undefined)
  expect((await $.tool.call({ ...coding })).deny).toBeUndefined()
})

test('max-agents: the subagent over the limit is refused, and a new prompt starts the count again', async ($, on) => {
  world(on, config({ mode: 'block', max_agents: 2, rules: { 'max-agents': 'block' } }))
  const ok = { ...AGENT, model: 'sonnet', effort: 'medium' }
  expect((await $.tool.call({ ...ok })).deny).toBeUndefined()
  expect((await $.tool.call({ ...ok })).deny).toBeUndefined()
  expect((await $.tool.call({ ...ok })).deny).toContain('at most 2 subagents')
  await $.prompt.submit({ text: 'next', asUser: true }).catch(() => undefined)
})

test('docs-before-builder: WordPress or Bricks code needs docs read first; a web fetch, a docs file or a skill counts', async ($, on) => {
  const w = world(on, blockOnly('docs-before-builder', { rules: { 'docs-before-builder': 'block', 'lean-project-first': 'off', 'ponytail-active': 'off', 'wp-skills-for-wp-code': 'off' } }))
  const BR = { tool: 'Edit', file_path: 'C:/proj/bricks/el.php', old_string: 'a', new_string: 'b' } as const
  expect((await $.tool.call({ ...BR })).deny).toContain('official docs')
  expect((await $.tool.call({ ...EDIT, file_path: 'C:/proj/readme.md' })).deny).toBeUndefined()
  await $.tool.call({ tool: 'Read', file_path: 'C:/proj/src/a.php' })
  expect((await $.tool.call({ ...BR })).deny).toBeDefined()
  await $.tool.call({ tool: 'WebFetch', url: 'https://academy.bricksbuilder.io', prompt: 'x' } as never)
  expect((await $.tool.call({ ...BR })).deny).toBeUndefined()
  expect(lines(w.files).some(l => l.includes('\tdocs-before-builder\tblock\t'))).toBe(true)
})

test('changelog-before-tag: a tag with no changelog or readme change since the last tag is refused', async ($, on) => {
  const w = world(on, config({ mode: 'block', rules: { 'changelog-before-tag': 'block', 'release-needs-review': 'off' } }))
  w.lastTag = 'v1.0.0'
  w.repos['C:/proj'] = { ...clean('aaaaaaa1'), changed: ['src/a.php'] }
  expect((await $.tool.call(BASH('git tag v1.0.1'))).deny).toContain('write the changelog')
  expect((await $.tool.call(BASH('git tag -l'))).deny).toBeUndefined()
  w.repos['C:/proj'] = { ...clean('aaaaaaa1'), changed: ['src/a.php', 'CHANGELOG.md'] }
  expect((await $.tool.call(BASH('git tag v1.0.1'))).deny).toBeUndefined()
  w.lastTag = ''
  w.repos['C:/proj'] = { ...clean('aaaaaaa1'), changed: ['src/a.php'] }
  expect((await $.tool.call(BASH('git tag v0.1.0'))).deny).toBeUndefined()
})

test('push-after-tag: a tag made in a turn with no push is logged at turn end, a pushed one is not', async ($, on) => {
  const w = world(on, config({ mode: 'warn', rules: REL_OFF }))
  w.repos['C:/proj'] = clean('aaaaaaa1')
  await $.tool.call(BASH('git tag v1.0.0'))
  await $.turn.complete({ ...DONE })
  await settle()
  expect(lines(w.files).some(l => l.includes('\tpush-after-tag\twarn\t'))).toBe(true)
  const before = lines(w.files).length
  await $.tool.call(BASH('git tag v1.0.1'))
  await $.tool.call(BASH('git push origin v1.0.1'))
  await $.turn.complete({ ...DONE, turnId: 't2' })
  await settle()
  expect(lines(w.files).filter(l => l.includes('push-after-tag')).length).toBe(1)
  expect(lines(w.files).length).toBe(before)
})

test('one-pr-per-fix: a push to main in a listed repo is refused, a feature branch or another repo is not', async ($, on) => {
  const w = world(on, config({ mode: 'block', pr_repos: ['proj'], rules: { 'one-pr-per-fix': 'block' } }))
  w.repos['C:/proj'] = clean('aaaaaaa1')
  expect((await $.tool.call(BASH('git push origin main'))).deny).toContain('pull requests only')
  w.repos['C:/proj'] = { ...clean('aaaaaaa1'), branch: 'fix/refund' }
  expect((await $.tool.call(BASH('git push origin fix/refund'))).deny).toBeUndefined()
  w.repos['C:/proj'] = clean('aaaaaaa1')
  w.files[CONFIG] = JSON.stringify({ mode: 'block', pr_repos: ['other'], rules: { 'one-pr-per-fix': 'block' } })
  expect((await $.tool.call(BASH('git push origin main'))).deny).toBeUndefined()
})

test('allow once and block once: the band arms a one-shot override that the next hit spends', async ($, on) => {
  const w = world(on, blockOnly('no-em-dashes'))
  const DASHED = { ...EDIT, new_string: `a${DASH}b` }
  expect((await $.tool.call({ ...DASHED })).deny).toBeDefined()
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'details' })
  await ui.press({ key: 'once-allow' })
  expect(w.toasts.at(-1)).toContain('allowed once')
  expect((await $.tool.call({ ...DASHED })).deny).toBeUndefined()
  expect((await $.tool.call({ ...DASHED })).deny).toBeDefined()
  expect(lines(w.files).some(l => l.includes('\tno-em-dashes\tallow-once\t'))).toBe(true)

  // Block once turns a warn rule into a block for one hit.
  w.files = config({ mode: 'warn' })
  await ui.press({ key: 'once-block' })
  expect((await $.tool.call({ ...DASHED })).deny).toBeDefined()
  expect((await $.tool.call({ ...DASHED })).deny).toBeUndefined()
  await ui.unmount()
})

test('the route button picks a model, then an effort', async ($, on) => {
  world(on, config({ mode: 'warn' }))
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ key: 'route-effort' })).toBeUndefined()
  await ui.press({ key: 'route' })
  await ui.press({ key: 'route' })
  expect(await ui.find({ type: 'Button', label: 'route sonnet' })).toBeDefined()
  await ui.press({ key: 'route-effort' })
  await ui.press({ key: 'route-effort' })
  expect(await ui.find({ type: 'Button', label: 'high' })).toBeDefined()
  await ui.unmount()
})

test('helper buttons switch the shell helpers in the global config', async ($, on) => {
  const w = world(on, config({ mode: 'warn' }))
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'details' })
  await ui.press({ key: 'hk-context_nudge' })
  expect(JSON.parse(w.files[CONFIG] ?? '{}').helpers.context_nudge).toBe(false)
  await ui.press({ key: 'hk-context_nudge' })
  expect(JSON.parse(w.files[CONFIG] ?? '{}').helpers.context_nudge).toBe(true)
  await ui.unmount()
})

test('the project buttons register and unregister the folder, and a prompt naming a project shows it', async ($, on) => {
  const w = world(on, config({ mode: 'warn' }))
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'details' })
  await ui.press({ key: 'proj-add' })
  const reg = () => JSON.parse(w.files[`${CLAUDE}/lean-projects.json`] ?? '[]') as { name: string }[]
  expect(reg().length).toBe(1)
  await ui.press({ key: 'proj-remove' })
  expect(reg().length).toBe(0)
  await ui.unmount()
})

test('Register folders here adds the child folders that look like projects', async ($, on) => {
  const w = world(on, config({ mode: 'warn' }))
  w.dirs['C:/proj'] = ['shop', 'old-reference', 'notes']
  w.dirs['C:/proj/shop'] = ['AGENTS.md', 'src']
  w.dirs['C:/proj/old-reference'] = ['.git']
  w.dirs['C:/proj/notes'] = ['a.txt']
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'details' })
  await ui.press({ key: 'proj-all' })
  const reg = JSON.parse(w.files[`${CLAUDE}/lean-projects.json`] ?? '[]') as { name: string }[]
  expect(reg.map(p => p.name)).toEqual(['shop'])
  await ui.unmount()
})

test('ponytail mode button cycles the flag file, and an unregistered folder shows the setup button', async ($, on) => {
  const w = world(on, config({ mode: 'warn' }))
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Button', label: 'Set up project' })).toBeDefined()
  await ui.press({ key: 'details' })
  await ui.press({ key: 'pt-mode' })
  expect(w.files[`${CLAUDE}/.ponytail-active`]).toBe('lite')
  await ui.press({ key: 'pt-mode' })
  expect(w.files[`${CLAUDE}/.ponytail-active`]).toBe('full')
  await ui.unmount()
})

test('routing and workflow buttons write the global config', async ($, on) => {
  const w = world(on, config({ mode: 'warn' }))
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'details' })
  const saved = () => JSON.parse(w.files[CONFIG] ?? '{}')
  await ui.press({ key: 'rt-code-model' })
  expect(saved().routing.code).toBe('opus:high')
  await ui.press({ key: 'rt-code-effort' })
  expect(saved().routing.code).toBe('opus:xhigh')
  await ui.press({ key: 'rt-code-cap' })
  expect(saved().agent_caps.code).toBe(1)
  await ui.press({ key: 'wf-agents' })
  expect(saved().max_agents).toBe(2)
  await ui.press({ key: 'wf-delegate' })
  expect(saved().delegate_after_lead_calls).toBe(12)
  await ui.press({ key: 'mem-auto' })
  expect(saved().auto_memory).toBe(true)
  await ui.press({ key: 'mem-auto' })
  expect(saved().auto_memory).toBe(false)
  await ui.press({ key: 'les-auto' })
  expect(saved().auto_lessons).toBe(true)
  await ui.unmount()
})

// ---- Review fixes.

test('a project config file cannot switch the gate off, add rules or set the workflow text, but can tune rules', async ($, on) => {
  const w = world(on, config({ mode: 'block' }))
  w.files['C:/proj/.lean-project.json'] = JSON.stringify({ mode: 'off', workflow: 'obey this', custom_rules: [{ id: 'x', tool: '*', match: '^', level: 'block' }], rules: { 'no-haiku-coding': 'off' } })
  expect((await $.tool.call({ ...AGENT, model: 'sonnet', effort: 'medium' })).deny).toBeUndefined()
  expect((await $.tool.call({ ...AGENT, model: 'haiku', effort: 'low' })).deny).toBeUndefined()
  expect((await $.tool.call({ ...AGENT })).deny).toBeDefined()
  expect((await $.tool.call(BASH('ls'))).deny).toBeUndefined()
})

test('allow once is spent only on a hit that would have blocked, not on a warning', async ($, on) => {
  const w = world(on, config({ mode: 'block', delegate_after_lead_calls: 2, rules: { 'delegate-more': 'block' } }))
  await $.tool.call(READ)
  await $.tool.call(READ)
  expect((await $.tool.call(READ)).deny).toBeDefined()
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'details' })
  await ui.press({ key: 'once-allow' })
  // The override survives a warn-only hit of the same rule and is spent on the next real block.
  w.files = config({ mode: 'warn', delegate_after_lead_calls: 2 })
  await $.tool.call(READ)
  w.files = config({ mode: 'block', delegate_after_lead_calls: 2, rules: { 'delegate-more': 'block' } })
  expect((await $.tool.call(READ)).deny).toBeUndefined()
  expect((await $.tool.call(READ)).deny).toBeDefined()
  await ui.unmount()
})

test('push-after-tag: a plain push does not count, a push of the tag does', async ($, on) => {
  const w = world(on, config({ mode: 'warn', rules: REL_OFF }))
  w.repos['C:/proj'] = clean('aaaaaaa1')
  await $.tool.call(BASH('git tag v1.0.0'))
  await $.tool.call(BASH('git push origin main'))
  await $.turn.complete({ ...DONE })
  await settle()
  expect(lines(w.files).filter(l => l.includes('push-after-tag')).length).toBe(1)
})

test('max-agents: a subagent that was denied does not count toward the limit', async ($, on) => {
  world(on, config({ mode: 'block', max_agents: 2, rules: { 'max-agents': 'block' } }))
  expect((await $.tool.call({ ...AGENT })).deny).toBeDefined()
  const ok = { ...AGENT, model: 'sonnet', effort: 'medium' }
  expect((await $.tool.call({ ...ok })).deny).toBeUndefined()
  expect((await $.tool.call({ ...ok })).deny).toBeUndefined()
  expect((await $.tool.call({ ...ok })).deny).toContain('at most 2 subagents')
})

import { expect, test } from 'claude-code/testing'

import { DEFAULTS, agentProblems, effective, isTestCommand, mergeConfig, opencodeProblem, parseJson, parseStrict, regexOk, releaseAction, segments } from './gate'

test('config: project beats global, rules merge per key, bad JSON falls back to defaults', () => {
  const global = parseJson('{"mode":"block","rules":{"routing-line":"block"},"context_limit":200000}')
  const project = parseJson('{"rules":{"no-haiku-coding":"off"},"delegate_after_lead_calls":3}')
  const c = mergeConfig(global, project)
  expect(c.mode).toBe('block')
  expect(c.rules['routing-line']).toBe('block')
  expect(c.rules['no-haiku-coding']).toBe('off')
  expect(c.rules['agent-needs-model-effort']).toBe('block')
  expect(c.context_limit).toBe(200000)
  expect(c.delegate_after_lead_calls).toBe(3)
  expect(mergeConfig(parseJson('{ not json'), parseJson('[1]'))).toEqual(DEFAULTS)
  expect(mergeConfig({ mode: 'loud', rules: { 'routing-line': 7 } }).mode).toBe('warn')
  expect(mergeConfig(parseJson('{"mode":"block"}'), parseJson('{"mode":"off"}')).mode).toBe('off')
  expect(parseStrict('{ nope')).toBeUndefined()
  expect(parseStrict('[]')).toBeUndefined()
})

test('effective action: off wins, warn mode caps at warn, block mode uses the rule', () => {
  const c = mergeConfig({ rules: { 'routing-line': 'off' } })
  expect(effective(c, 'no-haiku-coding')).toBe('warn')
  expect(effective({ ...c, mode: 'block' }, 'no-haiku-coding')).toBe('block')
  expect(effective({ ...c, mode: 'block' }, 'routing-line')).toBe('off')
  expect(effective({ ...c, mode: 'off' }, 'no-haiku-coding')).toBe('off')
})

test('agent input: model and effort are both required, haiku is refused', () => {
  expect(agentProblems({}).map(p => p.rule)).toEqual(['agent-needs-model-effort'])
  expect(agentProblems({ model: 'sonnet' }).map(p => p.rule)).toEqual(['agent-needs-model-effort'])
  expect(agentProblems({ model: 'sonnet', effort: 'medium' })).toEqual([])
  expect(agentProblems({ model: 'haiku', effort: 'low' }).map(p => p.rule)).toEqual(['no-haiku-coding'])
  // Haiku passes only when its model:effort is a non-coding section's.
  const haiku = { model: 'haiku', effort: 'low' }
  expect(agentProblems(haiku, { ...DEFAULTS.routing, read: 'haiku:low' })).toEqual([])
  expect(agentProblems(haiku, { ...DEFAULTS.routing, read: 'haiku:low', code: 'haiku:low' }).map(p => p.rule)).toEqual(['no-haiku-coding'])
})

test('segments: quoted text stays one token and heredoc bodies are skipped', () => {
  expect(segments('git commit -m "git tag v1 && gh release create"').length).toBe(1)
  expect(segments("echo 'a; b' && ls").map(s => s.length)).toEqual([2, 1])
  expect(segments('cat <<EOF\ngit tag v1\nEOF\nls').map(s => s[0]?.v)).toEqual(['cat', 'ls'])
  expect(segments('ls 2>&1 | head').length).toBe(2)
})

test('opencode: only a segment that runs opencode with a non -free model is a problem', () => {
  const ok = [
    'opencode run -m opencode/big-pickle-free "fix it"',
    'opencode run --model=x-free hi',
    'opencode --help',
    'opencode -h',
    'opencode --version',
    'opencode models',
    'opencode auth login',
    'opencode export abc/def',
    'npx opencode-ai --version',
    'X=1 timeout 5 opencode run -m a-free x',
    'cat docs/opencode-notes.md',
    'git commit -m "opencode run -m paid"',
    'cat <<EOF\nopencode run x\nEOF',
    'opencode run --file src/a.ts -m x-free go',
  ]
  for (const c of ok) expect(opencodeProblem(c)).toBeUndefined()
  const bad = [
    'opencode run opencode/grok-code "fix it"',
    'opencode run -m x:free hi',
    'opencode run "no model"',
    'opencode -m paid',
    'npx opencode run -m paid hi',
    'npx opencode-ai run -m paid hi',
    'env FOO=1 opencode run -m paid hi',
    'cd app && opencode run -m x-free a && opencode run -m paid b',
    'bash -c "opencode run -m paid hi"',
    'echo "$(opencode run -m paid hi)"',
  ]
  for (const c of bad) expect(opencodeProblem(c)).toBeDefined()
})

const HEREDOCS = ['<<EOF', '<<-EOF', "<<'EOF'", '<<\\EOF', '<<"EOF"']

test('rule 4 matches real release actions only', () => {
  const real = [
    'git tag v1.2.0',
    'git tag -a v1 -m "release notes"',
    'git -C /e/x tag v2',
    'git push origin --tags',
    'git push --follow-tags',
    'git push --mirror',
    'git push origin refs/tags/v1',
    'git push origin v1.2.0',
    'git push origin 1.2.3',
    'git push origin tag v1.0',
    'git push origin "v$VER"',
    'git push origin $TAG',
    'gh release create v1',
    'gh release upload v1 a.zip',
    'gh release edit v1',
    'gh release delete v1',
    'php nashenski-tools/zip.php',
    'php -d display_errors=1 -c php.ini nashenski-tools/zip.php',
    'node tools/zip.php',
    'bash x/zip.php',
    'cd repo && git tag v1',
    'pushd repo && git tag v1',
    'timeout 20 git tag v9',
    'X=1 git push --tags',
    'bash -c "git tag v1"',
    'bash -lc "git tag v1"',
    'bash -ec "git push --tags"',
    'sh -c "gh release create v1"',
    'eval "git tag v1"',
    'eval git push --tags',
    'cmd /c "git tag v1"',
    'powershell -Command "git tag v1"',
    'pwsh -c "git push --tags"',
    'echo $(git tag v1)',
    'echo `git tag v1`',
    'echo "$(git tag v1)"',
    'echo "`git push --tags`"',
    'cat <<EOF > f\nbody\nEOF\ngit tag v1',
  ]
  for (const c of real) expect(releaseAction(c, 'C:/proj')).toBeDefined()
  for (const h of HEREDOCS) expect(releaseAction(`cat ${h}\ngit tag v1\nEOF\ngit push --tags`, 'C:/proj')?.what).toBe('git push of tags')
  const notRelease = [
    'git tag',
    'git tag -l',
    'git tag --list "v*"',
    'git tag -d v1',
    'git tag --contains abc',
    'git tag -v v1',
    'git commit -m "git tag v1 and gh release create v1"',
    'git add zip.php',
    'php -l nashenski-tools/zip.php',
    'gh release list',
    'gh release view v1',
    'git push origin main',
    'git push --delete origin v1',
    'git push origin --delete v1',
    'git status',
    'cat zip.php',
    "echo 'git push --tags'",
    'echo "git tag v1"',
    'bash -c "git status"',
    'cat <<EOF\ngit tag v1\nEOF',
    'git commit -m "$(cat <<\'EOF\'\ngh release create x\nEOF\n)"',
    'git commit -m "$(cat <<\'EOF\'\nsay "hi" git tag v1\nEOF\n)"',
  ]
  for (const c of notRelease) expect(releaseAction(c, 'C:/proj')).toBeUndefined()
  for (const h of HEREDOCS) expect(releaseAction(`cat ${h}\ngit tag v1\nEOF`, 'C:/proj')).toBeUndefined()
})

test('rule 4 resolves the directory from cd, pushd, -C, ~, Git Bash paths and escaped spaces', () => {
  const dir = (c: string, cwd = 'C:/x') => releaseAction(c, cwd, 'C:/Users/me')?.dir
  expect(dir('cd "E:\\Claude Sessions\\tokenforge" && git tag v1')).toBe('E:/Claude Sessions/tokenforge')
  expect(dir('cd sub && git tag v1', 'C:\\proj')).toBe('C:/proj/sub')
  expect(dir('git -C "E:\\a b" tag v1')).toBe('E:/a b')
  expect(dir('git -C "dir with space" tag v1', 'C:/proj')).toBe('C:/proj/dir with space')
  expect(dir('git -C /e/x push --tags')).toBe('E:/x')
  expect(dir('pushd /e/work && git tag v1')).toBe('E:/work')
  expect(dir('cd ~/repo && git tag v1')).toBe('C:/Users/me/repo')
  expect(dir('cd E:/Claude\\ Sessions/x && git tag v1')).toBe('E:/Claude Sessions/x')
  expect(dir('git tag v1', 'C:\\proj')).toBe('C:/proj')
})

test('rule 7 test commands: runners and interpreted test scripts count; lint, typecheck and mentions do not', () => {
  const yes = ['node --test', 'claude plugin test x', 'php tests/foo.php', 'bash tests/run.sh', 'vendor/bin/phpunit', 'python -m pytest', 'php artisan test', 'composer test', 'npm test', 'npm run test', 'npm run test:unit', 'yarn test', 'pnpm test', 'php tools/run-tests.php', 'php dev/check-all.php', 'php dev/harness.php']
  for (const c of yes) expect(isTestCommand(c)).toBe(true)
  const no = ['npx tsc --noEmit', 'node node_modules/typescript/lib/tsc.js -p x', 'php -l a.php', 'cat tests/foo.php', 'grep -r tsconfig .', 'cat tsconfig.json', 'ls tests/a.js', 'echo tsc', 'git commit -m "npm test"', 'php artisan migrate', 'npm run build', 'composer install']
  for (const c of no) expect(isTestCommand(c)).toBe(false)
})

test('regexOk: ordinary patterns pass, hang-prone shapes are refused', () => {
  for (const ok of [String.raw`\bsudo\b`, String.raw`git\s+push\b[^|;&]*(--force\b|\s-f\b)`, '(demos?|examples?)/', String.raw`\.(zip|sql)$`, 'TODO|FIXME']) expect(regexOk(ok)).toBe(true)
  for (const bad of ['(a+)+$', '(a*)*', '(a|aa)+', '(x{1,}){2,}', String.raw`(a)\1`, '(', 'a'.repeat(301)]) expect(regexOk(bad)).toBe(false)
})

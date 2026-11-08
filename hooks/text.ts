// Panel text with no engine calls: rule groups and meanings, rule-builder presets, labels, and the Explain line of every button.
// Kept apart from register.tsx because it is plain data; anything that takes the engine `$` must stay in register.tsx.

import type { HelperKey, RoutingKey } from './gate'
import { DEFAULTS } from './gate'

export const HELPER_LABEL: Record<HelperKey, string> = { startup_notes: 'startup notes', context_nudge: 'context nudge', guard_hints: 'doc and test hints', session_drafts: 'session drafts', ponytail: 'ponytail hooks' }
export const ROUTING_LABEL: Record<RoutingKey, string> = { read: 'Reading and writing (text, images)', code: 'Coding', complex: 'Complex coding', review: 'Review', plan: 'Planning' }
export const PACKS = ['wp', 'bricks', 'ui-ux']

// Ready-made patterns for the rule builder: the panel has buttons, not a text field. Anything else goes in custom_rules by hand or via Ask Claude.
export const PRESETS = [
  { id: 'force-push', label: 'force push', tool: 'Bash', match: '\\bgit\\s+push\\b[^|;&]*(--force\\b|--force-with-lease|\\s-f\\b)', message: 'no force push' },
  { id: 'rm-rf', label: 'rm -rf', tool: 'Bash', match: '\\brm\\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)\\b', message: 'recursive force delete' },
  { id: 'sudo', label: 'sudo', tool: 'Bash', match: '\\bsudo\\b', message: 'no sudo' },
  { id: 'npm-install', label: 'new dependency', tool: 'Bash', match: '\\b(npm|pnpm|yarn)\\s+(i|install|add)\\b', message: 'adding a dependency: is it needed?' },
  { id: 'secret', label: 'hardcoded secret', tool: 'Edit|Write', match: '(password|passwd|secret|api[_-]?key|token)\\s*[:=]\\s*[\'"][^\'"\\s]{8,}[\'"]', message: 'looks like a hardcoded secret' },
  { id: 'debug', label: 'debug leftover', tool: 'Edit|Write', match: 'console\\.log\\(|var_dump\\(|print_r\\(', message: 'debug output left in code' },
  { id: 'todo', label: 'TODO left', tool: 'Edit|Write', match: '\\b(TODO|FIXME|XXX)\\b', message: 'unfinished marker written' },
] as const

// The details view lists rules by group, each with a one-line meaning.
export const RULE_GROUPS: readonly (readonly [string, readonly string[]])[] = [
  ['Agents and models', ['agent-needs-model-effort', 'no-haiku-coding', 'free-opencode-only', 'delegate-more', 'max-agents', 'review-edited-files-only', 'distinctive-session-names']],
  ['Every session', ['lean-gate-first', 'ponytail-active', 'state-file-fresh', 'tests-before-done', 'no-em-dashes']],
  ['Releases and git', ['release-needs-review', 'changelog-before-tag', 'push-after-tag', 'one-pr-per-fix', 'no-demo-files-public']],
  ['WordPress and docs', ['wp-skills-for-wp-code', 'docs-before-builder', 'phpcs-before-done']],
]
export const RULE_INFO: Record<string, string> = {
  'agent-needs-model-effort': 'Agent calls must set a model and effort',
  'no-haiku-coding': 'Haiku never writes code',
  'free-opencode-only': 'OpenCode runs must use a free model',
  'delegate-more': 'Long runs of reads go to a subagent',
  'max-agents': 'Limit on subagents per turn',
  'review-edited-files-only': 'A review agent is scoped to files',
  'lean-gate-first': 'Load lean-gate before editing code',
  'ponytail-active': 'Ponytail on before editing code',
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

// End-of-turn rules whose reminder can repeat every turn or come once a session.
export const REMINDER_RULES = ['state-file-fresh', 'tests-before-done', 'phpcs-before-done'] as const
export const REMINDER_LABEL: Record<(typeof REMINDER_RULES)[number], string> = { 'state-file-fresh': 'state reminder', 'tests-before-done': 'test reminder', 'phpcs-before-done': 'PHPCS reminder' }
// State files the State file button steps through; '' means any HANDOFF or STATE file.
export const STATE_FILES = ['', 'docs/PLAN.md', 'AGENTS.md'] as const
// What a push to a public repo must not carry (no-demo-files-public).
export const DEMO_PRESETS = [
  { label: 'folders and files', pattern: DEFAULTS.demo_pattern },
  { label: 'folders only', pattern: '(^|/)(demos?|examples?|samples?|screenshots?|scratch|backups?|fixtures)/' },
] as const

// Panel colours are theme keys, so both the light and the dark theme read them: one accent per section, rule group and model.
export const SECTION_COLOR: Record<string, string> = {
  project: 'suggestion', rules: 'warning', builder: 'claude', routing: 'permission', workflow: 'permission', settings: 'suggestion',
  helpers: 'inactive', memory: 'success', board: 'success', lessons: 'success', review: 'error', ponytail: 'claude',
  wpdev: 'suggestion', packs: 'inactive', stats: 'warning', violations: 'error',
}
export const GROUP_COLOR: Record<string, string> = { 'Agents and models': 'permission', 'Every session': 'suggestion', 'Releases and git': 'claude', 'WordPress and docs': 'success', 'Your rules': 'warning' }
export const LEVEL_COLOR: Record<string, string> = { off: 'inactive', warn: 'warning', block: 'error' }
export const MODEL_COLOR: Record<string, string> = { haiku: 'success', sonnet: 'suggestion', opus: 'permission', fable: 'claude', free: 'inactive' }

// Hover help on the info icons (desktop app only; the terminal has Explain instead).
export const GROUP_HELP: Record<string, string> = {
  'Agents and models': 'Checked on every Agent call: model and effort set, no Haiku for code, free OpenCode models only, agent caps, scoped reviews, session names.',
  'Every session': 'Checked as a session works: the lean-gate skill first, ponytail on, the state file and tests kept current, no em dashes.',
  'Releases and git': 'Checked on tags, pushes and pull requests: review before release, a changelog before a tag, a push after a tag, one PR per fix, no demo files public.',
  'WordPress and docs': 'Checked on WordPress code: WordPress skills and docs read first, PHPCS on WordPress PHP before done.',
  'Your rules': 'Rules you added with the Rule builder or in custom_rules.',
}
export const ROUTING_HELP: Record<RoutingKey, string> = {
  read: 'Agents that read, search or write text and images. A cheap model is usually enough.',
  code: 'Agents that write or change code. Haiku is refused here.',
  complex: 'Agents for code that spans many files or needs design. Haiku is refused here.',
  review: 'Agents that review code. Only code changed since the last release, unless a full review is due.',
  plan: 'Agents that plan a phase or a design.',
}

// What the status items of the top row mean, shown under it while Explain is on.
export const TOP_LEGEND = [
  '● and the level: the master mode (off, warn, block).',
  'lead / sub: reads the main session made itself, and subagents it started. Orange: many reads in a row with no edit.',
  'used / limit and the bar: context used against the context limit. Orange from 70 percent, red from 90.',
  '✓ age or ⚠ stale: when the state file was last touched. Stale: code changed after it, or over an hour old.',
  'tests: the result of the last test command (pass, fail, none).',
  'review due or reviewed: whether code changed since the last review mark.',
  '⚠ n: rule hits (warnings and blocks) recorded; the list is under Recent violations.',
]

// One line per button, shown beside it while Explain is on. Dynamic keys share one entry (see explainFor).
export const EXPLAIN: Record<string, string> = {
  // Top row
  mode: 'Master level: off checks nothing, warn turns every rule into a warning, block lets each rule use its own level.',
  route: 'Model for this task only: anything but main adds a routing line to the session prompt. Not saved.',
  'route-effort': 'Effort for the routed model: low, medium, high, xhigh or max.',
  setup: 'This folder is not registered: adopt it if it is a project, or start a new one.',
  new: 'Context is near the limit: asks Claude to update the state file, then to start a fresh session.',
  state: 'Code changed after the state file: asks Claude to bring HANDOFF or STATE up to date.',
  tests: 'No passing test run since the last code edit: asks Claude to run the tests.',
  review: 'Shows the start of the review-scope report: the code changed since the last release tag.',
  reviewed: 'Marks the current commit reviewed, so a release tag passes release-needs-review.',
  details: 'Shows or hides the sections below.',
  explain: 'Shows or hides these explanation lines.',
  hide: 'Closes the panel. The Open lean-gate panel button above the prompt brings it back.',
  // Project
  'proj-add': 'Adds this folder to the project registry, so it is recognised in any chat.',
  'proj-remove': 'Removes this folder from the project registry.',
  'proj-all': 'Registers every child folder that looks like a project (git, AGENTS.md, CLAUDE.md or a package file).',
  'proj-start': 'Asks Claude to start a new project here: setup cards, then the AGENTS.md layout.',
  'proj-adopt': 'Asks Claude to adopt this folder: a migration map first, nothing changes before your approval.',
  'proj-walk': 'Asks Claude to orient from the files alone and report the next step.',
  'proj-attach': 'Reads the mentioned project\'s entry and state file into this chat, without editing there.',
  'proj-switch': 'Moves this session to the mentioned project\'s folder.',
  'proj-ignore': 'Dismisses the project mention.',
  // Rules and the rule builder
  rule: 'Press to cycle the rule: off, warn, block.',
  'rb-pattern': 'Steps through ready-made patterns for a new rule.',
  'rb-level': 'The level the new rule gets: warn or block.',
  'rb-add': 'Adds the chosen pattern as one of your rules.',
  'rb-del': 'Deletes this rule of yours.',
  'rb-ask': 'Asks Claude to write a custom rule for something the presets do not cover.',
  // Model routing
  'rt-model': 'Model for this kind of work; agents of that kind must use it.',
  'rt-effort': 'Effort for this kind of work.',
  'rt-cap': 'How many agents with this model and effort may run in one turn.',
  // Workflow and limits
  'wf-agents': 'Most subagents in one turn.',
  'wf-delegate': 'Reads in a row before delegate-more asks for a subagent.',
  'wf-context': 'The size the context meter counts against.',
  'wf-edit': 'Asks Claude to write the workflow note added to every session prompt.',
  // Helpers
  'hk-startup_notes': 'The standing rules printed at session start.',
  'hk-context_nudge': 'The reminder to start a new session past the context limit.',
  'hk-guard_hints': 'Hints to check docs against code and tests against the test rules.',
  'hk-session_drafts': 'A handoff draft saved when a session ends.',
  'hk-ponytail': 'Ponytail\'s hooks: its rules at session start, for subagents and on /ponytail.',
  // Memory, board, lessons
  'mem-remember': 'Asks Claude to add a project memory note for this session.',
  'mem-recall': 'Asks Claude to read the notes and say where the project stands.',
  'mem-forget': 'Archives the newest note (never deleted).',
  'mem-auto': 'On: Claude records decisions and milestones by itself.',
  'mem-link': 'Links this project to that one, so recall also reads its newest notes.',
  'board-refresh': 'Reads the shared task board again.',
  'board-ask': 'Asks Claude which cards are blocked and what each needs.',
  'les-refresh': 'Reads the lessons file again.',
  'les-add': 'Asks Claude to record a lesson; a second sighting makes it a local rule.',
  'les-review': 'Asks Claude to rewrite or drop lessons older than 14 days.',
  'les-auto': 'On: Claude records a lesson by itself when corrected.',
  // Review
  'a-reviewed': 'Marks the current commit reviewed.',
  rv: 'Marks that repo reviewed.',
  // Ponytail and WordPress checks
  'pt-mode': 'Ponytail level: off, lite, full or ultra.',
  'pt-update': 'Fetches the latest ponytail into vendor/ (review and commit the diff).',
  'pt-retire': 'Switches off the standalone plugins the hub replaces (next session).',
  'audit-run': 'Runs the performance and HPOS scan on the PHP changed since the last tag.',
  'phpcs-run': 'Runs PHPCS with the WordPress standard on the changed PHP files.',
  'phpcs-fix': 'Lets PHPCBF fix what it can in the changed PHP files.',
  'phpcs-std': 'The PHPCS standard: WordPress, -Extra, -Core or -Docs.',
  'phpcs-status': 'Reads the PHPCS and vendored-tool status again.',
  // Rule stats, packs and violations
  'stats-off': 'Sets the noisiest rule of the last 7 days to off (where presses save); its row under Rules turns it back on.',
  'stats-refresh': 'Reads the rule stats again (lean-gate stats).',
  'pack-on': 'Brings this skill pack back (next session).',
  'pack-off': 'Parks this skill pack so it costs nothing at startup (next session).',
  'once-allow': 'Lets the next hit of this rule through, even a block.',
  'once-block': 'Refuses the next hit of this rule, even a warning.',
  // Settings
  'set-target': 'Where presses save: the global file, or this project\'s .lean-gate.json (the mode, workflow, your rules and the demo pattern always go global).',
  'set-rem': 'once: one warning a session until a turn fixes it. every turn: a warning each turn.',
  'set-scope': 'projects only: session rules skip folders that are not projects. everywhere: scratch chats too.',
  'set-quiet': 'On: warnings are counted and listed without a pop-up. Blocks still show.',
  'set-panel': 'How the panel opens at session start: with details, compact, or closed.',
  'set-statefile': 'The state file the gate watches in this project (saved in this project\'s file).',
  'set-pr': 'On: this repo takes pull requests only, so a push to main is refused.',
  'set-demo': 'What a push to a public repo must not carry: demo folders, also zip, sql, log and env files.',
  'set-reset': 'Backs up the global settings, then sets every value back to its default.',
  'set-undo': 'Puts back the settings saved by the last reset.',
  'set-export': 'Writes your global settings to lean-gate-settings.json in this folder.',
  'set-import': 'Reads lean-gate-settings.json from this folder into your global settings (backup first).',
}

// The Explain line for a button key; dynamic keys (one per rule, model, pack or repo) map to their shared entry.
export function explainFor(key: string): string | undefined {
  const k = key
    .replace(/^rule-.*/, 'rule')
    .replace(/^rt-[a-z]+-(model|effort|cap)$/, 'rt-$1')
    .replace(/^(wp|bricks|ui-ux)-(on|off)$/, 'pack-$2')
    .replace(/^mem-link-.*/, 'mem-link')
    .replace(/^rb-del-.*/, 'rb-del')
    .replace(/^rv-.*/, 'rv')
    .replace(/^set-rem-.*/, 'set-rem')
  return EXPLAIN[k]
}

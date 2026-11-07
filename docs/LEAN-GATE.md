# The lean-gate panel

The lean-gate panel is the control surface of lean-project. It sits in a docked pane beside the chat, shows how the session is going, and lets you change every setting with button presses. This page explains each part, how to use it, and gives examples.

Contents: [Project](#project) · [Ponytail](#ponytail) · [WordPress checks](#wordpress-checks) · [Built-in helpers](#built-in-helpers) · [Opening and closing](#opening-and-closing) · [The top row](#the-top-row) · [Rules](#rules) · [Rule builder](#rule-builder) · [Model routing](#model-routing) · [Workflow and limits](#workflow-and-limits) · [Project memory](#project-memory) · [Board](#board) · [Lessons and local rules](#lessons-and-local-rules) · [Review](#review) · [Packs](#packs) · [Recent violations](#recent-violations) · [Config files](#config-files)

## Opening and closing

- The panel opens by itself at session start. `/lean-gate` opens it again.
- **Close lean-gate panel** (the last button) closes it. While it is closed, an **Open lean-gate panel** button appears above the prompt.
- Press **Details** in the top row to show the sections below it, **Compact** to hide them. Each section title (▾ open, ▸ closed) is a button that folds it. Folds are remembered for the session only.
- A button that steps through choices (a level, a model, an effort, a cap) moves to the next choice on each press and writes it to `~/.claude/lean-project.json` at once.

## The top row

| Item | Meaning | What you can do |
| --- | --- | --- |
| Dot and `warn` / `block` / `off` | The master level. It caps every rule: at `warn` every rule only warns, at `block` each rule uses its own level, at `off` nothing is enforced. | Press to cycle. |
| `route main` | Which model Claude is told to use for this task: main (no instruction), haiku, sonnet, opus, fable or free (a free OpenCode model). A second button beside it appears for a real model and cycles the effort (low, medium, high, xhigh, max). Anything but main adds a "Routing for this task" line (for example `opus:xhigh`) to the session prompt. Session only, not saved. | Press the model to cycle; press the effort to cycle. |
| `no route` (orange) | The first Edit, Write or Agent call of the last turn had no `routing:` line before it. | Nothing; it clears next turn. |
| `lead 6 / sub 0` | Reads (Read, Grep, Glob) the main session made itself, and subagents it started, since the last `/clear`. Turns orange when the main session has read many files in a row with no edit (see `delegate-more`). | None. |
| `250k/300k` | Context used against the context limit (set under Workflow and limits). From 80 percent a **New session** button appears: it asks Claude to update the state file and tell you to start fresh. | Press New session. |
| `✓ 5m` / `⚠ stale` / `state -` | Age of the last state-file edit (HANDOFF or STATE). Stale means code was edited after the state file, or the state file is over an hour old. **Update state** asks Claude to refresh it. | Press Update state. |
| `tests pass` / `fail` / `none` | The result of the last test command Claude ran. **Run tests** asks Claude to run the project's tests. | Press Run tests. |
| `review due` / `reviewed` | Whether code changed since the last review mark. When due, **Review** prints the start of the `review-scope` report and **Reviewed** marks the current commit as reviewed. | See [Review](#review). |
| `⚠ 4` | Rule hits recorded (warnings and blocks). The log keeps the latest 50 for the panel, 500 lines on disk. | See [Recent violations](#recent-violations). |

## Rules

Rules check what Claude does and either warn or refuse. Each rule has a level you step with one press:

- **block**: the tool call is refused and Claude sees the rule's message; it has to fix the problem and try again.
- **warn**: the call goes through; the hit is logged, shown as a toast and counted in `⚠`.
- **off**: not checked.

The master level in the top row caps these. Four rules can only warn (marked below) because they are judged after the fact, at the end of a turn.

**Agents and models**

| Rule | What it checks |
| --- | --- |
| `agent-needs-model-effort` | Every Agent call sets a model and an effort. |
| `no-haiku-coding` | Haiku is refused unless its model and effort match a non-coding section of Model routing. |
| `free-opencode-only` | OpenCode runs name a free model (the name ends in `-free`). |
| `delegate-more` | After several reads in a row with no edit, the next read is refused with "delegate bulk reading to a subagent". Edit, Write and Agent reset the count. |
| `max-agents` | Limit on subagents per turn (set under Workflow and limits), and the per-section caps under Model routing. |
| `review-edited-files-only` | A review agent is scoped to the edited files, not the whole repo. |
| `distinctive-session-names` | A new session (start_session or hand_off_to_session) needs a title that starts with the date and time, `YYYY-MM-DD HH:MM`, then what it is about, so it can be found later. A proposal card the person accepts keeps its own title. |

**Every session**

| Rule | What it checks |
| --- | --- |
| `lean-project-first` | The lean-project skill is loaded before code is edited. |
| `ponytail-active` | The separate ponytail plugin is on before code is edited. (This only reads ponytail's on/off state; the panel does not control ponytail.) |
| `routing-line` (warn only) | A `routing:` line appears before the first Edit, Write or Agent call of a turn. |
| `state-file-fresh` (warn only) | The state file is touched after code is edited. |
| `tests-before-done` (warn only) | A test command ran after code was edited. |
| `no-em-dashes` | No em dashes in written files or commit messages. |

**Releases and git**

| Rule | What it checks |
| --- | --- |
| `release-needs-review` | `git tag` is refused while a review is due. |
| `changelog-before-tag` | A changelog or readme change since the last tag, before a new tag. |
| `push-after-tag` (warn only) | A tag made in a turn is also pushed in that turn. |
| `one-pr-per-fix` | Repos listed in `pr_repos` take pull requests, not pushes to main. |
| `no-demo-files-public` | A push to a public repo does not carry demo, example, sample, screenshot, scratch, backup or fixture folders, or zip, sql, log or env files (`demo_pattern`). |

**WordPress and docs**

| Rule | What it checks |
| --- | --- |
| `wp-skills-for-wp-code` | The wp-* skills are loaded before WordPress code is edited. |
| `docs-before-builder` | The official docs were read before Bricks or WordPress code is edited. |

**Your rules** lists custom rules from the rule builder.

Example: to make a forgotten routing note harmless but keep agents strict, leave `routing-line` on warn and set `agent-needs-model-effort` to block, then set the master level to `block`.

## Rule builder

Make your own rule without writing JSON. Press **pattern** to step through ready-made patterns: force push, `rm -rf`, `sudo`, new dependency, hardcoded secret, debug leftover, TODO left. Press **level** to choose warn or block, then **Add rule**. The line under the buttons shows the regular expression the pattern uses. Your rule appears under Your rules, and **Remove** buttons delete it.

Example: choose `force push`, level `block`, Add rule. From then on a `git push --force` is refused.

For anything the presets do not cover, **Ask Claude to write a custom rule**. Claude asks what it should catch, then adds an entry to `custom_rules` in the config file (see [Config files](#config-files)). Patterns that could hang the client (nested quantifiers, backreferences) are refused.

## Model routing

Tells Claude which model and effort to use for each kind of work, and how many agents of each kind may run in a turn. Five sections: **Reading and writing (text, images)**, **Coding**, **Complex coding**, **Review**, **Planning**. Each has three buttons:

- **model**: haiku, sonnet, opus, fable or free. Haiku is not offered for the two coding sections.
- **effort**: low, medium, high, xhigh or max.
- **agents at once**: no limit, 1, 2, 3, 4 or 6.

The `agent-needs-model-effort` rule refuses agents without a model and effort, and its message lists this table so Claude can pick from it.

How the cap works: an agent counts toward every section whose model and effort match the agent's. With the defaults, an `opus:high` agent counts toward Complex coding, Review and Planning together. An agent that would go over a cap is refused (when `max-agents` is set to block) and does not count. Counts reset on each new prompt.

Example: set Coding to `sonnet`, `high`, `3` agents. Claude may run three `sonnet:high` agents at once; a fourth is refused until the next prompt.

A project's own `.lean-project.json` can override routing for that project.

## Workflow and limits

- **max agents per turn**: the overall limit on subagents in one turn (no limit, 2, 3, 4, 6 or 8).
- **delegate after N reads**: how many reads in a row the main session may do before `delegate-more` steps in (4, 6, 8, 12 or 16).
- **context limit**: the size the context meter counts against (200k, 300k, 500k or 1M).
- **Edit workflow text**: the workflow text is a short note, up to 600 characters, added to Claude's session prompt every session. Use it to say how you want work organised. Claude cannot be forced to follow it; the enforced parts are the rules and routing. The button asks Claude to write it; you cannot type in the panel.

Example workflow text: `Reading and research go to haiku subagents. Code goes to sonnet:high, at most 3 agents. Plan first, then build, then test, then review with opus.`

Only the global config can set the workflow text, because a project file can arrive with a cloned repo.

## Project memory

Short dated notes kept per project, so a new session knows what was decided. Notes live in `~/.claude/lean-project/memory/<project>/`.

- The line shown is the index: note count, newest note and linked projects.
- **Remember** asks Claude to add a note for what was decided in this session. **Recall** asks Claude to read the notes and say where the project stands. **Forget last** archives the newest note (never deleted).
- **link to** names other projects with notes; a button links this project to that one, so recall also reads their newest notes.
- **automatic: on/off**: when on, the session prompt tells Claude to record decisions, milestones and facts the next session needs by itself, with `lean-project memory add "<one line>" --tag decision|state|link|note`. This works by instruction, so it depends on Claude following it.

Example note: `lean-project memory add "Chose per-section agent caps over one global cap" --tag decision`.

## Board

The shared task board is how parallel agents and sessions talk to each other. Agents cannot see each other, so the board is one append-only file (`BOARD.md` in the project's docs folder) read and written through `lean-project board`:

```
lean-project board                      # columns (doing, blocked, todo, done) and the latest notes
lean-project board T3                   # one card's full history
lean-project board add T3 <title>       # the lead adds a card before delegating
lean-project board move T3 doing        # todo | doing | blocked | done
lean-project board note T3 <one line>   # a fact another task needs
lean-project board files T3 <paths>     # the files a card changes; done runs a syntax and standards check
```

The panel shows what `lean-project board` prints. **Refresh** reads it again; **Ask Claude to check it** has Claude report blocked cards and what each needs. The panel only reads the board: cards are created by the lead when work is delegated, so it says "no board here yet" until a project has one. See `skills/lean-project/BUILD.md`, "Board", for how agents use it.

## Lessons and local rules

A lesson is a note about what to do differently. The first sighting is logged; when the same lesson is recorded a second time it becomes a line under "Local rules" at the top of the lessons file, which every session reads first. Local rules outrank the defaults.

- The panel shows what `lean-project lessons` prints.
- **Add lesson** asks Claude to record one (it asks what it should say). **Review old** asks Claude to go through unpromoted lessons older than 14 days and rewrite each into a rule or drop it. Dropped lessons move to an archive, never deleted.
- **automatic: on/off**: when on, Claude records a lesson by itself when you correct it or it repeats a mistake.

Example: `lean-project lesson "Run the tests before saying done"`. Recording the same text again promotes it to a local rule.

## Review

Code, performance and security reviews are a release gate, not a step on every task. `lean-project review-scope` lists the code changed since the last release tag and says whether a full review is due.

- **Review** (top row, when due) shows the first lines of the `review-scope` report as a toast.
- **Reviewed** marks the current commit as reviewed. The mark is kept outside the repo and is tied to that commit, so later code changes make a review due again and the `release-needs-review` rule refuses a tag.
- In a folder that is not a repo but holds repos, a **Reviewed <name>** button appears for each repo that is due.

## Packs

Packs are sets of skills and plugins that stay off until a task needs them. Every skill or plugin loaded at startup costs tokens in every session, so the ones used rarely are parked.

| Pack | What it holds |
| --- | --- |
| `wp` | The WordPress `wp-*` skills. |
| `bricks` | The Bricks and BricksExtras skills. |
| `ui-ux` | The UI/UX plugin. |

**on** brings a pack back, **off** parks it. Nothing is deleted: skill folders move between `~/.claude/skills` and `~/.claude/skills-off`, and a plugin pack flips its switch in `settings.json`. Changes apply in the next session, because Claude Code reads skills and plugins at start. The line under the buttons is the output of `lean-project pack status`.

Example: before a WordPress task, press `wp on`, then start a new session.

## Recent violations

The last five rule hits, newest first, each as `block` or `warn`, the rule and a short detail. **Allow once** overrides the last rule that fired so its next hit is let through, even a block. **Block once** makes the next hit refuse, even a warning (not for the warn-only rules). Each override is spent after one hit.

## Project

Detection and setup for the folder you are in. The registry is `~/.claude/lean-projects.json` (name, path, aliases).

- The line under the title says whether the folder is **registered**, a project folder that is **not registered** (it has an `AGENTS.md`, `CLAUDE.md`, `.git`, a README or a package file), or neither.
- **Register this folder** adds it to the registry; **Unregister** removes it. Once registered, the top row stops showing **Set up project**.
- **Set up project** (top row, only for an unregistered folder) adopts the folder if it looks like a project and starts a new one if it does not. **Start project** and **Adopt this folder** do the same on demand. Both ask Claude to follow `STRUCTURE.md`: the setup cards, then the layout with `AGENTS.md` as the entry. Adopting shows a migration map and waits for your approval before anything changes.
- **Walk test** asks Claude to orient from the files alone and report the next step and the status.
- Name a registered project in a chat started somewhere else ("fix the Nashenski checkout") and a line appears: **Attach** (read its entry and state file for this chat), **Switch folder** (change the session to it) or **Ignore**. Nothing happens without your press. A name or alias must be four letters or more.

## Ponytail

Ponytail (the lazy senior dev rules, MIT, vendored at the version shown) is part of the hub. Its hooks load the rules at session start, for subagents and on `/ponytail` commands.

- **mode** cycles off, lite, full, ultra by writing `~/.claude/.ponytail-active`.
- **hooks** switches its three hooks on or off (the `helpers.ponytail` key).
- **Update** fetches the latest release into `vendor/ponytail` (`lean-project vendor update ponytail`); review the diff and commit it.
- **Switch off standalone plugins** appears while the separate ponytail, wp-woo-performance-audit or lean-gate-local plugins are still enabled. Until then the hub stays quiet about ponytail so nothing loads twice.

## WordPress checks

- **Performance audit** runs `lean-project audit perf` on the PHP changed since the last tag (the vendored wp-woo-performance-audit skill; its skills are also available to Claude).
- **Run PHPCS** and **Fix with PHPCBF** run PHP_CodeSniffer with the WordPress standard on the PHP files changed since the last tag plus uncommitted ones. **standard** cycles WordPress, WordPress-Extra, WordPress-Core and WordPress-Docs (`phpcs_standard`).
- PHPCS needs PHP and Composer on the machine and the WPCS standard installed; the status line under the title says what is missing and the command to fix it.
- The `phpcs-before-done` rule (warn only) logs a warning at the end of a turn that edited PHP without running PHPCS.

## Built-in helpers

Four small scripts run on their own: startup notes, the context nudge, doc and test hints, and session drafts. Each is one button (on or off) and obeys the master mode: with the mode off, none run. They are stored under `helpers` in the config.

## Config files

| File | Holds |
| --- | --- |
| `~/.claude/lean-project.json` | Everything you set in the panel. The panel writes it; you can also edit it by hand. |
| `<project>/.lean-project.json` | Per-project tuning of `rules`, `routing`, `agent_caps` and limits. It cannot change `mode`, `workflow`, `custom_rules` or `demo_pattern`, since that file can arrive with a cloned repo. |
| `~/.claude/lean-violations.tsv` | The rule hit log, trimmed to its last 500 lines. |

Keys: `helpers`, `phpcs_standard`, `mode`, `rules`, `custom_rules`, `routing`, `agent_caps`, `max_agents`, `delegate_after_lead_calls`, `context_limit`, `workflow`, `pr_repos`, `state_file`, `demo_pattern`, `auto_memory`, `auto_lessons`.

```json
{
  "mode": "block",
  "rules": { "routing-line": "warn", "max-agents": "block" },
  "routing": { "code": "sonnet:high", "complex": "opus:high", "read": "haiku:low" },
  "agent_caps": { "code": 3, "complex": 2 },
  "max_agents": 6,
  "delegate_after_lead_calls": 8,
  "context_limit": 300000,
  "pr_repos": ["my-plugin"],
  "auto_memory": true,
  "custom_rules": [
    { "id": "no-force-push", "tool": "Bash", "match": "\\bgit\\s+push\\b[^|;&]*--force", "message": "no force push", "level": "block" }
  ]
}
```

`state_file` names the state file when it is not called HANDOFF or STATE; `demo_pattern` is the regular expression of paths a public repo must not receive.

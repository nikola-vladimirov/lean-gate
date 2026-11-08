# The lean-gate manual

Contents table below: open only the section you need.

<!-- toc -->
- 39-53: How to keep this manual current
- 54-88: Install, update and the rename
- 89-361: The panel
  - 93-103: Opening, closing, folding
  - 104-117: Explain
  - 118-138: The top row
  - 139-156: Project
  - 157-168: Rules
  - 169-192: Rule builder
  - 193-208: Model routing
  - 209-219: Workflow and limits
  - 220-240: Settings
  - 241-252: Built-in helpers
  - 253-266: Project memory
  - 267-277: Board
  - 278-290: Lessons and local rules
  - 291-299: Review
  - 300-310: Ponytail
  - 311-324: WordPress checks
  - 325-341: Packs
  - 342-352: Rule stats (7 days)
  - 353-361: Recent violations
- 362-424: Rules
  - 412-424: Custom rules
- 425-491: Configuration
  - 473-491: Files
- 492-519: CLI reference
- 520-547: Hooks and helpers
- 548-577: Skills and vendored tools
<!-- /toc -->

This is the one place that documents every function of lean-gate: the panel, the rules, the settings, the command line, the hooks and the bundled tools. Version 1.0.0-beta.8. Short pages for special topics: [HUB.md](HUB.md) (the hub, project registry and layout), [../README.md](../README.md) (features, delegation, install).

## How to keep this manual current

Every feature or fix updates this file in the same commit. The self-test enforces the minimum:

- `bash bin/lean-gate selftest` fails with `docs/MANUAL.md does not name: ...` when a rule id (`RULES` in `hooks/gate.ts`), a config key (the `Config` type), a CLI command (the dispatch in `bin/lean-gate`) or a panel button (the `EXPLAIN` keys in `hooks/text.ts`) is not written in backticks here.
- It also fails when a panel button (`gb('key', ...)` in `hooks/register.tsx`) has no Explain line in `hooks/text.ts`.

Rules for editing it:

1. Name each thing where it is explained, in backticks: `max-agents`, `quiet`, `memory`, `set-reset`. A bare list of names does not count as documentation.
2. A new button needs three things: the button, its line in `EXPLAIN`, and a row in the matching section below.
3. A new rule needs a row under [Rules](#rules-1) with its default level and what it checks. A new config key needs a row under [Configuration](#configuration).
4. Run `bash bin/lean-gate toc docs/MANUAL.md` to refresh the contents table after adding headings.
5. No em dashes anywhere in this file (the `no-em-dashes` rule refuses them in commit messages and written files).

## Install, update and the rename

Install in Claude Code:

```
/plugin marketplace add nikola-vladimirov/lean-gate
/plugin install lean-gate@lean-gate
```

Update with `claude plugin update lean-gate`, then restart. It needs bash (built in on macOS and Linux, Git Bash on Windows). Delegation also needs `curl` and `node`. PHPCS needs PHP and Composer. `lean-gate icm` needs Python 3.

**The rename.** lean-project is the old name of lean-gate. The `lean-project` command still works as an alias. At the first session after the update, the shell hooks copy (never move) your old files once, so a rollback to the old plugin still finds its own:

| Old | New |
| --- | --- |
| `~/.claude/lean-project.json` | `~/.claude/lean-gate.json` |
| `~/.claude/lean-project/memory` | `~/.claude/lean-gate/memory` |
| Old plugin data folder (lessons, archive, last full review, session drafts, setup marks) | The `lean-gate-*` data folder |
| `<project>/.lean-project.json` | `<project>/.lean-gate.json` (the old file is still read while the new one does not exist) |
| Rule `lean-project-first` | Rule `lean-gate-first` (an old rule id in a config file still sets the new one) |

The per-project delegation file keeps its old name, `.lean-project`, and so does `.lean-project-setup`.

**Hub first-run.** The hub carries its own ponytail and performance audit. While the standalone plugins are still enabled, the hub stays quiet about them so nothing loads twice. Press `pt-retire` (Switch off standalone plugins) or run `lean-gate vendor retire` once, then restart. Then open the panel and set `mode` to `block` for enforcement, or leave it on `warn` to try it first.

**Plugin options** (shown by `/config`):

| Option | Default | What it does |
| --- | --- | --- |
| Context limit | 300,000 tokens | When the fresh-session reminder first speaks up. The `context_limit` in the lean-gate config beats it. |
| Remind again every | 50,000 tokens | How often the reminder repeats after that. |
| Always back up docs before editing | off | On: copy every doc to a dated backup folder before lean-gate edits it. Off: back up only when the project is not under version control. |
| Backup folder | `backups` | Where backups go, relative to the project folder. |
| Session draft folder | empty | Where end-of-session handoff drafts go (for example a folder in an Obsidian vault). Empty: the plugin data folder. |

## The panel

The panel is the control surface. It sits in a docked pane beside the chat, shows how the session is going, and lets you change every setting with a button press. Everything it does is also stored in plain JSON (see [Configuration](#configuration)).

### Opening, closing, folding

- The panel opens by itself at session start, as the Settings button `set-panel` says (default: compact). `/lean-gate` opens it again.
- `hide` (Close lean-gate panel, the last button) closes it. While it is closed, an Open lean-gate panel button shows above the prompt.
- `details` shows the sections below the top row; the button then reads Compact, and pressing it hides them again.
- Each section title (▾ open, ▸ closed) is a button that folds it. Folds are remembered for the session only.
- A button that steps through choices (a level, a model, an effort, a cap) moves to the next choice on each press and writes the config file at once.
- Buttons are drawn with chrome. The main action of a row is primary (filled): for example `proj-add`, `rb-add`, `mem-remember`, `set-target`, `audit-run`.
- Colour: each section title has its own accent bar, and the title takes that colour under the pointer (a button takes no colour at rest). Rule groups have their own colours too. Colours are theme keys (`SECTION_COLOR`, `GROUP_COLOR`, `LEVEL_COLOR`, `MODEL_COLOR` in `hooks/text.ts`), so both light and dark themes read them.
- Info icons: in the desktop app (and the editor and mobile app) a small i after the rule group titles, the Model routing rows and the Rule builder card shows help on hover (`GROUP_HELP`, `ROUTING_HELP`). The terminal draws no icons; Explain covers it there.

### Explain

`explain` (Explain, then Hide help) puts a one-line explanation beside every button, and stacks the top row one item per line with a legend. The lines come from `EXPLAIN` in `hooks/text.ts`; the legend from `TOP_LEGEND`. The same text is expanded in the tables below. The legend says:

| Top row item | Legend |
| --- | --- |
| ● and the level | The master mode (off, warn, block). |
| lead / sub | Reads the main session made itself, and subagents it started. Orange: many reads in a row with no edit. |
| used / limit and the bar | Context used against the context limit, with a ten-cell bar. Orange from 70 percent, red from 90. |
| ✓ age or ⚠ stale | When the state file was last touched. Stale: code changed after it, or it is over an hour old. |
| tests | The result of the last test command (pass, fail, none). |
| review due or reviewed | Whether code changed since the last review mark. |
| ⚠ n | Rule hits (warnings and blocks) recorded; the list is under Recent violations. |

### The top row

| Key | Label | What it does |
| --- | --- | --- |
| `mode` | The level next to a dot: off, warn or block | The master level. At off nothing is checked. At warn every rule only warns. At block each rule uses its own level. Press to cycle. Always saved to the global file. |
| `route` | route main | Model for this task only: main (no instruction), haiku, sonnet, opus, fable or free (a free OpenCode model). Anything but main adds a "Routing for this task" line (for example `opus:xhigh`) to the session prompt. Session only, not saved. |
| `route-effort` | The effort, beside route | Shown for a real model (not main or free). Cycles low, medium, high, xhigh, max. |
| `setup` | Set up project | Shown while the folder is not registered. Adopts the folder if it looks like a project, starts a new one if it does not. |
| `new` | New session | Shown from 80 percent of the context limit. Asks Claude to update the state file, then to tell you to start a fresh session. |
| `state` | Update state | Shown when the state file is stale. Asks Claude to bring HANDOFF or STATE up to date. |
| `tests` | Run tests | Shown unless the last run passed. Asks Claude to run the project's tests. |
| `review` | Review | Shown while a review is due. Toasts the first lines of the `review-scope` report: the code changed since the last release tag. |
| `reviewed` | Reviewed | Shown while a review is due. Marks the current commit reviewed, so a release tag passes `release-needs-review`. |
| `details` | Details or Compact | Shows or hides the sections below. |
| `explain` | Explain or Hide help | Shows or hides the explanation lines. |
| `hide` | Close lean-gate panel | Closes the panel. |

The counters `lead 6 / sub 0` and the meter `250k/300k` with its bar have no button. The state, tests, review and `⚠` items are coloured pills: green fine, orange needs attention, red failed; dim when there is nothing yet. The state item reads `state -` before any code or state edit is seen. The violations item `⚠ 4` counts hits; the log keeps the latest 50 for the panel and 2000 lines on disk (enough for a week of `lean-gate stats`).

Example: `mode` on warn, `route` on opus with `route-effort` xhigh. The next prompt carries "Routing for this task: opus:xhigh". Closing the session forgets it.

### Project

Detection and setup for the folder you are in. The registry is `~/.claude/lean-projects.json` (name, path, aliases). The line under the title says whether the folder is registered, a project folder that is not registered (it has `AGENTS.md`, `CLAUDE.md`, `.git`, a README or a package file), or neither.

| Key | Label | What it does |
| --- | --- | --- |
| `proj-add` | Register this folder | Adds this folder to the registry, so it is recognised in any chat. Shown while unregistered. |
| `proj-remove` | Unregister | Removes this folder from the registry. Shown while registered. |
| `proj-all` | Register folders here | Registers every child folder (the first 60, not hidden, not `*-reference`, `archive` or `backups`) that holds `.git`, `AGENTS.md`, `CLAUDE.md`, `package.json` or `composer.json`. |
| `proj-start` | Start project | Asks Claude to start a new project here: the setup cards in `STARTUP.md`, then the `AGENTS.md` layout of `STRUCTURE.md`. It asks what the project is for first. |
| `proj-adopt` | Adopt this folder | Asks Claude to adopt this folder: audit, then a migration map. Nothing changes before your approval. Existing `CLAUDE.md` and state file stay. |
| `proj-walk` | Walk test | Asks Claude to orient from the files alone and report the next step and the status. |
| `proj-attach` | Attach name | Appears when a prompt names another registered project. Reads that project's entry and state file into this chat, without editing there. |
| `proj-switch` | Switch folder | Moves this session to the mentioned project's folder (the `change_directory` tool). |
| `proj-ignore` | Ignore | Dismisses the project mention. |

A name or alias must be four letters or more to count as a mention, and nothing happens without your press. Example: in a chat started in a scratch folder, type "fix the Nashenski checkout". A line appears with Attach, Switch folder and Ignore.

### Rules

Each rule row starts with a dot in its level colour: grey off, orange warn, red block.

Rules check what Claude does and either warn or refuse. See [Rules](#rules-1) below for what each checks. The panel lists them in groups, each row a level button, the rule name and a dim one-line meaning (`RULE_INFO`).

| Key | Label | What it does |
| --- | --- | --- |
| `rule` | The level: off, warn or block | One button per rule (and per rule of yours). Press to cycle off, warn, block. |

The master level caps these. Example: to keep agents strict but let a missed state-file update only warn, set `agent-needs-model-effort` to block, leave `state-file-fresh` on warn, then set `mode` to block.

### Rule builder

Make your own rule without typing a regular expression. The panel has buttons, not text fields; anything beyond the presets goes through `rb-ask` or straight into `custom_rules`.

| Key | Label | What it does |
| --- | --- | --- |
| `rb-pattern` | pattern: name (tools) | Steps through the ready-made patterns below. The draft sits in a bordered card; its regular expression is on the info icon (app) or under the buttons while Explain is on (terminal). |
| `rb-level` | level: warn | The level the new rule gets. It steps off, warn, block (so it can also land on off). |
| `rb-add` | Add rule | Adds the chosen pattern to `custom_rules` in the global file, as `custom-<pattern id>` (`-2`, `-3` for repeats). It appears in the Rules list under Your rules. |
| `rb-del` | Remove id | One button per rule of yours. Deletes it and its level entry. |
| `rb-ask` | Ask Claude to write a custom rule | Claude asks what it should catch, then writes an entry to `custom_rules`. |

| Pattern | Tools | Message |
| --- | --- | --- |
| force push | Bash | no force push |
| rm -rf | Bash | recursive force delete |
| sudo | Bash | no sudo |
| new dependency | Bash | adding a dependency: is it needed? |
| hardcoded secret | Edit, Write | looks like a hardcoded secret |
| debug leftover | Edit, Write | debug output left in code |
| TODO left | Edit, Write | unfinished marker written |

Example: choose force push, level block, Add rule. From then on a `git push --force` is refused. See [Custom rules](#custom-rules) for the entry format and limits.

### Model routing

Tells Claude which model and effort to use for each kind of work, and how many agents of each kind may run in a turn. Five sections: Reading and writing (text, images), Coding, Complex coding, Review, Planning (config keys `read`, `code`, `complex`, `review`, `plan` under `routing` and `agent_caps`). Folded, each row still shows its choice beside the title, for example `opus:high, 3 at once`, in the colour of its model (haiku green, sonnet blue, opus purple, fable orange, free grey). Each section is a fold with three buttons:

| Key | Label | What it does |
| --- | --- | --- |
| `rt-model` | model: sonnet | Model for this kind of work: haiku, sonnet, opus, fable or free. Haiku is not offered for the two coding sections. Agents of that kind must use it. One button per section (`rt-code-model` and so on). |
| `rt-effort` | effort: high | Effort: low, medium, high, xhigh or max. Not shown for free. |
| `rt-cap` | agents at once: no limit | How many agents with this model and effort may run in one turn: no limit, 1, 2, 3, 4 or 6. |

Defaults: Reading and writing `sonnet:medium`, Coding `sonnet:high`, Complex coding, Review and Planning `opus:high`, no caps. The `agent-needs-model-effort` rule refuses agents without a model and an effort, and its message lists this table. The session prompt also carries the table, with a line saying the panel outranks any guide that names a model.

How the cap works: an agent counts toward every section whose model and effort match the agent's. With the defaults, an `opus:high` agent counts toward Complex coding, Review and Planning together. An agent that would go over a cap is refused (when `max-agents` is on block) and does not count. Counts reset on each new prompt.

Example: set Coding to sonnet, high, 3 agents. Claude may run three `sonnet:high` agents at once; a fourth is refused until the next prompt.

### Workflow and limits

| Key | Label | What it does |
| --- | --- | --- |
| `wf-agents` | max agents per turn | The overall limit on subagents in one turn: no limit, 2, 3, 4, 6 or 8 (`max_agents`). |
| `wf-delegate` | delegate after N reads | Reads in a row the main session may do before `delegate-more` steps in: 4, 6, 8, 12 or 16 (`delegate_after_lead_calls`). |
| `wf-context` | context limit | The size the context meter counts against: 200k, 300k, 500k or 1M (`context_limit`). The context nudge hook uses the same value. |
| `wf-edit` | Edit workflow text | Asks Claude to write the workflow note (`workflow`): up to 600 characters added to the session prompt every session. You cannot type in the panel. Claude cannot be forced to follow it; the enforced parts are the rules and routing. |

Example workflow text: `Reading and research go to haiku subagents. Code goes to sonnet:high, at most 3 agents. Plan first, then build, then test, then review with opus.` Only the global config can set the workflow text, because a project file can arrive with a cloned repo.

### Settings

Presses save to the global file, or to this project's `.lean-gate.json` while the switch says so. The `mode`, `workflow`, `custom_rules` and `demo_pattern` always go global. The labels show the merged value (global plus project).

| Key | Label | What it does |
| --- | --- | --- |
| `set-target` | saving to: global or this project | Where presses save. Applies to the rule levels, routing, caps, limits, helpers, automatic switches, PHPCS standard, `pr_repos`, `reminders`, `scope`, `quiet` and `panel_start`. The state file below always saves in the project file. |
| `set-rem` | state reminder, test reminder, PHPCS reminder: once or every turn | One button per end-of-turn rule (`state-file-fresh`, `tests-before-done`, `phpcs-before-done`), stored in `reminders`. Once: one warning a session until a turn fixes it. Every turn: a warning each turn. |
| `set-scope` | rules judge: projects only or everywhere | `scope`. Projects only: the session rules (`lean-gate-first`, `state-file-fresh`, `tests-before-done`, `phpcs-before-done`) skip folders that are not projects, such as a scratch chat. Everywhere: scratch chats too. |
| `set-quiet` | quiet warnings: on or off | `quiet`. On: warnings are counted and listed under Recent violations without a pop-up. Blocks still show. |
| `set-panel` | panel at start: compact | `panel_start`. How the panel opens at session start: details, compact or closed (the Open button above the prompt still shows). |
| `set-statefile` | state file: HANDOFF or STATE | `state_file`. Steps: any file named HANDOFF or STATE, `docs/PLAN.md`, `AGENTS.md`. The gate watches this file for `state-file-fresh` and the stale marker. Saved in this project's file. |
| `set-pr` | PR only for repo: on or off | Adds or removes this repo's folder name in `pr_repos`. On: a push to main or master is refused by `one-pr-per-fix`. Needs a git repo. |
| `set-demo` | public push blocks: folders and files | `demo_pattern`. Two presets: folders and files (demo folders, also zip, sql, log and env files), or folders only (demo, example, sample, screenshot, scratch, backup and fixture folders). Shows "custom pattern" when you set another by hand. Global only. |
| `set-reset` | Reset to defaults | Copies the global file to `lean-gate.json.reset-bak`, then writes `{}` so every value is its default. Project files, memory and lessons are untouched. |
| `set-undo` | Undo reset | Shown while `lean-gate.json.reset-bak` exists. Puts the saved settings back. |
| `set-export` | Export | Writes your global settings to `lean-gate-settings.json` in the current folder. |
| `set-import` | Import | Shown while `lean-gate-settings.json` exists in the current folder. Replaces the global settings with it; the old file is saved as `lean-gate.json.import-bak`. A file that is not a JSON object is refused and nothing changes. |

Example: move your setup to a second machine. Press `set-export` on the first, copy `lean-gate-settings.json` into any folder on the second, open the panel there and press `set-import`.

### Built-in helpers

Small shell scripts that run on their own. Each is one button (on or off) and obeys the master mode: with `mode` off, none run. They are stored under `helpers` in the config. Details of each: [Hooks and helpers](#hooks-and-helpers).

| Key | Label | What it does |
| --- | --- | --- |
| `hk-startup_notes` | startup notes | The standing rules printed at session start. |
| `hk-context_nudge` | context nudge | The reminder to start a new session past the context limit. |
| `hk-guard_hints` | doc and test hints | Hints to check docs against code and tests against the test rules. |
| `hk-session_drafts` | session drafts | A handoff draft saved when a session ends. |
| `hk-ponytail` | ponytail hooks | Ponytail's hooks: its rules at session start, for subagents and on `/ponytail`. Same switch as the Ponytail section. |

### Project memory

Short dated notes kept per project, so a new session knows what was decided. Notes live in `~/.claude/lean-gate/memory/<project>/`. The line shown is the index: note count, newest note and linked projects.

| Key | Label | What it does |
| --- | --- | --- |
| `mem-remember` | Remember | Asks Claude to add a note for what was decided or done in this session. |
| `mem-recall` | Recall | Asks Claude to read the notes and say where the project stands. |
| `mem-forget` | Forget last | Archives the newest note to `notes-archive.md` (never deleted). |
| `mem-auto` | automatic: on or off | `auto_memory`. On: the session prompt tells Claude to record decisions, milestones and facts the next session needs by itself. This works by instruction, so it depends on Claude following it. |
| `mem-link` | link to, then a project name | Shown when other projects have notes. Links this project to that one, so recall also reads its newest notes. One button per project. |

Example note: `lean-gate memory add "Chose per-section agent caps over one global cap" --tag decision`. See the `memory` command for the full set.

### Board

The shared task board is how parallel agents and sessions talk to each other. Agents cannot see each other, so the board is one append-only file (`BOARD.md` in the project's docs folder) read and written through the `board` command. The panel only reads it: cards are created by the lead when work is delegated, so it says "not read yet" or "no board here yet" until a project has one.

| Key | Label | What it does |
| --- | --- | --- |
| `board-refresh` | Refresh | Reads the shared task board again. |
| `board-ask` | Ask Claude to check it | Asks Claude which cards are blocked and what each needs. |

See `skills/lean-gate/BUILD.md`, "Board", for how agents use it.

### Lessons and local rules

A lesson is a note about what to do differently. The first sighting is logged. When the same lesson is recorded a second time it becomes a line under "Local rules" at the top of the lessons file, which every session reads first. Local rules outrank the defaults.

| Key | Label | What it does |
| --- | --- | --- |
| `les-refresh` | Refresh | Reads the lessons file again (what `lean-gate lessons` prints). |
| `les-add` | Add lesson | Asks Claude to record one with `lean-gate lesson`; it asks what it should say. |
| `les-review` | Review old | Asks Claude to go through unpromoted lessons older than 14 days and rewrite each into a rule or drop it. Dropped lessons move to an archive. |
| `les-auto` | automatic: on or off | `auto_lessons`. On: Claude records a lesson by itself when you correct it or it repeats a mistake. |

Example: `lean-gate lesson "Run the tests before saying done"`. Recording the same text again promotes it to a local rule.

### Review

Code, performance and security reviews are a release gate, not a step on every task. The `review-scope` command lists the code changed since the last release tag and says whether a full review is due. The review mark is kept outside the repo (`~/.claude/lean-review/`) and is tied to that commit, so later code changes make a review due again and `release-needs-review` refuses a tag.

| Key | Label | What it does |
| --- | --- | --- |
| `a-reviewed` | Reviewed | Marks the current commit reviewed. Shown here while no review is due (the top row has its own `reviewed`). |
| `rv` | Reviewed name | In a folder that is not a repo but holds repos, one button per repo that is due. Marks that repo reviewed. |

### Ponytail

Ponytail (the lazy senior dev rules, MIT) is vendored and part of the hub. Its hooks load the rules at session start, for subagents and on `/ponytail` commands. The line under the title shows its version.

| Key | Label | What it does |
| --- | --- | --- |
| `pt-mode` | mode: off, lite, full or ultra | Ponytail level. Cycles by writing `~/.claude/.ponytail-active`. The `ponytail-active` rule reads the same file. |
| `hk-ponytail` | hooks: on or off | Switches its three hooks (`helpers.ponytail`). Same switch as under Built-in helpers. |
| `pt-update` | Update | Runs `lean-gate vendor update ponytail`: fetches the latest release into `vendor/ponytail`. Review the diff and commit it. |
| `pt-retire` | Switch off standalone plugins | Appears while the separate ponytail, wp-woo-performance-audit or lean-gate-local plugins are still enabled. Switches them off (next session). |

### WordPress checks

The audit and PHPCS check the PHP files changed since the last tag (PHPCS also the uncommitted ones). The status line under the title says what is missing and the command to fix it. Results show as a toast with the last output line.

| Key | Label | What it does |
| --- | --- | --- |
| `audit-run` | Performance audit | Runs `lean-gate audit perf`: the performance and HPOS scan from the vendored wp-woo-performance-audit skill. |
| `phpcs-run` | Run PHPCS | Runs `lean-gate phpcs` with the WordPress standard. Needs PHP and Composer. |
| `phpcs-fix` | Fix with PHPCBF | Runs `lean-gate phpcs fix`: lets PHPCBF fix what it can. |
| `phpcs-std` | standard: WordPress | `phpcs_standard`. Cycles WordPress, WordPress-Extra, WordPress-Core, WordPress-Docs. |
| `phpcs-status` | Refresh | Reads the PHPCS and vendored-tool status again. |

The `phpcs-before-done` rule (warn only) logs a warning at the end of a turn that edited WordPress PHP without running PHPCS. PHP that is not WordPress (a Laravel app, a PHP library) is not judged. WordPress PHP is a file under `wp-content/`, an edit with WordPress calls in it (`add_action`, `wp_*`, `esc_*`, `WC_*`, a plugin header), or any PHP once a WordPress skill is loaded in the session.

### Packs

Packs are sets of skills and plugins that stay off until a task needs them. Every skill or plugin loaded at startup costs tokens in every session, so the rarely used ones are parked. The line under the buttons is the output of `lean-gate pack status`.

| Key | Label | What it does |
| --- | --- | --- |
| `pack-on` | wp on, bricks on, ui-ux on | Brings the pack back (next session). Keys are `wp-on`, `bricks-on`, `ui-ux-on`. |
| `pack-off` | wp off, bricks off, ui-ux off | Parks the pack so it costs nothing at startup (next session). Keys are `wp-off`, `bricks-off`, `ui-ux-off`. |

| Pack | What it holds |
| --- | --- |
| `wp` | The WordPress `wp-*` skills. |
| `bricks` | The Bricks and BricksExtras skills. |
| `ui-ux` | The UI/UX plugin (`ui-ux-pro-max@ui-ux-pro-max-skill`). |

Nothing is deleted: skill folders move between `~/.claude/skills` and `~/.claude/skills-off`, and a plugin pack flips its switch in `settings.json`. Example: before a WordPress task, press `wp on`, then start a new session.

### Rule stats (7 days)

The output of `lean-gate stats 7`, read when the details open: the total, then the five rules with the most hits as bars (red for blocks, orange for warnings, scaled to the noisiest), then the five project folders with the most hits. Use it to find the rule that warns most and is never acted on.

| Key | Label | What it does |
| --- | --- | --- |
| `stats-off` | Turn off rule (n hits) | Sets the noisiest rule of the last 7 days that is still on to off, saved where presses save (global or this project, see Settings). Retired and already-off rules are skipped, so the next press offers the next one. Its level button under Rules turns it back on. |
| `stats-refresh` | Refresh | Reads the stats again. |

Example: `tests-before-done` shows 40 warnings in a week on scratch work; press Turn off, or set the target to this project first to turn it off here only.

### Recent violations

The last five rule hits, newest first, each as block or warn, the rule and a short detail. The two buttons act on the rule of the newest hit and each override is spent after one hit.

| Key | Label | What it does |
| --- | --- | --- |
| `once-allow` | Allow once: rule | Lets the next hit of this rule through, even a block. Spent on the first hit that would really have blocked. |
| `once-block` | Block once: rule | Refuses the next hit of this rule, even a warning. Not available for the warn-only rules (a toast says so). |

## Rules

Each rule has a level: block (the tool call is refused and Claude sees the message; it must fix the problem and try again), warn (the call goes through; the hit is logged, shown as a toast once per rule and turn, and counted in `⚠`), or off. The master `mode` caps them: at off nothing is checked, at warn every rule only warns, at block a rule uses its own level. Warn-only rules are judged after the work, at the end of a turn: `state-file-fresh`, `tests-before-done`, `phpcs-before-done` and `push-after-tag`. They cannot block, and `once-block` does nothing for them.

Each hit is written to `~/.claude/lean-violations.tsv` (time, folder, rule, action, detail). The `quiet` setting hides the pop-up, never the log.

Project-only judging: `lean-gate-first`, `state-file-fresh`, `tests-before-done` and `phpcs-before-done` judge project folders only. A project is a registered folder, or a folder with `AGENTS.md`, `CLAUDE.md`, `.git`, `README.md`, `package.json` or `composer.json`. A scratch chat folder is skipped unless `scope` is everywhere.

Once per session: `state-file-fresh`, `tests-before-done` and `phpcs-before-done` warn once, then stay quiet until a turn fixes the problem (touches the state file, runs tests, runs PHPCS), which re-arms them. `/clear` re-arms them too. Set `reminders` to every turn to warn each turn. They fire only for a turn that edited code files (`.php .js .jsx .ts .tsx .py .sh .css .scss`).

**Agents and models**

| Rule | Default | What it checks |
| --- | --- | --- |
| `agent-needs-model-effort` | block | Every Agent call sets both a model and an effort. The message lists the routing table. |
| `no-haiku-coding` | block | A Haiku agent is refused unless its model and effort exactly match a non-coding section of Model routing and no coding section. With the defaults, give Reading and writing `haiku:low` to allow it there. |
| `free-opencode-only` | block | A Bash command that runs `opencode` (or `opencode-ai`) must name a model whose name ends in `-free` (from `-m` or `--model`); `run` with no model counts as a problem. `--help`, `models`, `auth` and a bare `opencode` are not checked. |
| `delegate-more` | warn | The main session's reads (Read, Grep, Glob; Bash is not counted) in a row. At the limit (`wf-delegate`) it warns "consider a subagent". At block level, the next read after the limit is refused with "delegate bulk reading to a subagent". Edit, Write, an Agent call and a new prompt reset the count. |
| `max-agents` | warn | The overall limit on Agent calls per turn (`wf-agents`) and the per-section caps (`rt-cap`). A refused agent does not count. |
| `review-edited-files-only` | warn | An Agent whose task says review or audit must scope it: name `review-scope`, "edited files", "changed files", `git diff`, or a code file. |
| `distinctive-session-names` | block | A new session (`start_session` or `hand_off_to_session`) needs a title that starts with `HH:MM DD-MM-YYYY` (or `YYYY-MM-DD HH:MM`), then what it is about. A proposal card the person accepts keeps its own title. |

**Every session**

| Rule | Default | What it checks |
| --- | --- | --- |
| `lean-gate-first` | warn | The lean-gate skill (or its old name lean-project) is loaded before code is edited. A load earlier in the transcript counts, so a plugin update or resume does not ask again. After a compaction, one more load may be asked for. Project folders only. |
| `ponytail-active` | warn | Ponytail is on (not `off` in `~/.claude/.ponytail-active`) before code is edited. |
| `state-file-fresh` | warn, warn only | The state file is touched in a turn that edited code. Project folders only, once per session. |
| `tests-before-done` | warn, warn only | A test command ran in a turn that edited code. A test command is a test runner (phpunit, pytest, vitest, jest), `npm`, `pnpm`, `yarn` or `composer test`, `node --test`, `php artisan test`, `claude plugin test`, or an interpreter running a script in a `tests/` folder or named test, check or harness. Lint and typecheck are not tests. The result also feeds the top row `tests` item. |
| `no-em-dashes` | warn | No em dash in text written with Edit or Write, or in a `git commit` command (its message). |

**Releases and git**

| Rule | Default | What it checks |
| --- | --- | --- |
| `release-needs-review` | block | A release action is refused while a review is due. Release actions: `git tag <name>` (not list, delete or verify), a `git push` that sends tags (`--tags`, `--follow-tags`, `--mirror` or a tag-like refspec), `gh release create`, `upload`, `edit` or `delete`, and the `zip.php` build script. If the repo is unknown the block asks for `git -C <dir>` or `cd <dir> &&` in the same command (warn mode allows and logs it). If git does not answer it fails open with a warning. |
| `changelog-before-tag` | warn | Before a tag, a release or `zip.php`: a changelog, changes, history or readme file changed since the last tag. |
| `push-after-tag` | warn, warn only | A tag made in a turn is also pushed (with tags) in that turn. |
| `one-pr-per-fix` | warn | A `git push` from main or master in a repo listed in `pr_repos` (the repo's folder name, switched by `set-pr`). Push a branch and open one PR per fix. |
| `no-demo-files-public` | warn | A `git push` to a public repo (needs the `gh` CLI to learn visibility; silent without it) does not carry paths that match `demo_pattern`: demo, example, sample, screenshot, scratch, backup or fixture folders, or zip, sql, log or env files. The first five are listed. |

**WordPress and docs**

| Rule | Default | What it checks |
| --- | --- | --- |
| `wp-skills-for-wp-code` | warn | A wp-*, wordpress or woocommerce skill is loaded before WordPress code is edited. WordPress code is a PHP file under `wp-content/`, or PHP text that uses `add_action`, `add_filter`, `wp_*`, `esc_html`, `ABSPATH`, `WC_*`, `woocommerce_*` or a `Plugin Name:` header. An edit of plain lines with none of those words passes. A load earlier in the transcript counts. |
| `docs-before-builder` | warn | The official docs were read before Bricks or WordPress code is edited. Reading docs means a web fetch or search, a Read of a docs, documentation or reference folder or `WORDPRESS.md`, or loading a wp or Bricks skill. |
| `phpcs-before-done` | warn, warn only | PHPCS ran in a turn that edited WordPress PHP (other PHP is not judged; see WordPress checks). PHPCS means `phpcs`, `phpcbf`, a composer lint script or `lean-gate phpcs`. Project folders only, once per session. |

### Custom rules

Your own rules sit in `custom_rules` (global file only) and appear under Your rules with a level button like the built-in ones. Each entry:

```json
{ "id": "no-force-push", "tool": "Bash", "match": "\\bgit\\s+push\\b[^|;&]*--force", "message": "no force push", "level": "block" }
```

- `id`: 1 to 40 letters, digits, `_` or `-`; not a built-in rule id.
- `tool`: the tool names to watch, `"Bash"`, `"Edit|Write"`, or `"*"` for all.
- `match`: a case-insensitive regular expression over the call's text (the command for Bash, the new text for Edit or Write, the description and prompt for Agent, else the input as JSON). At most 300 characters. Patterns that could hang the client (nested quantifiers, backreferences) are refused. Only the first 4000 characters of the text are tested.
- `message`: shown on a block (up to 200 characters). `level`: warn (default) or block.

## Configuration

Order: defaults, then the global file, then the project file. `rules`, `routing`, `agent_caps`, `helpers` and `reminders` merge per key. A wrong-typed value is ignored. A project's `.lean-gate.json` may arrive with a cloned repo, so it cannot set `mode`, `workflow`, `custom_rules` or `demo_pattern`; those come from the global file only.

| Key | Meaning | Default | Allowed | Where | Example |
| --- | --- | --- | --- | --- | --- |
| `mode` | Master level | `warn` | off, warn, block | Global | `"mode": "block"` |
| `rules` | Level of each rule or custom rule | See the Rules tables | off, warn, block per rule id | Both | `"rules": {"max-agents": "block"}` |
| `custom_rules` | Your own rules | none | List of entries, see Custom rules | Global | see above |
| `routing` | Model and effort per kind of work | read `sonnet:medium`, code `sonnet:high`, complex, review and plan `opus:high` | `model:effort` text, or `free` | Both | `"routing": {"code": "sonnet:high"}` |
| `agent_caps` | Most agents per kind in one turn | 0 (no limit) for each | Whole number, 0 or more | Both | `"agent_caps": {"code": 3}` |
| `max_agents` | Most Agent calls in one turn | 0 (no limit) | Whole number, 0 or more | Both | `"max_agents": 6` |
| `delegate_after_lead_calls` | Reads in a row before `delegate-more` acts | 8 | Positive number | Both | `"delegate_after_lead_calls": 12` |
| `context_limit` | Tokens the context meter and nudge count against | 300000 | Positive number | Both | `"context_limit": 500000` |
| `workflow` | Note added to the session prompt | empty | Text, cut at 600 characters | Global | `"workflow": "Plan, build, test."` |
| `pr_repos` | Repo folder names that take pull requests only | none | List of names (up to 40) | Both | `"pr_repos": ["my-plugin"]` |
| `auto_memory` | Claude records project memory by itself | false | true or false | Both | `"auto_memory": true` |
| `auto_lessons` | Claude records lessons by itself | false | true or false | Both | `"auto_lessons": true` |
| `phpcs_standard` | The PHPCS standard | `WordPress` | A standard name, 3 to 30 letters or `-` | Both | `"phpcs_standard": "WordPress-Extra"` |
| `helpers` | The shell helper switches | all on | `startup_notes`, `context_nudge`, `guard_hints`, `session_drafts`, `ponytail`: true or false | Both | `"helpers": {"context_nudge": false}` |
| `state_file` | The state file the gate watches | empty (any HANDOFF or STATE .md) | A path suffix such as `docs/PLAN.md` | Project (the panel saves it there) | `"state_file": "AGENTS.md"` |
| `demo_pattern` | Regular expression of paths a public repo must not receive | `(^\|/)(demos?\|examples?\|samples?\|screenshots?\|scratch\|backups?\|fixtures)/\|\.(zip\|sql\|log\|env)$` | A valid regular expression | Global | `"demo_pattern": "(^\|/)demo/"` |
| `reminders` | How end-of-turn reminders repeat | none (every rule: once) | per rule id: once or every | Both | `"reminders": {"tests-before-done": "every"}` |
| `scope` | Which folders session rules judge | `projects` | projects or everywhere | Both | `"scope": "everywhere"` |
| `quiet` | Warnings without a pop-up | false | true or false | Both | `"quiet": true` |
| `panel_start` | How the panel opens at session start | `compact` | details, compact or closed | Both | `"panel_start": "closed"` |

Everything the panel does maps to one of these keys, so a hand-edited file and the buttons never disagree. The panel writes the file with the rest of your keys kept. A file that is unreadable or not a JSON object is never overwritten (a toast says so).

A complete example:

```json
{
  "mode": "block",
  "rules": { "tests-before-done": "warn", "max-agents": "block" },
  "routing": { "code": "sonnet:high", "complex": "opus:high", "read": "haiku:low" },
  "agent_caps": { "code": 3, "complex": 2 },
  "max_agents": 6,
  "delegate_after_lead_calls": 8,
  "context_limit": 300000,
  "pr_repos": ["my-plugin"],
  "auto_memory": true,
  "reminders": { "tests-before-done": "every" },
  "scope": "projects",
  "panel_start": "details"
}
```

### Files

| File | Holds |
| --- | --- |
| `~/.claude/lean-gate.json` | Everything you set in the panel. The panel writes it; you can edit it by hand. (`CLAUDE_CONFIG_DIR` replaces `~/.claude` for the panel.) |
| `~/.claude/lean-gate.json.reset-bak` | The global file as it was before the last `set-reset`. |
| `~/.claude/lean-gate.json.import-bak` | The global file as it was before the last `set-import`. |
| `lean-gate-settings.json` | In the current folder: the file `set-export` writes and `set-import` reads. |
| `<project>/.lean-gate.json` | Per-project tuning. Old name `.lean-project.json` is still read while no new file exists. |
| `~/.claude/lean-violations.tsv` | The rule hit log: time, folder, rule, action (block, warn or allow-once), detail. Trimmed to its last 2000 lines at session start. `lean-gate stats` and the Rule stats section read it. |
| `~/.claude/lean-projects.json` | The project registry: name, path, aliases. |
| `~/.claude/lean-review/` | The review marks, one small file per repo, kept outside the repo so they never ship in a zip. |
| `~/.claude/lean-gate/memory/<project>/` | Project memory: `notes.md`, `notes-archive.md`, `links`. The `LEAN_MEMORY` variable moves the root. |
| `~/.claude/.ponytail-active` | Ponytail's level: off, lite, full or ultra. |
| Plugin data folder (`~/.claude/plugins/data/lean-gate-*`) | `LESSONS.md` and `LESSONS-ARCHIVE.md`, the session drafts in `sessions/`, `last-full-review`, `gain.tsv`, and the marks the hooks keep (`nudge-*`, `guard-*`, `setup-nag-*`). Survives plugin updates. Never leaves your machine. |
| `<project>/.lean-project` | The delegation choice, `key=value` lines (see the `delegate` command). |
| `<project>/.lean-project-setup` | A date and "new" or "adopted": proof the setup cards were run. The session-start hook reminds in up to three sessions until it exists. |
| `<project>/docs/BOARD.md` | The shared board (`LEAN_BOARD` overrides the path). |

## CLI reference

The `lean-gate` command is on Claude's PATH while the plugin is enabled. You can run it too: `bash <plugin folder>/bin/lean-gate`. Bash and POSIX awk only. With no or an unknown command it prints its usage. Details for Claude: `skills/lean-gate/TOOLS.md`.

| Command | Forms | What it does |
| --- | --- | --- |
| `map` | `map <file>`, `map <dir> [min]`, `map predict <file>` | Outline with line ranges (markdown headings; classes and functions in code). For a folder: files of `min` lines or more (default 300), largest first. `predict`: files that changed in the same commits as the file over the last 10 commits, with their maps. Example: `lean-gate map src/big.php`. |
| `toc` | `toc <file>... [--force]` | Build or refresh the contents table between `<!-- toc -->` markers. Files under 80 lines are skipped unless `--force`. Example: `lean-gate toc docs/MANUAL.md`. |
| `cost` | `cost [dir]` | Tokens auto-loaded every session, the startup baseline from recent sessions, every doc with flags (`NEEDS TOC`, `STALE TOC`, `STATE FILE OVER 60 LINES`), and lines duplicated across files. |
| `selftest` | `selftest` | Checks the tool on this machine, including that this manual names every rule, config key, command and panel button. |
| `sessions` | `sessions [n] [--here]` | The newest session drafts: date, project, path. `--here` keeps this project's only. |
| `review-scope` | `review-scope [--full-done]` | The code changed since the last release tag, and whether a full review is due (a new major version, or 5 or more minor releases since the last full one). `--full-done` records one. Needs a release tag. |
| `board` | `board`, `board <id>`, `board add <id> <title>`, `board move <id> todo, doing, blocked or done [why]`, `board note <id> <text>`, `board files <id> <paths>` | The shared task board. No argument: columns and the latest notes. With an id: that card's history. `add` makes a card, `move` changes its status (a reason after blocked shows on the card), `note` posts a one-line fact, `files` records the files a card changes; `move ... done` runs `check gate` on them. Posts are idempotent. `LEAN_BOARD` is the board file, `LEAN_AS` the writer's name (default `lead`). |
| `check` | `check gate <id> [files...]` | Run the done gate by hand: `php -l` and, when installed, `phpcs` with the WordPress standard (or the project's `phpcs.xml`). A failure sends the card back to todo with the output on the card. |
| `handoff` | `handoff [docs/PLAN.md]` | Prints a draft of the state file: branch, next open tasks, cards in flight. Writes nothing. |
| `audit` | `audit waste [dir] [--apply]`, `audit security [dir or files...]`, `audit perf [dir or files...]` | `waste`: comment blocks of 8 or more lines, debug `error_log()` calls and repeated hooks; dry run unless `--apply`, which moves comment blocks verbatim into `docs/ARCHIVE.md` (git repos only). `security`: read-only scan of PHP and JS for WordPress anti-patterns (unescaped output, SQL without `prepare`, missing nonce or capability checks). `perf`: performance and HPOS scan of WordPress and WooCommerce code. Pass the files `review-scope` lists at release. |
| `frontier` | `frontier [docs/PLAN.md]` | The decisions to ask now (status open, every prerequisite decided) and what waits on them. |
| `lesson` | `lesson "<text>" [--mode M] [--project P]` | Records a lesson. The second sighting of the same text becomes a line under "Local rules" and its entries move to `LESSONS-ARCHIVE.md`. |
| `lessons` | `lessons`, `lessons review [days]`, `lessons drop "<text>"`, `lessons export <file> [--force]` | No argument: the local rules and where the lessons file is. `review`: unpromoted lessons older than `days` (default 14). `drop`: move the entries with that text to the archive, marked superseded (never deleted). `export`: write the lessons as a markdown note with frontmatter, for example into a vault; an existing note is kept without `--force`. |
| `delegate` | `delegate config`, `delegate set <key> <value>`, `delegate check`, `delegate pick`, `delegate run <brief> <output>` | Sends bulk work to the runner this project chose. `config` shows the choice. `set` saves a key in `.lean-project`: `runner` (none, llama, ollama, unsloth, opencode, aider, goose), `fallback`, `llama_url`, `llama_model`, `ollama_url`, `ollama_model`, `unsloth_url`, `unsloth_model`, `aider_model`, `opencode_cli`, `opencode_model` (must be an `opencode/*-free` model), `opencode_auto` (0 or 1). `check` says whether the runner is up. `pick` prints the runner in use now (first one up in the fallback order, else none). `run` writes the answer to a file; exit status 3 means no runner is up, so Claude does the work. Example: `lean-gate delegate run brief.md answer.md`. |
| `pack` | `pack status`, `pack on <name>`, `pack off <name>` | Skill packs and plugins that stay off until needed (names: bricks, wp, ui-ux). Takes effect in the next session. |
| `vendor` | `vendor status`, `vendor update ponytail`, `vendor update icm`, `vendor retire` | `status`: vendored versions and which standalone plugins are still enabled. `update`: fetch the latest ponytail (needs `gh`) or icm-architect into `vendor/`; review the diff, run the tests, commit. `retire`: switch off the standalone plugins the hub contains (the old `settings.json` is kept as `settings.json.bak`). |
| `phpcs` | `phpcs status`, `phpcs [files...]`, `phpcs fix [files...]` | PHP_CodeSniffer with the WordPress standard. `status`: version and whether the standard is installed. Without files: PHP changed since the last tag plus uncommitted ones. `fix` uses PHPCBF. Finds Laragon PHP and a global Composer install when they are not on the PATH. It reads `phpcs_standard` from the global file only. |
| `icm` | `icm links [root]`, `icm index <folder>`, `icm viz [root]` | The ICM checks on a hub project (needs Python 3). `links`: every relative link and input path that does not resolve; exit 1 if any. `index`: write `_index.md` in the folder. `viz`: draw the workspace as one interactive graph. |
| `memory` | `memory add "<text>" [--tag decision, state, link or note] [--project P]`, `memory list`, `memory recall`, `memory forget <n>`, `memory link <other>`, `memory unlink <other>`, `memory index`, `memory projects` | Per-project memory. `add` writes a dated note. `list` numbers the notes. `recall` prints the notes plus the newest three of each linked project. `forget` moves note n to `notes-archive.md`. `link` and `unlink` tie projects together (both need notes). `index` is the one line session start prints. `projects` lists every project with its note count. The project is the git top-level folder name, lowercased. |
| `gain` | `gain [dir]` | Appends one line per run to `gain.tsv` in the plugin data folder: date, project, auto-loaded tokens, session-start hook tokens, change since the last run for that project. Run it before and after a change to the guides. |
| `stats` | `stats [days]` | Rule hits from `~/.claude/lean-violations.tsv` over the last `days` (default 7): the total, then hits per rule (split by block, warn and allow-once) and per project folder, most first. The old rule id `lean-project-first` counts as `lean-gate-first`; retired rules still show. `LEAN_VIOLATIONS` points it at another log. Example: `lean-gate stats 30`. |

## Hooks and helpers

lean-gate has two kinds of hooks: the panel module (`hooks/register.tsx`, which runs inside the app and enforces the rules) and the shell scripts in `scripts/` (listed in `hooks/hooks.json`). The shell helpers each ask `gate_on <name>` first: the global `mode` off stops all of them; otherwise the project file beats the global one; an unset helper is on. The first call also runs the rename copy (see [Install](#install-update-and-the-rename)).

**Panel module (rules and prompt):**

| When | What runs |
| --- | --- |
| Before every tool call | All the rules above, in order: counters, em dashes, session names, code-edit rules, custom rules, agent rules, Bash rules (public push, PR, OpenCode, changelog, release), then `delegate-more`. A rule's own failure never breaks the call. |
| After a tool call | Records tags and pushes, test and PHPCS runs, state-file and code edits (these feed the top row and the end-of-turn rules). |
| New prompt | Resets the per-turn counts (reads in a row, agents). Looks for another registered project named in the prompt. |
| Prompt composed | Adds to the session prompt: a precedence line with the routing table (panel outranks the guides), the automatic memory and lessons notes, the `workflow` text, and the `route` line. |
| End of a turn | Judges `push-after-tag`, `state-file-fresh`, `tests-before-done`, `phpcs-before-done`, then refreshes the review state. |
| Session start | Registers `/lean-gate`, opens the panel as `panel_start` says, trims the log, reads release state, memory, board, lessons, tools and the project. |
| Session end with `/clear` | Resets the counters, the loaded-skill flags, once-overrides and the once-per-session reminders. |

**Shell hooks:**

| Hook | Script | Helper switch | What it does |
| --- | --- | --- | --- |
| SessionStart | `session-start.sh` | `startup_notes` | Prints the standing rules. In a WordPress project (a `Plugin Name:` PHP file, a `Theme Name:` stylesheet, `wp-config.php` or composer naming WordPress) it points to `WORDPRESS.md`; for WooCommerce, to the Woo guard. With a `.lean-project` file it prints which runner delegation uses right now. It also prints the project's newest session draft path, the memory index line, and, for up to three sessions per project, a setup line when `.lean-project` or `.lean-project-setup` is missing. |
| UserPromptSubmit | `context-check.sh` | `context_nudge` | Silent below the context limit (`context_limit` from the project or global file, else the plugin option). Past it, once per step (default every 50k tokens) it tells Claude to finish the step, update the state file and offer a new session with a brief of at most 120 words. |
| PostToolUse (Write, Edit, MultiEdit) | `guard-hint.sh` | `guard_hints` | When Claude edits a doc or a test file, points it once per session at the matching guard (`docs-guard.md` or `test-guard.md`) to check the doc against code, or the tests against the test rules. |
| SessionEnd | `session-end.sh` | `session_drafts` | For a real session (two or more user messages) writes a handoff draft to a dated file (the `session_drafts_dir` option or the plugin data folder). Never overwrites, no model call. |
| SessionStart, UserPromptSubmit, SubagentStart | `run-vendor.sh` | `ponytail` | Runs the vendored ponytail hooks (activate, mode tracker, subagent). Stays quiet when the standalone plugin of the same name is still enabled, so nothing runs twice. |

The panel starts after the shell hooks and does not wait for them.

## Skills and vendored tools

**The lean-gate skill** (`skills/lean-gate/`) is always on. `SKILL.md` picks the mode and names the one guide to read; Claude reads only that guide.

| Guide | Used for |
| --- | --- |
| `STARTUP.md` | The setup cards for a new or adopted project, mandatory first. |
| `STRUCTURE.md` | The project layout with `AGENTS.md` as the entry, adopting rules and the walk test. |
| `NEW-PROJECT.md` | Planning a new project, or reconstructing a plan for one already under way. |
| `GRILL.md` | Interviewing a loose idea or a fuzzy change in rounds until every decision is settled. |
| `DOCS.md` | Organising, auditing and trimming docs, `CLAUDE.md`, memory and handoffs (the cost model is here). |
| `BUILD.md` | Building from the plan phase by phase: model routing, the shared board, phase gates. |
| `CLIENT-SITE.md` | Working on a live client website: approvals, drafts, backups, CDN, tokens. |
| `SITE-COPY.md` | Writing website text: product pages, guides, blog, FAQ. |
| `WORDPRESS.md` | WordPress, WooCommerce, Bricks and block-editor code: reading the docs, changelogs, best practices, the security checklist and fixes. |
| `ROUTING.md` | Which model and which tool for each part of a task. The panel outranks it. |
| `TOOLS.md` | The commands, paths and settings, session hygiene and lesson recording. |
| `ARCHIVE.md` | Text replaced during audits, kept verbatim. |
| `builder/` | The Bricks and BricksExtras skills, read through `builder/INDEX.md`, only the one the task needs. |
| `reverse/` | The reverse-engineering guide; its MCP stays parked until switched on per folder. |
| `reference/` | Adopted guides read on demand: WordPress.org plugin guidelines, PHPStan, docs-guard, test-guard, woo-guard. |
| `templates/` | The files a new project is built from (index, plan, state file, stage contract). |

**Ponytail** (vendored, MIT, `vendor/ponytail`): the lazy senior dev rules, switched from the Ponytail section. Skills: `ponytail` (the mode itself), `ponytail-review` (review a change), `ponytail-audit` (audit a whole repo), `ponytail-debt` (list every `shortcut:` comment), `ponytail-gain` (measured savings) and `ponytail-help` (quick reference). Update it with `pt-update` or `lean-gate vendor update ponytail`.

**wp-woo-performance-audit** (vendored, `vendor/wp-audit`): audits a WordPress or WooCommerce site or code for performance, HPOS compatibility and layout risk. Run it from the panel (`audit-run`) or `lean-gate audit perf`. At release the scope is the files `review-scope` lists.

**icm-architect** (vendored, MIT, `vendor/icm`): designs a process or body of knowledge into an ICM workspace (folder structure as agent architecture), or restructures a folder into one. The `lean-gate icm` command runs its link, index and graph checks. Update it with `lean-gate vendor update icm`.

**Packs:** the WordPress `wp-*` skills, the Bricks skills and the ui-ux plugin are kept off until needed (see Packs above and the `pack` command). `lean-gate vendor status` shows the vendored versions.

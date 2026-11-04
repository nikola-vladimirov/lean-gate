---
name: lean-project
description: Run a project with the fewest tokens per session. Start a new project (plan with phase gates, folders, state file), grill a loose idea or fuzzy change into decisions, adopt a project already under way, audit or trim CLAUDE.md, handoffs and docs, add contents tables, map large files to read only the needed lines, and build from a plan with tasks routed to Haiku, Sonnet or Opus and coordinated on a shared board. Also holds, read only when a task needs them, the Bricks and BricksExtras builder skills and the REA reverse-engineering guide. Learns from each run. Always on: applies to every project, and covers WordPress, WooCommerce, Bricks and block-editor companion plugins and scripts (how to read the docs and changelogs, best practices, security audit and fixes).
---

# lean-project

One goal: the fewest tokens a session spends to get oriented, stay oriented and get the work done, without losing information.

**Always on.** This skill applies to every project and every task, whether or not the user names it. Before any task starts, choose the model for each part and the tool or plugin for the work, as set out in `ROUTING.md`. This is mandatory. Starting or adopting any project runs the mandatory setup cards in `STARTUP.md` first, before any plan, code or site change. The session hook prints the standing rules at start. For WordPress, WooCommerce, Bricks and block-editor work it also points to `WORDPRESS.md`, and a change to that code is not done until `lean-project audit security <edited files>` has been run and its findings fixed or explained.

## Review scope (every mode, every project; mandatory)

Code, performance, testing, security and similar reviews cover only the files this task edited. Take the list from the diff or from this task's own edits, review only those files, and report only findings in them. Run `lean-project audit security` on that list, not on the folder.

A full-project review runs only when the user asks for it, or when the model suggests one for a huge change (many files, or a cross-cutting refactor). Suggest it in one line and wait for a yes. Never start one on your own.

## Pick the mode, read only its guide

| The user wants to | Read |
|---|---|
| Start a new project | `STARTUP.md` first (mandatory setup cards), then `NEW-PROJECT.md` (loose ideas go through `GRILL.md`) |
| Take over a project already under way that has no phased plan | `STARTUP.md` first (mandatory setup cards), then `NEW-PROJECT.md`, "Adopting a project" |
| Sharpen a fuzzy change, feature or design in an existing project | `GRILL.md` (with docs) |
| Organize, audit or trim docs, CLAUDE.md, memory or handoffs | `DOCS.md` |
| Build from the plan (a phase, a feature, a release) | `BUILD.md` |
| Work on a live client website (approvals, drafts, backups, CDN, tokens) | `CLIENT-SITE.md`, then `WORDPRESS.md` for any code change |
| Write or edit website text (product pages, guides, blog, FAQ) | `SITE-COPY.md` (method), plus the project's voice notes |
| Any task at all (routing, which model and which tool or plugin) | `ROUTING.md`, before starting |
| Build or review WordPress, WooCommerce, Bricks or block-editor code (plugin, theme, companion script) | `WORDPRESS.md`: how to read the docs, check changelogs, best practices, the security checklist and fixes. Read it before changing that code, every time. |
| Audit a WordPress or WooCommerce site or codebase for performance, HPOS or layout, onboard an inherited store, or triage a slow store | The `wp-woo-performance-audit` skill (its own public repo, installed in `~/.claude/skills`). Scope: the edited files for a card; the whole folder only for an audit the user asked for. Its scan is `lean-project audit perf`. |
| Build or change a Bricks or BricksExtras site, page, template, element, query or condition | `builder/INDEX.md`, then only the one `builder/<skill>/SKILL.md` the task needs |
| Reverse-engineer a shipped app, package, firmware or browser target | `reverse/SKILL.md`, then only the reference file it names |
| Check a WordPress plugin for WordPress.org submission, set up PHPStan, review WooCommerce code, check docs against code, or review tests | `reference/README.md`, then only the one file it points to |

The builder and reverse folders are on-demand reference. Their old standalone skills are parked, so nothing else loads them. Read them only for the task at hand: a plan step that names a Bricks element or REA target is the trigger, not a general interest. Plain WordPress plugin work does not need them.

REA needs its MCP server, which is parked for startup cost. If the REA tools are not loaded, tell the user to run `bash ~/.claude/skills-off/parked.sh rea on <folder>` and start a new session. Do not work without it.

## Paths and settings (the guides refer here)

- Guides and `templates/`: `${CLAUDE_PLUGIN_ROOT}/skills/lean-project/`
- Builder (Bricks): `${CLAUDE_PLUGIN_ROOT}/skills/lean-project/builder/`. Its generated JSON schema data (about 23 MB) stays at `~/.claude/skills-off/bricks/<skill>/references/`, read by path, never copied into a plugin.
- Reverse (REA): `${CLAUDE_PLUGIN_ROOT}/skills/lean-project/reverse/`
- Lessons: `${CLAUDE_PLUGIN_DATA}/LESSONS.md`
- **Docs folder:** wherever the project's index keeps its docs (`docs/` for projects this skill started). Plan, state file, glossary, board and archive all go there, under the project's own file names when it has them. Never inside a folder that ships (a plugin, package or theme folder that is zipped or published whole): check the index and the build or ignore rules first.
- Always back up docs before editing: `${user_config.backup_docs}`. Backup folder: `${user_config.backup_dir}`.
  - `true`: before the first edit, copy every file you will touch to `<project>/<backup folder>/docs-<YYYY-MM-DD>/`.
  - `false`: do that only when the project is not under version control.
  - Add the backup folder to `.gitignore` when the project uses git.

If any value above shows as an unfilled `${...}`: plugin files are under `~/.claude/plugins/`, data under `~/.claude/plugins/data/` in the folder whose name starts with `lean-project`, backups `false`, folder `backups`.

## Before any mode: lessons

Read the lessons file if it exists. Its "Local rules" section outranks the defaults in these guides.

## Cost model

- **Auto-loaded** on every turn of every session: the CLAUDE.md chain (the working folder and every parent, plus `~/.claude/CLAUDE.md`), the project's MEMORY.md, every installed skill's description. The most expensive bytes there are.
- **Startup baseline:** the first reply already carries the system prompt, tool schemas, the skill listing, MCP tool names and hook output, often 50k+ before any file is read. `lean-project cost` measures it. User-scope skills and MCP servers that only one project needs are the cut that pays most.
- **Read files** are paid once and then carried for every later turn. A 5k-token file read at turn 3 of a 40-turn session is processed about 37 times. Read ranges, not files.
- **Subagent reads** vanish when the subagent ends. Bulk reading belongs there, on a cheap model, returning only the answer.
- **Session length** dominates everything else. Every turn re-sends the whole conversation, so a fresh session that starts from a 30-line state file beats a long one.

## The tool

`lean-project` is on the Bash PATH while the plugin is enabled (fallback: `bash "${CLAUDE_PLUGIN_ROOT}/bin/lean-project"`). Bash and POSIX awk only.

- `lean-project map <file>`: outline with line ranges (markdown headings; classes and functions in PHP, JS/TS, Python, Go, Ruby, Rust, Java, Kotlin, C#, Swift, shell).
- `lean-project map <dir> [min]`: files of `min`+ lines (default 300).
- `lean-project toc <file>... [--force]`: build or refresh contents tables in markdown (files under 80 lines are skipped).
- `lean-project cost [dir]`: auto-loaded tokens, every doc with flags (NEEDS TOC, STALE TOC, STATE FILE OVER 60 LINES), duplicated lines.
- `lean-project board [id]` and `board add|move|note <id> ...`: shared task board so parallel subagents and sessions exchange facts while they run (how: `BUILD.md`, "Board").
- `lean-project map predict <file>`: the files that changed in the same commits as `<file>` over the last 10 commits, with their maps. Read those together before editing one of them.
- `lean-project check gate <card> [files]`: `php -l` and, when installed, `phpcs` with the WordPress standard (or the project's own `phpcs.xml`). `board move <card> done` runs it on the card's files (`board files <card> <paths>` records them). A failure moves the card back to `todo` with the output on the card.
- `lean-project audit waste [dir] [--apply]`: comment blocks of 8+ lines, debug `error_log()` calls and repeated hooks. Dry run by default. `--apply` (git repositories only) moves comment blocks verbatim into `docs/ARCHIVE.md`; debug logs and repeated hooks are reported only, since removing them changes behaviour.
- `lean-project frontier [docs/PLAN.md]`: the decisions to ask next (status `open`, every `needs D#` already decided) and what waits on them.
- `lean-project audit perf [dir or files...]`: performance and HPOS scan of WordPress and WooCommerce code, from the `wp-woo-performance-audit` skill (found in the installed plugin, or set `WP_PERF_AUDIT_HOME`). Read-only, heuristic, same scope rule: the edited files.
- `lean-project audit security [dir or files...]`: pass the edited files (the review scope rule); a folder scans all of it. Read-only scan of PHP and JS for WordPress anti-patterns (unescaped output, SQL without `prepare`, handlers with no nonce or capability check, `eval`, request data stored without sanitizing, open REST routes, unchecked uploads). A heuristic: each line is a place to read. Fixes are in `WORDPRESS.md`.
- `lean-project handoff [docs/PLAN.md]`: prints a draft of the state file (branch, next open tasks, cards in flight) for review. It writes nothing; paste the reviewed draft into the state file before a reset.
- `lean-project lesson "<text>" [--mode M] [--project P]` and `lean-project lessons`: record a lesson; the second sighting of the same text becomes a line under "Local rules" and its entries move to `LESSONS-ARCHIVE.md`.
- `lean-project lessons review [days]`: unpromoted lessons older than `days` (default 14). Rewrite each into a rule (record it again) or drop it.
- `lean-project lessons drop "<text>"`: move the entries with that text to `LESSONS-ARCHIVE.md`, marked superseded. Nothing is deleted.
- `lean-project selftest`.

## Reading rules (every mode, every project)

1. Never read a file over about 300 lines whole. Get its map (or its contents table), then `Read` with `offset` and `limit`.
2. Find before reading: `Grep -n` for an ID or symbol, then read that range. Use the project's code graph tool first if it has one.
3. Do not `cat` whole files in Bash or re-read a file still in context.
4. Large tool output (logs, test runs, search results): filter it (`tail`, `grep`, `head`) before it enters the conversation.
5. Screenshots only for visual checks; page text or the accessibility tree otherwise.

## Session hygiene

- A hook nudges once the conversation passes the context limit (default 300k tokens, then every 50k; the user can change both in `/config`). When it fires: finish the current step, update the state file, then open the new-session dialog: `mcp__ccd_session__start_session` with `initiation` `own_initiative`, `context` `fresh`, and a brief of at most 120 words that names only the index, the state file and the next step. The fresh session reads those two files first and nothing else until they point to it, so it never rereads the whole project. Do not start large work.
- At session end a hook writes the handoff draft of each real session (two or more user messages) to a dated file, with no model call. It goes to the `session_drafts_dir` setting (for example a folder in the Obsidian vault) or the plugin data folder, is never overwritten, and is only a draft: review it before pasting into the state file.
- End a session at every phase or milestone boundary anyway, after updating the state file.

## After any mode: improve

Record it with `lean-project lesson "<text>" --mode <mode> --project <name>`: include before and after tokens where measured, what saved the most, and what in these guides was wrong or wasted effort. The command creates the file (a "Local rules" section on top, "Entries" below), and a lesson seen twice becomes a line in "Local rules" with its entries moved to `LESSONS-ARCHIVE.md`. Keep the file under 60 lines; the command warns when it passes that. If a lesson would help every user, offer to draft an issue for the plugin's repository, and post only if the user says yes.

## Precedence

The user's own rules (CLAUDE.md, memory) outrank this skill. Never delete content: replaced text moves verbatim to an archive file. Confirm before anything outward-facing (pushing, creating remotes, posting).

## WordPress, Page Builder, and Ecosystem Extensions

For WordPress, WooCommerce, Bricks Builder, or Block Editor code, three operations apply. None needs setup: `map predict` and `audit waste` run on demand, and the gate runs when a card moves to `done` (`LEAN_GATE_SKIP=1` turns it off for one command):

### 1. Git-Predictive Dependency Mapping (`lean-project map predict`)
* Before prompting the user or splitting a phase into tasks, the engine executes a Git history analysis.
* It scans the last 10 local commits to check which files historically change together (e.g., a Bricks query element causing structural adjustments inside `class-woocommerce-companion.php`).
* It automatically reads the file maps of *both* associated files in a single pass, preventing broken hooks or silent template failures.

### 2. Phase-Gate Defensive Shield (`lean-project check gate`)
* When a subagent updates a card to `done` on the append-only `BOARD.md`, the engine intercepts the task closure before it reaches the lead context.
* It executes localized terminal validation checks (`php -l` and `wpcs` rulesets).
* If a syntax or escaping check fails, the tool rolls the card status back to `todo`, writes the raw validation error output directly to the card note, and forces the subagent to repair the bug locally.

### 3. Context Waste Hound (`lean-project audit waste`)
* Scans files for token-wasting code clutter (such as massive boilerplate comments, redundant hook declarations, or dangling `error_log()` entries).
* Dry run by default. With `--apply` (git repositories only), comment blocks move verbatim into `docs/ARCHIVE.md` and leave a one-line pointer, which lowers the baseline token overhead per session. Debug logs and repeated hooks are reported, never removed.

# lean-gate

**A control panel and rule gate for how Claude works on your projects.** lean-gate checks what Claude does and warns or blocks: model and effort on every agent, agent caps, release reviews, and project habits (state file, tests, PHPCS). Every setting is a button in a docked panel, and Explain says what each one does. It carries token-saving project guides (plans, docs, file maps, memory, lessons, a shared board for agents), ponytail, the WordPress performance audit, PHPCS with the WordPress standard and the ICM project layout, and it registers, detects, starts and adopts projects from the panel.

The full manual, with every button, rule, setting and command: [docs/MANUAL.md](docs/MANUAL.md).

**Renamed.** lean-project is now lean-gate. The `lean-project` command still works as an alias. Your settings, memory and lessons are copied to the new names at the first session after the update, and the old files are kept.

A Claude Code plugin that makes every session cheaper. Claude re-sends the whole conversation on every turn and loads some files into every session, so tokens go to orientation and old context before any work happens. lean-gate keeps that overhead small, and keeps the work organised while it does.

Contents table below: open only the section you need.

<!-- toc -->
- 27-69: Features
- 70-80: Install
- 81-117: Delegating work
- 118-130: Use
- 131-173: Commands
- 174-177: Minimal install (low context)
- 178-188: Settings
- 189-205: What a project gets
- 206-209: Where your data lives
- 210-213: Credits
- 214-216: License
<!-- /toc -->

## Features

**Planning**

- **New projects** start with a short index, a plan whose phases are gates with acceptance checks, and a 20-line state file. Any fresh session can pick the project up for about 1 to 2k tokens.
- **Decision frontier.** `lean-gate frontier` lists the open decisions whose prerequisites are settled, so each grilling round asks exactly those, and shows what waits on them (`needs D<n>` in a decision).
- **Grilling for loose ideas.** A loosely described project is interviewed in rounds: every question that can be asked now, numbered, each with a recommended answer that "yes" accepts. Facts are looked up by a cheap subagent instead of asked; questions only a prototype can answer become prototype tasks. It ends when every decision is settled and you confirm.
- **Grilling with docs for fuzzy changes** in an existing project: the same interview, checked against the code. Vague or clashing words are challenged, settled terms go into a glossary the moment they settle, and every decision lands in the plan, with the reasons for the hard-to-reverse ones.
- **Projects already under way** get a plan reconstructed from their code, git tags and docs: released versions become finished phases, current work becomes the open ones, and only real gaps are asked about. Existing file names and doc locations stay, and nothing lands in a folder that ships.

**Reading less**

- **File maps** give an outline with line ranges for large markdown and source files (PHP, JS/TS, Python, Go, Ruby, Rust, Java, Kotlin, C#, Swift, shell), so Claude reads the 40 lines it needs, not 1,000.
- **Predicted reads.** `lean-gate map predict <file>` lists the files that changed in the same commits as a file over the last 10, with their maps, so a change to one is read with its usual partners.
- **Code waste.** `lean-gate audit waste` finds comment blocks, debug logs and repeated hooks; `--apply` moves comment blocks verbatim into `docs/ARCHIVE.md`.
- **Contents tables** inside long docs, with line ranges, refreshed by one command.
- **Shipping check.** `lean-gate cost` warns when a project's `docs/` (and `GLOSSARY.md`) would reach users in a build.
- **Docs audits** measure what a session pays, remove duplicated rules, slim the index and state file, split growing logs, and add contents tables. Nothing is deleted: trimmed text moves to an archive.

**Building**

- **Build mode** works through the plan phase by phase and routes tasks by model and effort: Haiku for bulk reading and fixtures, Sonnet for well-specified code, tests and lint fixes, Opus for review and acceptance, the main session for design. Each task gets a short self-contained brief, the main session verifies every result, and a failing task climbs effort before it climbs models.
- **A shared board** lets parallel subagents and sessions talk while they work: cards move through todo, doing, blocked and done, and agents post one-line facts their siblings need (a contract, a format, a gotcha). It is one append-only file, so parallel writers never overwrite each other, and the lead reads a compact view instead of waiting on replies. At each phase gate, lasting notes move into the plan and the board is archived.
- **Phase gates**: acceptance checks ticked by a fresh reviewer, plus security review, code review and tests before a build is final. Reviews are a release gate; the rule is in `skills/lean-gate/SKILL.md`, and `lean-gate review-scope` lists the code changed since the last tag and says when a full review is due.
- **A gate on done.** Moving a card to `done` runs `lean-gate check gate`: PHP syntax and, when installed, WordPress coding standards on the card's files. A failure sends the card back to `todo` with the output on the card.
- **Always on, WordPress aware.** A session-start hook applies the rules to every project. In a WordPress project it points to `skills/lean-gate/WORDPRESS.md`: how to read the docs and check changelogs, best practices for plugins, WooCommerce, Bricks and the block editor, and a security checklist with fixes. `lean-gate audit security` scans the code for the common anti-patterns.
- **Handoff draft.** `lean-gate handoff` drafts the state file from the branch, the next open tasks and the cards in flight, for review before a reset.
- **Builder skills on demand.** The 108 Bricks and BricksExtras skills live inside this one skill, in `builder/`. `builder/INDEX.md` routes a task to the one skill it needs, so nothing loads unless a plan step names a Bricks element, template or query. Their generated JSON schema data stays out of the plugin.
- **Project memory.** `lean-gate memory add "<note>" [--tag decision|state|link|note]` keeps short dated notes per project, `link` ties projects together, and session start prints one line (count, newest note, linked projects). `memory recall` reads the notes and the newest three of each linked project only when you ask; `forget` archives a note, never deletes it. Notes live in `~/.claude/lean-gate/memory/<project>/`.
- **Control panel and rule gate.** A panel docked beside the chat (`/lean-gate` opens it) shows the model route, delegation counts, context use, state-file age, test result and review status, and enforces rules on tool calls: model and effort on every subagent, no Haiku for coding, free OpenCode models only, review before release, state file and tests before done, no em dashes, the lean-gate skill loaded first, WordPress skills and docs read before WordPress or Bricks code, changelog before a tag, a push after a tag, pull requests only for the repos in `pr_repos`, and no demo files to public repos. Each rule is off, warn or block with one press, and a rule builder adds your own. Model routing sets the model, effort and agents-at-once cap for each kind of work (reading and writing, coding, complex coding, review, planning). Project memory, the shared board, lessons and packs have their own sections, and project memory and lessons can record automatically. Everything is set by buttons and stored in `~/.claude/lean-gate.json`; a project's `.lean-gate.json` can tune rules, routing and limits. Hub guide: [docs/HUB.md](docs/HUB.md); every panel button: [docs/MANUAL.md](docs/MANUAL.md). 0.31.4: the Ponytail section is removed from the panel and the full guide is added. 0.31.5: the route button picks a model and an effort, like Model routing. 0.31.6: lean-gate outranks lean-project (context limit, em dashes and routing text defer to it, a precedence line in the prompt), and the distinctive-session-names rule is built in. Hub (unreleased, branch hub): ponytail 5.3.3, the performance audit, PHPCS and icm-architect are vendored and switched from the panel; projects are registered, detected, started and adopted with buttons. 1.0.0-beta.2: Renamed to lean-gate (plugin, command, skill, config file, memory folder, rule lean-gate-first); old names still read. 1.0.0-beta.3: the copy to the new names runs once when several hooks start together (it nested the memory folder). 1.0.0-beta.4: setup-nag counts carry over; `lean-gate phpcs` finds Laragon PHP and a global Composer PHPCS when they are not on PATH. 1.0.0-beta.5: the routing-line rule is retired; a skill loaded before a plugin reload still counts; state, test and PHPCS reminders warn once per session; scratch folders are not judged. 1.0.0-beta.6: buttons look like buttons, Explain shows what each one does, a Settings section (save to this project, reminder frequency, scope, quiet warnings, panel at start, state file, PR only, public push presets, reset and undo, export and import), and the full manual in docs/MANUAL.md. 1.0.0-beta.7: `lean-gate stats` and a Rule stats section with one press to turn the noisiest rule off; the hit log keeps 2000 lines; PHPCS reminders only for WordPress PHP.
- **Skills and plugins on demand (packs).** Skill sets used rarely stay off so they cost no tokens at startup: the Bricks skills, the WordPress `wp-*` skills and the ui-ux plugin. They return when a task needs them. `lean-gate pack status` shows which are on; `lean-gate pack on <bricks|wp|ui-ux>` turns one on, and `off` turns it back off. Changes take effect in the next session.
- **Reverse engineering on demand.** The REA guide lives in `reverse/` and loads only for reverse-engineering tasks. REA's MCP server stays off by default (startup cost) and is switched on per folder.

**Delegation**

- **Send bulk work elsewhere.** Each project chooses where delegated work goes: `none` (everything stays with Claude), `llama` (a local llama.cpp server), `ollama`, `unsloth` (Unsloth Studio), `opencode` (free OpenCode models only), `aider` or `goose` (agent CLIs). Bulk reading, code sweeps, fixtures and lint loops go there. Security, architecture and review stay with Claude.
- **Asked on the first sessions only.** A project with no recorded setup or delegation choice gets a one-line reminder in up to three sessions, then it stops. The choice is saved in `.lean-project` at the project root, and the setup in `.lean-project-setup`.

**Session hygiene**

- **A fresh-session reminder** (a hook) speaks up once the conversation passes a context limit: update the state file, then Claude offers a new session in a dialog. The brief names only the index, the state file and the next step, so the fresh session does not reread the project.
- **It learns.** Each run records a lesson in your own data folder, including which model passed which kind of task; a lesson seen twice becomes a local rule that outranks the defaults.

## Install

In Claude Code:

```
/plugin marketplace add nikola-vladimirov/lean-gate
/plugin install lean-gate@lean-gate
```

Requires bash: built in on macOS and Linux, and Git Bash on Windows (which Claude Code uses there). Everything except delegation needs no other dependencies. Delegation needs `curl` and `node` (both in Git Bash on Windows), plus whichever local server or tool you pick: llama.cpp, Ollama, Unsloth Studio, the OpenCode desktop app, aider or goose. Only the one you choose has to be running.

## Delegating work

1. **Start a local model server (optional).** With llama.cpp, start `llama-server` with the model you want on a port you choose (the author's setup uses 9931 with the Gemma 12B coder GGUF, `yuxinlu1/gemma-4-12B-coder-fable5-composer2.5-v1-GGUF:Q4_K_M`). Check the server's own help for its flags.

2. **Pick the runner for a project.** Answer the question Claude asks at the start of a session, or run it yourself in the project folder:

   ```bash
   lean-gate delegate set runner llama
   ```

   For OpenCode instead, use `lean-gate delegate set runner opencode`. Only free models (`opencode/*-free`) are accepted. The default is `opencode/deepseek-v4.1-flash-free`, and you can change it with `lean-gate delegate set opencode_model <model>`.

3. **Check the runner:**

   ```bash
   lean-gate delegate check
   ```

4. **Run a brief.** Write the task and the material it needs into a file, then send it:

   ```bash
   lean-gate delegate run brief.md answer.md
   ```

   The answer is written to `answer.md`. Read it and verify it before using it. A brief with no context gets a generic answer, so include the excerpt or file the model should work on.

**If a runner is down, the work falls back on its own.** Before each delegated job, `lean-gate delegate run` tries the chosen runner, then the fallbacks in `fallback` (default `llama opencode`, set with `fallback`). A runner counts as down when its health check fails (llama, Ollama, Unsloth) or its program is missing (OpenCode, aider, goose). If every runner is down, the command exits with status 3 and Claude does the work itself. The session start prints which runner is in use right now.

Other runners, each set with `lean-gate delegate set`:

- **ollama:** `ollama_url` (default `http://127.0.0.1:11434`) and `ollama_model`, the model tag you pulled.
- **unsloth:** `unsloth_url` (default `http://127.0.0.1:8888`, the port `unsloth studio -p` uses) and `unsloth_model`. Put the API key in the `UNSLOTH_API_KEY` environment variable, never in `.lean-project`.
- **aider:** `aider_model`. Needs the `aider` command on the PATH. Aider and goose are agents that can edit files, so use them only where edits are wanted and review `git diff` afterwards.
- **goose:** needs the `goose` command on the PATH. It runs with `goose run -i <brief>`.

The llama default URL is `http://127.0.0.1:9931`. Change it with `lean-gate delegate set llama_url <url>` if your server runs elsewhere. The model name for llama is set with `llama_model`.

## Use

Ask in plain words, or run the skill directly (`/lean-gate:lean-gate`):

| Say | What happens |
|---|---|
| "Start a new project for ..." | One round of questions (or grilling, if the idea is loose), then the folder, index, plan and state file |
| "Grill me on this idea" / "Help me pin down this feature" | Rounds of questions until every decision is settled; with code present, a glossary and decisions in the plan |
| "Take over this project" / "Give this project a plan" | A plan reconstructed from code, git and docs; questions only about the gaps |
| "Audit the docs in this project for token use" | Measures, trims and reports before and after |
| "Build phase 2 from the plan" | Splits the phase into tasks, routes them across models, coordinates them on the board, checks the gate |
| "Delegate this to the local model" | Writes a brief and runs it through `lean-gate delegate run` on the project's runner |

## Commands

The `lean-gate` command is on Claude's PATH while the plugin is enabled (you can run it too: `bash <plugin folder>/bin/lean-gate`).

| Command | What it does |
|---|---|
| `lean-gate map <file>` | Outline with line ranges: markdown headings, or classes and functions in code |
| `lean-gate map <dir> [min]` | Files of `min`+ lines (default 300), largest first: map those before reading them |
| `lean-gate toc <file>... [--force]` | Build or refresh a contents table between `<!-- toc -->` markers. Files under 80 lines are skipped unless `--force` |
| `lean-gate cost [dir]` | Tokens auto-loaded every session, the startup baseline (first-reply size from recent sessions, skill listing by group), every doc with flags (`NEEDS TOC`, `STALE TOC`, `STATE FILE OVER 60 LINES`), and lines duplicated across files |
| `lean-gate board` | The shared board: cards by column (doing, blocked, todo, done) and the latest 10 notes |
| `lean-gate board <id>` | One card's full history |
| `lean-gate board add <id> <title>` | Add a card (id: letters, digits, `.`, `_`, `-`, like `T3`) |
| `lean-gate board move <id> <status> [why]` | Status is `todo`, `doing`, `blocked` or `done`; a reason after `blocked` shows on the card |
| `lean-gate board note <id> <text>` | Post a one-line fact for the other tasks |
| `lean-gate map predict <file>` | The files that changed with it in the last 10 commits, with their maps |
| `lean-gate board files <id> <paths>` | Record the files a card changes; the gate checks them when it moves to `done` |
| `lean-gate check gate <id> [files]` | Run the gate by hand: `php -l` and WordPress coding standards |
| `lean-gate audit waste [dir] [--apply]` | Find comment blocks, debug logs and repeated hooks; `--apply` archives comment blocks |
| `lean-gate frontier [docs/PLAN.md]` | The decisions to ask now, and what waits on them |
| `lean-gate lesson "<text>" [--mode M] [--project P]` | Record a lesson; a second sighting becomes a local rule |
| `lean-gate lessons` | Show the local rules and where the lessons file is |
| `lean-gate lessons review [days]` | Unpromoted lessons older than `days` (default 14): rewrite each into a rule or drop it |
| `lean-gate lessons drop "<text>"` | Move the entries with that text to `LESSONS-ARCHIVE.md`, marked superseded; nothing is deleted |
| `lean-gate lessons export <file> [--force]` | Write the lessons as a markdown note with frontmatter, for example into an Obsidian vault. An existing note is not replaced unless `--force` is given |
| `lean-gate audit security [dir or files...]` | Read-only scan of PHP and JS for WordPress anti-patterns (unescaped output, unprepared SQL, missing nonce or capability checks, dangerous functions). Pass the files `review-scope` lists at release |
| `lean-gate audit perf [dir or files...]` | Read-only performance and HPOS scan of WordPress and WooCommerce code, from the `wp-woo-performance-audit` skill |
| `lean-gate review-scope [--full-done]` | The code changed since the last release tag, and whether a full review is due (a new major version, or 5 or more minor releases since the last full one). `--full-done` records one |
| `lean-gate sessions [n] [--here]` | The newest session drafts: date, project, path. `--here` keeps this project's only |
| `lean-gate handoff [docs/PLAN.md]` | Draft of the state file: branch, next tasks, cards in flight (prints only) |
| `lean-gate delegate config` | Show the project's delegation choice, or that none is set yet |
| `lean-gate delegate set <key> <value>` | Save a key in `.lean-project`: `runner` (`none`, `llama`, `ollama`, `unsloth`, `opencode`, `aider`, `goose`), `opencode_auto` (`1` lets OpenCode act without asking; off by default), `fallback`, `llama_url`, `llama_model`, `ollama_url`, `ollama_model`, `unsloth_url`, `unsloth_model`, `aider_model`, `opencode_cli`, `opencode_model` |
| `lean-gate delegate check` | Check whether the chosen runner is up, and which runners would be tried |
| `lean-gate delegate pick` | Print the runner in use right now (the first one up in the fallback order, or `none`) |
| `lean-gate delegate run <brief> <output>` | Send a brief to the runner and write the answer to a file |
| `lean-gate memory add|list|recall|forget|link|unlink|index|projects` | Per-project memory, linked across projects; session start prints only the one-line index |
| `lean-gate pack status` | Show the on-demand skill packs (Bricks, wp) and the ui-ux plugin: active or parked |
| `lean-gate pack on <bricks|wp|ui-ux>` | Bring a pack back, or turn the plugin on. Takes effect in the next session |
| `lean-gate pack off <bricks|wp|ui-ux>` | Park a pack, or turn the plugin off. Takes effect in the next session |
| `lean-gate selftest` | Check the tool on this machine |

Board environment variables: `LEAN_BOARD` is the board file (default `docs/BOARD.md`; agents always pass an absolute path, since a worktree has its own copy of the docs folder) and `LEAN_AS` is the writer's name (default `lead`).

## Minimal install (low context)

The skill and the `lean-gate` command work without any hooks. The hooks are the entries in `hooks/hooks.json` (SessionStart, PostToolUse, UserPromptSubmit, SessionEnd). Without them you lose the standing rules at session start, the newest-draft line, the em-dash and guard hints, the context nudge and the session-end draft. Use `lean-gate cost` to see what the session-start hook costs (its budget is 400 tokens). To run without hooks, keep a local copy of the plugin and empty the `hooks` object there.

## Settings

`/config` shows four options:

| Option | Default | What it does |
|---|---|---|
| Context limit | 300,000 tokens | When the fresh-session reminder first speaks up |
| Remind again every | 50,000 tokens | How often it repeats after that |
| Always back up docs before editing | off | On: copy every doc to a dated backup folder before lean-gate edits it. Off: back up only when the project is not under version control |
| Backup folder | `backups` | Where backups go, relative to the project folder |
| Session draft folder | (plugin data folder) | Where end-of-session handoff drafts go, for example a folder in your Obsidian vault |

## What a project gets

```
<project>/
├── CLAUDE.md          index: status, folder map, reading rules by task, upkeep, ground rules
├── docs/
│   ├── PLAN.md        goal, assumptions A#, decisions D#, sources, phases with gates, risks R#, decision log
│   ├── HANDOFF.md     state: now, in progress, next
│   ├── GLOSSARY.md    the project's own terms (once grilling settles one)
│   ├── BOARD.md       shared board (during a build phase)
│   └── ARCHIVE.md     replaced text, verbatim (once something is replaced)
├── .lean-project      delegation choice: runner, llama_url, llama_model, opencode_model
└── <code>/
```

Projects already under way keep their own names and doc folder. Docs never go inside a folder that ships.

## Where your data lives

Lessons go to the plugin's data folder (`~/.claude/plugins/data/lean-gate-*/LESSONS.md`), which survives plugin updates. Lessons never leave your machine. Delegated briefs stay local with the `llama` runner. With `opencode`, the brief goes to the OpenCode service and its free model.

## Credits

Grilling is adapted from Matt Pocock's [grilling, grill-with-docs and domain-modeling skills](https://github.com/mattpocock/skills) (MIT; notice in `LICENSE`).

## License

MIT

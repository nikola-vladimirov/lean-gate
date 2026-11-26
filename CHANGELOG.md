# Changelog

## 2.0.0 (2026-11-26)

A generic card tracker module (Planka first, for the Nashenski hub), a secrets rule, a shared board, and the removal of everything 1.x kept only for the rename and for runners nobody uses. Breaking, so a new major version.

Breaking (removed):
- Rule `one-pr-per-fix`, config key `pr_repos` and panel button `set-pr` (with its Explain line). `tracker-git-codes` replaces them. `pr_repos` in a file is named as a retired key.
- The rename leftovers: the `lean-project` command (`bin/lean-project`), reading `lean-project.json` and `.lean-project.json`, the copy of old files at the first session (`gate_migrate` in `scripts/gate-on.sh`) and the `lean-project-*` data-folder fallback. The old rule id `lean-project-first` sets nothing and is named as unknown; the old skill name `lean-project` no longer counts as a load. `lean-gate stats` still counts old `lean-project-first` log rows as `lean-gate-first`. The files `.lean-project` (delegation choice) and `.lean-project-setup` keep their names.
- `lean-gate@lean-gate-local` in `lean-gate vendor retire`.
- The delegate runners llama, ollama, unsloth, aider and goose, with `llama_url`, `llama_model`, `ollama_url`, `ollama_model`, `unsloth_url`, `unsloth_model` and `aider_model`. The runners are now `none` and `opencode`; the default `fallback` is `opencode`. A `.lean-project` that names a removed runner says so on stderr and falls back.

Added:
- Trackers. New global-only config keys `person` and `trackers` (up to 20, each with `name`, `paths`, `start`, `sync` and the patterns `start_match`, `claim_match`, `code`, `branch`, `docs`, `mirrored`, `sync_match`); a project's `.lean-gate.json` drops both, because a tracker's text reaches the session prompt. Four rules, all warn, under their own panel group Tracker rules: `tracker-card-first` (start and claim a card before editing outside the docs), `tracker-git-codes` (commits on a `<person>/<CODE>-<slug>` branch with the card code first in the subject; docs-only commits pass), `tracker-sync-after-push` (end of turn: sync after pushing mirrored docs) and `tracker-brief` (an Agent call from a tracker folder names a card code and `AGENT_NAME`, and `AGENT_MODEL` and `AGENT_EFFORT` match the call).
- Panel section Tracker, shown only in a tracker folder: the start age this session, the card codes seen, and the buttons `tr-start`, `tr-cards` and `tr-review`. In a tracker folder session start tells Claude to run the tracker's start instead of reading the index and state file.
- Rule `no-secrets-outward` (block, group Every session): no key-shaped string (Stripe, webhook, private key, GitHub, AWS, Slack, Anthropic, GitLab, hardcoded secret) in Edit, Write or MultiEdit text, in any shell command, or in the lines a `git commit` stages. Placeholders pass; the message names the kind, never the secret.
- `lean-gate ignore [dir] [--apply]`: proposes `.ignore` lines so Grep and Glob skip big unregistered folders, `backups/`, `archive/`, `releases/` and `*.zip`, and put back a repo of its own that a whitelist `.gitignore` hides.
- `lean-gate board archive [--force]` (appends the board to `BOARD-ARCHIVE.md` and removes it; refused while a card is doing or blocked), `lean-gate board export [ids]` (markdown for a tracker card comment; writes nothing), and an archive hint in the board view when every card is done or the file passes 60 lines.
- `review-scope` prints `Cards in this release:` with the card codes that start commit subjects since the last tag. `memory add --tag decision` reminds you to record the decision in the repo's PLAN file too.
- Unknown or retired config names (a rule id that is not built in or custom, and `pr_repos`) are toasted at session start and shown in the Settings section.

Changed:
- The board is the main checkout's `docs/BOARD.md` (found through `git rev-parse --git-common-dir`), so every worktree shares one board; `LEAN_BOARD` still overrides it. This applies to `board`, `check gate` and `handoff`.
- Session start loads the lean-gate skill itself in project folders (marker `[lean-gate skill loaded at session start]`, not on resume), and `lean-gate-first` counts that marker.
- Session start deletes `guard-docs-*`, `guard-test-*` and `nudge-*` marks older than 7 days and moves session drafts older than 30 days to `sessions/archive/`. Its always-on line says to run the start command first in a tracker folder.
- `distinctive-session-names`: a card code after the date (`09:30 26-11-2026 EN8 Fibank`) is fine.
- `delegate` messages: no choice yet asks for `none` or `opencode`; `check` names the fallback order when a runner is not available.
- `isPhpcsCommand` and `audit wporg` detection no longer accept the removed `lean-project` program name.

Fixed:
- Grep and Glob could not see the Nashenski product repos: the hub's whitelist `.gitignore` hid them from ripgrep. `lean-gate ignore` writes `!/<Name>/` lines that put each repo back (and keeps the 250k-file third-party folder out).
- The skill-first interruption, the most frequent one in the rule log, is gone in project folders: session start loads the skill, so `lean-gate-first` finds it before the first edit.
- From the full release review (two Opus reviewers, 20 findings, all fixed with a failing-first test):
  - Git commands inside `{ }`, `then`, `do` or `else` (`npm test; if ($?) { git tag v2.0.0; git push origin v2.0.0 }` in PowerShell, `x && { git tag v1; }` in bash) were invisible to every git rule, `release-needs-review` included.
  - A `routing` value in a repo's `.lean-gate.json` could put any text into the session prompt; values are now a model and an optional effort only.
  - `cd ..` paths and PowerShell `Set-Location`, `sl`, `Push-Location` and `chdir` now resolve to the real repo.
  - Every git call the gate makes uses `core.quotepath=off`, and every diff `--no-ext-diff --no-color`, so a diff tool or colour setting cannot hide changes.
  - `cost` and `gain` count the session-start hook without the skill block it now loads, and no longer read the caller's stdin.
  - Draft archiving moves only dated session drafts and never overwrites one; `board archive` cannot lose a line appended while it runs; `ignore` works without rg and with `'` or `[` in folder names.

## 1.1.1 (2026-11-16)

- End-of-turn rules (`state-file-fresh`, `tests-before-done`, `phpcs-before-done`, `push-after-tag`) now reach Claude: they run after the turn and cannot stop a tool, so before only the person saw a toast. The miss is saved and the new `pending-note.sh` hook hands it to Claude with the next prompt, once. At block, the note says to fix it before reporting the work done; the panel row explains this.
- The `release-needs-review` block now tells Claude what to do (run `review-scope`, review and audit the files, report, ask the person to press Reviewed) and not to retry or reword the command. Before, Claude retried the same tag several times.

## 1.1.0 (2026-11-11)

- `lean-gate audit wporg [dir or zip]`: the WordPress.org plugin review checks, one or more per detailed guideline (G1 to G17) plus the review team common issues (inline scripts and styles, unsanitized nonces and JSON, file writes outside uploads, code editors, undocumented external services, dev and translation files, outdated libraries, readme and zip limits).
- New rule `wporg-audit-before-release` (warn): a zip, tag, GitHub release or SVN commit of a WordPress.org plugin needs a finished `audit wporg` first (after the last code edit, or in the same command); vague SVN commit messages are flagged (guideline 14).
- Hardened by the release review: zips are capped at 100 MB unpacked and always cleaned up, Composer never runs on a zip and never with plugins, `build/` and `dist/` are scanned, `__MACOSX` and a `.git` inside a zip are handled, and the scan no longer holds whole files in memory.
- `reference/wp-plugin-handbook.md`: every rule from the 102 Plugin Handbook pages, with sources; WORDPRESS.md section 7 maps each guideline to its check.
- Fix: `review-scope` kept one full-review record for all projects, so a release in one project could reset another project's count. It now keeps one line per repository (an old one-line file still counts for the repo that has that tag).

## 1.0.1 (2026-11-08)

- The selftest runs on macOS too (CI matrix: Linux and macOS).
- macOS: `bin/lean-gate` parses under the system bash 3.2 (a `case` inside `$(...)` broke it); `pack status` and `cost` no longer show padded counts from BSD `wc`.
- The copy from the old lean-project folders can no longer nest a folder when several hooks start at once (seen on Linux).
- A full review recorded from the Bash tool before 1.0.0 sat in a temp folder; record it again with `lean-gate review-scope --full-done` if review-scope asks for one.

## 1.0.0 (2026-11-08)

First stable release of lean-gate (formerly lean-project): the hub with its rule gate, docked panel, vendored ponytail, performance audit, PHPCS and icm-architect, the rename, noise reduction, the Settings section and full manual, rule stats, and the coloured panel with hover help. Everything listed under the 1.0.0 betas below is in it.

Fixed by the full review:
- PowerShell commands are checked like Bash by every rule (releases, pushes, OpenCode, em dashes in commits, tests, custom Bash rules).
- A push of a branch named like a version (1.x, v2) is no longer taken for a tag push; a tag and its push in one command count as pushed.
- Committing the reviewed code plus a changelog keeps the review clear.
- A project .lean-gate.json that turns rules down is shown at session start and in the panel.
- Settings: a second Reset or Import keeps the real backup; a broken project registry is never rewritten; PR only keeps the global list; quick presses build on each other.
- Panel tool buttons wait up to three minutes and never report "done" on a timeout; Git Bash is also found next to a per-user git; a quote in the plugin path no longer breaks the panel.
- More test runners count (pest, mocha, ava, bun, go, cargo, dotnet, make test); custom rule patterns with many wildcards are refused; here-strings no longer hide commands.
- CLI: session start stays fast with many drafts; board retries no longer drop real moves; card file paths with spaces work; the card gate finds PHPCS like `lean-gate phpcs`; review, draft and gain data live in the plugin data folder, not temp; `delegate run` falls back when a runner returns nothing; `lesson --mode` at the end no longer loops; `audit security` without arguments works; `audit waste --apply` leaves file headers alone; lessons with backslashes keep them; review-scope sorts beta tags before their release; macOS-safe sed and date; the old-name migration resumes after an interruption.


## Earlier versions

Moved verbatim from the README.

- 0.31.4: the Ponytail section is removed from the panel and the full guide is added.
- 0.31.5: the route button picks a model and an effort, like Model routing.
- 0.31.6: lean-gate outranks lean-project (context limit, em dashes and routing text defer to it, a precedence line in the prompt), and the distinctive-session-names rule is built in.
- Hub (unreleased, branch hub): ponytail 5.3.3, the performance audit, PHPCS and icm-architect are vendored and switched from the panel; projects are registered, detected, started and adopted with buttons.
- 1.0.0-beta.2: Renamed to lean-gate (plugin, command, skill, config file, memory folder, rule lean-gate-first); old names still read.
- 1.0.0-beta.3: the copy to the new names runs once when several hooks start together (it nested the memory folder).
- 1.0.0-beta.4: setup-nag counts carry over; `lean-gate phpcs` finds Laragon PHP and a global Composer PHPCS when they are not on PATH.
- 1.0.0-beta.5: the routing-line rule is retired; a skill loaded before a plugin reload still counts; state, test and PHPCS reminders warn once per session; scratch folders are not judged.
- 1.0.0-beta.6: buttons look like buttons, Explain shows what each one does, a Settings section (save to this project, reminder frequency, scope, quiet warnings, panel at start, state file, PR only, public push presets, reset and undo, export and import), and the full manual in docs/MANUAL.md.
- 1.0.0-beta.7: `lean-gate stats` and a Rule stats section with one press to turn the noisiest rule off; the hit log keeps 2000 lines; PHPCS reminders only for WordPress PHP.
- 1.0.0-beta.8: colour (section and group accents, level dots, status pills, a context bar, stats bars), hover info icons in the app, routing choices shown folded, the rule builder as a card.

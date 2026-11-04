# lean-project commands

Read only the command you need. The same commands are listed in the README.

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
- `lean-project audit perf [dir or files...]`: performance and HPOS scan of WordPress and WooCommerce code, from the `wp-woo-performance-audit` skill (found in the installed plugin, or set `WP_PERF_AUDIT_HOME`). Read-only, heuristic, same scope rule: at release, the files `review-scope` lists.
- `lean-project audit security [dir or files...]`: pass the files `review-scope` lists (the release gate); a folder scans all of it. Read-only scan of PHP and JS for WordPress anti-patterns (unescaped output, SQL without `prepare`, handlers with no nonce or capability check, `eval`, request data stored without sanitizing, open REST routes, unchecked uploads). A heuristic: each line is a place to read. Fixes are in `WORDPRESS.md`.
- `lean-project handoff [docs/PLAN.md]`: prints a draft of the state file (branch, next open tasks, cards in flight) for review. It writes nothing; paste the reviewed draft into the state file before a reset.
- `lean-project lesson "<text>" [--mode M] [--project P]` and `lean-project lessons`: record a lesson; the second sighting of the same text becomes a line under "Local rules" and its entries move to `LESSONS-ARCHIVE.md`.
- `lean-project lessons review [days]`: unpromoted lessons older than `days` (default 14). Rewrite each into a rule (record it again) or drop it.
- `lean-project lessons drop "<text>"`: move the entries with that text to `LESSONS-ARCHIVE.md`, marked superseded. Nothing is deleted.
- `lean-project lessons export <file> [--force]`: write the lessons as a markdown note with frontmatter (for example into a vault). An existing note is not replaced without `--force`.
- `lean-project sessions [n] [--here]`: the newest session drafts (date, project, path). `--here` keeps only the current project's.
- `lean-project board` posts are idempotent: a retried post (same writer, verb, card and text within the last 20 lines) is skipped.
- `lean-project pack status|on|off <bricks|wp|ui-ux>`: the skills and plugins that stay off until a task needs them. `on` brings them back, `off` parks them; both take effect in the next session. Bricks and BricksExtras skills, the WordPress wp-* skills, and the ui-ux plugin.
- `lean-project gain`: appends one line per run to `gain.tsv` in the plugin data folder (date, project, auto-loaded tokens, session-start hook tokens, change since the last run for that project). Run it before and after a change to these guides.
- `lean-project selftest`.

## Memory layers (which file answers which question)

| Question | Layer | Where to look |
|---|---|---|
| What was decided, and why | Decisions | `LESSONS.md`, "Local rules" first |
| How is the code structured | Code map | `lean-project map`, `map predict` |
| What happened in earlier chats | Conversation history | `lean-project sessions [n] [--here]`, then the draft it names |
| Where did we leave off | Continuity | the project's state file; the newest draft line at session start |
| What do parallel agents know now | Live coordination | the board (`lean-project board`) |

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

## Session hygiene (full text)

- A hook nudges once the conversation passes the context limit (default 300k tokens, then every 50k; the user can change both in `/config`). When it fires: finish the current step, update the state file, then open the new-session dialog: `mcp__ccd_session__start_session` with `initiation` `own_initiative`, `context` `fresh`, and a brief of at most 120 words that names only the index, the state file and the next step. The fresh session reads those two files first and nothing else until they point to it, so it never rereads the whole project. Do not start large work.
- At session end a hook writes the handoff draft of each real session (two or more user messages) to a dated file, with no model call. It goes to the `session_drafts_dir` setting (for example a folder in the Obsidian vault) or the plugin data folder, is never overwritten, and is only a draft: review it before pasting into the state file.
- End a session at every phase or milestone boundary anyway, after updating the state file.

## After any mode: improve (full text)

Record it with `lean-project lesson "<text>" --mode <mode> --project <name>`: include before and after tokens where measured, what saved the most, and what in these guides was wrong or wasted effort. The command creates the file (a "Local rules" section on top, "Entries" below), and a lesson seen twice becomes a line in "Local rules" with its entries moved to `LESSONS-ARCHIVE.md`. Keep the file under 60 lines; the command warns when it passes that. If a lesson would help every user, offer to draft an issue for the plugin's repository, and post only if the user says yes.

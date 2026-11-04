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
- `lean-project selftest`.

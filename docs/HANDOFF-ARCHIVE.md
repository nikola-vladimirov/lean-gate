# lean-gate hub: handoff archive

Sections moved verbatim from `docs/HANDOFF.md` when it outgrew its 60 lines (2026-11-08). Newest last. Read only for history.

## Rename to lean-gate (phase 1 of the improvement plan, 2026-11-08)

Done: plugin and marketplace `lean-gate`; CLI `bin/lean-gate` (`bin/lean-project` is a silent alias); skill `skills/lean-gate`; rule `lean-gate-first` (old id read through `RENAMED_RULES` in `hooks/gate.ts`); config `~/.claude/lean-gate.json` and `.lean-gate.json` (old files read while the new ones are missing, `readNewOrOld` in `hooks/register.tsx`, `gate_project_file` in `scripts/gate-on.sh`). `gate_migrate` in `scripts/gate-on.sh` copies (never moves) the old global config, `~/.claude/lean-project/memory` and the plugin data (lessons, session drafts, last full review, setup-nag counts) once, under a mkdir lock because several hooks start together (beta.2 nested the memory folder; fixed in beta.3). Kept on purpose: `lean-violations.tsv`, `lean-projects.json`, `lean-review/`, per-project `.lean-project` and `.lean-project-setup`.

Done on this machine: settings, memory, lessons and drafts copied (verified after restart); workspace `CLAUDE.md`, project CLAUDE.md files and workspace memory say lean-gate (`lean-gate-plugin.md`, stale state moved to `memory-archive.md`); old marketplace and the old `lean-gate-local` mod removed (mod folder in `archive/lean-gate-mod`); backups `settings.json.pre-lean-gate.bak`, `settings.json.bak-before-retire-2026-11-08`, `plugins/data/lean-project-lean-project.bak-2026-11-08`, `lean-projects.json.bak-2026-11-08b`.

## beta.4 (2026-11-08)

- Setup-nag counts are copied with the rest of the plugin data.
- `lean-gate phpcs` finds PHP and PHPCS when the PATH has neither: newest Laragon PHP, then the global Composer bin (`phpcs_path` in `bin/lib/phpcs.sh`). Installed here: PHPCS 3.13.6 with WPCS 3 in `%APPDATA%/Composer` (composer global, Laragon PHP 8.3); `lean-gate phpcs status` reports it.
- Standalone ponytail and wp-woo-performance-audit switched off (`lean-gate vendor retire`); the hub's own copies run from the next session.
- Registry: 15 projects registered (workspace children plus the TokenForge, Groundhogg and Nashenski repos), `lean-project` has alias `lean-gate`.
- New test: Details renders all 14 panel sections (fails when one is missing). The panel cannot be screenshotted from a session (computer use refuses the Claude app), so this is the render check.

Checks: 67 tests, selftest (migration, lock, nag, PHPCS lookup), `plugin validate` pass; tsc errors only the old ones in `mod.test.tsx`.

## beta.5: noise reduction (phase 2, 2026-11-08)

The violation log (500 rows) was 443 warnings from six rules. Changes:
- `routing-line` retired (145 warnings, never acted on; `agent-needs-model-effort` enforces model and effort on agents). Removed from `RULES`, the panel (row and the orange `no route`), `lacksRoutingLine` and its test; an old config key is ignored. Its doc lines are in `skills/lean-gate/ARCHIVE.md`.
- `lean-gate-first` and `wp-skills-for-wp-code`: the skill load lived only in module memory, which a plugin update or resume empties (it blocked twice in the rename session). On a miss they now read the transcript (`skillInTranscript`). After a compaction the old call may be gone; the rule then asks for one more load.
- `state-file-fresh`, `tests-before-done`, `phpcs-before-done`: warned once per session, then quiet until a turn fixes it (`mem.nagged`), instead of every turn.
- Session rules (those four plus `lean-gate-first`) skip folders that are not projects (`inProject`: registry hit or a project marker), so scratch chats are not judged.
- Tests: once-per-session, scratch skip, transcript lookup (fails with the lookup disabled). 67 tests, selftest, validate pass.

## beta.6: panel build (phase 3, 2026-11-08)

- Split refused by the platform: a hooks module may not pass the engine `$` across an import, so everything that takes `$` stays in `hooks/register.tsx` (lesson recorded). Pure panel data moved to `hooks/text.ts` instead: rule groups and meanings, presets, labels and the Explain text of every button.
- Buttons: drawn with chrome (`variant`), the main action of a row primary; section titles stay plain headings. Rule rows aligned (fixed-width level column).
- Explain (top row): a one-line explanation beside every button, and a legend for the top-row status items. The panel API has no tooltip, so this is the replacement.
- Settings section, chosen with the user: saving to global or this project (`editConfig`; mode, workflow, custom rules and demo pattern stay global), reminder frequency per end-of-turn rule (`reminders`), `scope`, `quiet`, `panel_start`, state file per project, PR only for this repo, public push presets, Reset to defaults with Undo reset, Export and Import (`lean-gate-settings.json`).
- Edits get the merged config read inside the save queue (`Edit` type), so quick presses build on each other. Found by the tests: an every-turn reminder that had already warned stayed quiet (fixed).
- Manual: `docs/LEAN-GATE.md` became `docs/MANUAL.md`, extended to every button, rule, config key, command, hook and skill. `doc_coverage` in the selftest fails when one of those is missing from the manual or a button has no Explain line.
- Descriptions rewritten: plugin.json, marketplace.json and the README lead.
- Tests: 71 (settings target, reminders, scope, quiet, reset and undo, export and import, Explain); selftest; validate.

## beta.7: rule stats (phase 4, 2026-11-08; pushed)

- `lean-gate stats [days]` (`bin/lib/stats.sh`): hits per rule (split block, warn, allow-once) and per project folder from `~/.claude/lean-violations.tsv`; old `lean-project-first` counts as `lean-gate-first`; `LEAN_VIOLATIONS` overrides the log.
- Panel section Rule stats (7 days): top five rules and projects; `stats-off` turns the noisiest rule that is still on off (retired and off rules skipped; saves where presses save), `stats-refresh`. Parsing in `statRules` and `statsView` (`hooks/gate.ts`).
- Log cap 500 to 2000 lines (`LOG_LINES`): 500 held only two days, so a week of stats was cut short.
- User call: PHPCS is not for every project. `phpcs-before-done` now counts only WordPress PHP (`isWpCode`, or any PHP once a WordPress skill is loaded); a Laravel edit is not judged. Known gap: `WP_HINT` matches `__(`, which Laravel also uses.
- Tests: 73, selftest (stats counts), validate.

## beta.8: panel look (2026-11-08; pushed)

Grilled with the user. API limits: Text takes any colour and background; a Button takes no colour at rest (only `hover`); real hover tooltips only inside `Svg` with `isInteractive` (`<title>`), which the terminal does not have.
- Colour as theme keys (`SECTION_COLOR`, `GROUP_COLOR`, `LEVEL_COLOR`, `MODEL_COLOR` in `hooks/text.ts`): an accent bar before every section and rule group title, the title in that colour on hover; a level dot on each rule row.
- Info icons (Svg, app surfaces only; terminal keeps Explain) on rule groups, Model routing rows and the Rule builder card (`GROUP_HELP`, `ROUTING_HELP`).
- Top row: state, tests, review and hit count as pills (inverse colour); the context meter has a ten-cell bar, orange from 70 percent, red from 90.
- Model routing rows show their choice folded (`opus:high, 3 at once`) in the model colour. Rule builder: a bordered card, the regex on the info icon or with Explain on.
- Rule stats: bars per rule, red for blocks and orange for warnings (`statRules` now returns block counts).
- Not seen on screen: the panel cannot be screenshotted from a session. Theme keys other than success, warning and error (`suggestion`, `permission`, `claude`, `inactive`) are unverified on the desktop; a key it does not know draws in the default colour.
- Tests: 74 (new: panel look), selftest, validate.

## Replaced in the 1.0.0 section (2026-11-08)

- Not seen on real macOS: the BSD sed and date fixes were checked by reading and in Git Bash only.

Release steps: commit on `hub`, fast-forward `main` to `hub` (main is an ancestor), the user presses Reviewed in the panel (the gate blocks the tag otherwise), tag `v1.0.0`, `lean-gate review-scope --full-done`, push `main`, `hub` and the tag (needs the user's OK), then remove the marketplace `ref` in `~/.claude/settings.json` and `claude plugin update lean-gate`.

## Replaced in the 1.0.1 section and Next (2026-11-08)

- GitHub release page `v1.0.0` published (notes from the CHANGELOG entry).

Ideas: stats over a longer window.

## 1.0.0: release (phase 5, 2026-11-08)

The user said it is not a beta anymore. Full review by two Opus reviewers (hooks TypeScript; CLI and hook scripts), 30 findings, all fixed; the shell fixes by a coding agent, checked here. Version history moved from the README to `CHANGELOG.md` (verbatim).
- Highest: PowerShell bypassed every shell rule (now `shellCommand` in `hooks/gate.ts`); session start would have hit its 10 s timeout as drafts piled up (`cmd_sessions` one pass).
- User call on repo-shipped `.lean-gate.json` lowering rules: keep it, but never silent (`loweredRules`: toast at session start, `project lowers n` pill, a line in Project).
- Checks: 80 tests, selftest (13 new checks, each failing on the old code), validate, tsc (old `mod.test.tsx` errors only).

Release steps (used for 1.0.0 and 1.0.1): commit on `hub`, `git fetch . hub:main` (fast-forward, no branch switch: other sessions share the folder), Reviewed mark, tag, `lean-gate review-scope --full-done` only after a full review, push `main`, `hub` and the tag (needs the user's OK), `gh release create` with the CHANGELOG entry, `claude plugin marketplace update lean-gate` and `claude plugin update lean-gate`.

## 1.0.1 (2026-11-08)

- GitHub release pages `v1.0.0` and `v1.0.1` published (notes from the CHANGELOG entries).
- CI selftest runs on ubuntu-latest and macos-latest (`.github/workflows/selftest.yml`, fail-fast off). macOS found: bash 3.2 misreads a `case` inside `$(...)` (`cmd_audit_security`), and BSD `wc` pads counts (`pack status` printed "parked       1"; two selftest checks). Fixed.
- The `main` and `v1.0.0` CI runs failed "migrate nested a folder when run at once" (Linux only, intermittent, never in Git Bash). CI logs showed three hooks copying at once despite the mkdir lock (cause of the overlap not found). `gate_migrate` now copies to per-process temp names, moves only while the target is missing, and removes its copy if it landed inside a folder another hook made meanwhile; the check prints what it found if it ever fails again. Five CI runs in a row passed on both systems (before: 2 of 3 Linux runs failed).
- The full-review record at `v1.0.0` had been written to a temp folder by the installed beta.8 CLI; recorded again in the plugin data folder (`review-scope`: 0 releases since the full review).
- `release-needs-review` is warn in the user's global config, so a tag only warns; the 1.0.1 diff was reviewed by hand before tagging.
- The GitHub page looked broken in the app browser pane: GitHub loaded without its styles and scripts there (no githubassets.com requests). The manual itself renders fine (checked with the GitHub API).
- Lessons review: none older than 14 days; two newer lessons that repeat existing rules were dropped to `LESSONS-ARCHIVE.md`.

## 1.1.0: WordPress.org review safeguards (2026-11-11)

Prompted by two WordPress.org review emails (Nashenski Commerce, TokenForge). New `bin/lib/wporg.sh` (`lean-gate audit wporg <dir or zip>`): checks per detailed guideline G1 to G17 plus the review team common issues. New gate rule `wporg-audit-before-release` (warn): zip, tag, gh release or svn commit of a plugin with `Stable tag:` needs the audit in the session; vague svn messages flagged (G14). `reference/wp-plugin-handbook.md`: all 102 Plugin Handbook pages plus the Common APIs security pages, distilled by two Sonnet agents from the REST API text (`/wp-json/wp/v2/plugin-handbook`, `apis-handbook`), 843 lines. WORDPRESS.md section 7 maps guidelines to checks.
- Tried on the real code: every item in both emails is flagged on the Nashenski 0.21.4 zip (TokenForge wporg code was already fixed). False positives removed: cache-folder writes (uploads resolved plugin-wide), `*_MIN_PHP_VERSION` constants, Silence is golden `index.php`, XML namespaces.
- Release review (one Opus reviewer, code changed since v1.0.1): 12 findings, all fixed with a failing-first test. Highest: `composer outdated` ran inside an untrusted zip (Composer plugins could run code); now never on a zip and always `--no-plugins`. Also: `build/` and `dist/` were not scanned, two trips per svn commit spent an allow-once, svn parsing (global options, `-F`, `-mX`), the audit counted when it died behind a pipe, `__MACOSX` and `.git` in zips, no-license packages, API version constants, zip cap and cleanup trap, no whole-file strings in awk. Zip checks run in CI (zip installed); locally verified through a bsdtar shim.
- Fixed in passing: `review-scope` kept one `last-full-review` for all projects (TokenForge's v0.54.2 had replaced lean-gate's); now one line per repo. lean-gate's record restored to v1.0.0 (old file backed up as `last-full-review.bak-before-1.1.0`).
- Checks: 82 tests, selftest, validate, tsc (old errors only).

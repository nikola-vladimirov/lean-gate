# lean-gate hub: handoff

Updated 2026-11-08 (beta.8). Repo `nikola-vladimirov/lean-gate` (renamed from lean-project 2026-11-08; GitHub redirects the old URL). Branch `hub`, `1.0.0-beta.8` pushed and installed (2026-11-08) as `lean-gate@lean-gate` (marketplace `lean-gate`, ref `hub`). `main` is 0.31.6, untouched. The local folder stays `E:\Claude Sessions\lean-project` (sessions and memory are keyed by it). To return to stable: in `~/.claude/settings.json` remove the marketplace `ref`, then `claude plugin update`.

Guides: `docs/HUB.md` (start here), `docs/MANUAL.md` (every button, rule, setting and command; update it with every feature or fix, `lean-gate selftest` checks it), `skills/lean-gate/STRUCTURE.md` (project layout).

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

## Next phases of the plan

5. Release 1.0.0: full review (`review-scope` says one is due; never on a beta), merge `hub` into `main`, tag, push, reset the marketplace ref.

## Commands

`claude plugin test .` · `npx --yes -p typescript@5 tsc --noEmit -p .` (old errors in `mod.test.tsx` about the Agent effort type) · `bash bin/lean-gate selftest` · `claude plugin validate .`

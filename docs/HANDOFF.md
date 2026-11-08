# lean-gate hub: handoff

Updated 2026-11-08. Repo `nikola-vladimirov/lean-gate` (renamed from lean-project 2026-11-08; GitHub redirects the old URL). Branch `hub`, `1.0.0-beta.4` pushed and installed, `1.0.0-beta.5` committed as `lean-gate@lean-gate` (marketplace `lean-gate`, ref `hub`). `main` is 0.31.6, untouched. The local folder stays `E:\Claude Sessions\lean-project` (sessions and memory are keyed by it). To return to stable: in `~/.claude/settings.json` remove the marketplace `ref`, then `claude plugin update`.

Guides: `docs/HUB.md` (start here), `docs/LEAN-GATE.md` (every button), `skills/lean-gate/STRUCTURE.md` (project layout).

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

## Next phases of the plan

3. Panel build:
   - Split `hooks/register.tsx` (about 1250 lines) per section first, so the UI work below reads small files.
   - Buttons that look like buttons (asked 2026-11-08, screenshot of beta.4): every panel button is drawn with `plain` (`gb` in `register.tsx`), which strips the chrome, so buttons and status text look alike. Drop `plain`, mark the main action of each row `variant="primary"` and the rest `secondary` (the desktop then draws native buttons, like the Changes pane's Create PR); keep status as `Text`.
   - Explanations: the panel API has no tooltip prop (`ButtonProps` has `hover` for style only). Add an `Explain` toggle (hotkey `?`) that shows a dim one-line explanation under each button and section, from the texts in `docs/LEAN-GATE.md`.
   - Align the rule rows: the level and the rule name start at different columns (screenshot).
   - More settings as buttons, for keys that today need a hand edit: `state_file`, `pr_repos` (toggle the current repo), `demo_pattern` (presets), the nag mode per end-of-turn rule (once per session or every turn), and the project-only scope. Grill the list with the user before building.
4. `lean-gate stats` from the violation log.
5. Release 1.0.0: full review (`review-scope` says one is due; never on a beta), merge `hub` into `main`, tag, push, reset the marketplace ref.

## Commands

`claude plugin test .` · `npx --yes -p typescript@5 tsc --noEmit -p .` (old errors in `mod.test.tsx` about the Agent effort type) · `bash bin/lean-gate selftest` · `claude plugin validate .`

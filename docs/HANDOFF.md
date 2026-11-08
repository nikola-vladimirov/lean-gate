# lean-gate hub: handoff

Updated 2026-11-08. Branch `hub`. Installed: `1.0.0-beta.3` as `lean-gate@lean-gate` (marketplace `lean-gate`, ref `hub`). Committed on `hub`, not pushed yet: `1.0.0-beta.4`. `main` is 0.31.6, untouched. To return to stable: in `~/.claude/settings.json` remove the marketplace `ref`, then `claude plugin update`.

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

## Waiting on the user

- Push `hub` and `claude plugin update lean-gate@lean-gate` (plugin pushes are asked first).
- GitHub repo rename `nikola-vladimirov/lean-project` to `lean-gate`: refused by the permission classifier ("Remote Repoint"); needs the user's explicit go or a permission rule. After it: `git remote set-url`, `plugin.json` homepage and repository, README `marketplace add` line, `settings.json` and `known_marketplaces.json` repo, workspace `CLAUDE.md` line 50, `lean-gate-plugin.md`.

## Next phases of the plan

2. Noise reduction: retire `routing-line`; `lean-gate-first` fires because the skill load lives only in the panel module's memory (`mem.leanLoaded` in `hooks/register.tsx`), which resets on a module reload such as a plugin update or resume, so read the load from the session transcript instead; once-per-session warnings for `state-file-fresh` and `tests-before-done`; skip scratch folders.
3. Split `hooks/register.tsx` (about 1250 lines) per section.
4. `lean-gate stats` from the violation log.
5. Release 1.0.0: full review (`review-scope` says one is due; never on a beta), merge `hub` into `main`, tag, push, reset the marketplace ref.

## Commands

`claude plugin test .` · `npx --yes -p typescript@5 tsc --noEmit -p .` (old errors in `mod.test.tsx` about the Agent effort type) · `bash bin/lean-gate selftest` · `claude plugin validate .`

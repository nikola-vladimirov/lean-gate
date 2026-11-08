# lean-gate hub: handoff

Updated 2026-11-08. Branch `hub`. Installed: `1.0.0-beta.2` as `lean-gate@lean-gate` (marketplace `lean-gate`, ref `hub`). Committed, not pushed: `1.0.0-beta.3` (the migration race fix). `main` is 0.31.6, untouched.

## Rename to lean-gate (phase 1 of the improvement plan, 2026-11-08)

Done: plugin and marketplace `lean-gate`; CLI `bin/lean-gate` (`bin/lean-project` is a silent alias); skill `skills/lean-gate`; rule `lean-gate-first` (old id read through `RENAMED_RULES` in `hooks/gate.ts`); config `~/.claude/lean-gate.json` and `.lean-gate.json` (old files read while the new ones are missing, `readNewOrOld` in `hooks/register.tsx`, `gate_project_file` in `scripts/gate-on.sh`). `gate_migrate` in `scripts/gate-on.sh` copies (never moves) the old global config, `~/.claude/lean-project/memory` and the plugin data (lessons, session drafts, last full review) once, from every hook and the CLI. Kept on purpose: `lean-violations.tsv`, `lean-projects.json`, `lean-review/`, per-project `.lean-project` and `.lean-project-setup`, the GitHub repo name. Fixed on the way: Bash-run lessons went to the `lean-project-inline` data folder (glob sort); its two stray lessons were merged into the main file (backups `*.bak-2026-11-08`).

Checks: 66 tests, selftest (with migration cases), `plugin validate` pass; tsc errors only the old ones in `mod.test.tsx`.

Install notes: `claude plugin marketplace remove lean-project` deleted the old plugin data folder; it was restored from `~/.claude/plugins/data/lean-project-lean-project.bak-2026-11-08` so the first lean-gate session copies the lessons. Settings backup: `settings.json.pre-lean-gate.bak`.

After the first restart (2026-11-08): the copy ran (config, memory, lessons, session drafts all there), but two hooks ran it at once and nested the memory folder (`lean-gate/memory/memory`, an exact duplicate, removed). beta.3 adds a mkdir lock (`gate_migrate`) and a selftest that runs four copies at once; it fails on beta.2's code every time. Workspace `CLAUDE.md`, project CLAUDE.md files and the workspace memory now say lean-gate (`lean-project-plugin.md` became `lean-gate-plugin.md`). Still open: push beta.3 and `claude plugin update lean-gate@lean-gate`; optional GitHub repo rename (GitHub redirects); the setup nag counter (`setup-nag-*` in the data folder) was not copied, so the nag shows up to three times again per project.

Next phases of the plan: 2 noise reduction (routing-line, lean-gate-first cause, once-per-session warnings, skip scratch folders), 3 panel check and register.tsx split, 4 `lean-gate stats`, 5 release 1.0.0.

## Where it stands

lean-gate (docked panel plus rule gate) is now the hub that controls everything in the plugin. Guides: `docs/HUB.md` (start here), `docs/LEAN-GATE.md` (every button), `skills/lean-project/STRUCTURE.md` (project layout).

Done on `hub`:
- Gate outranks lean-project: precedence line in the prompt, skill docs defer, shell helpers (`scripts/gate-on.sh`) obey the master mode and per-helper buttons, context limit read from the gate config.
- Rules added: `distinctive-session-names` (block), `phpcs-before-done` (warn only). Master mode set to `block` in `~/.claude/lean-project.json`.
- Route button picks model and effort like Model routing.
- Project registry (`~/.claude/lean-projects.json`), detection, Set up / Start / Adopt / Walk test, Register folders here.
- Vendored: ponytail 5.3.3, wp-woo-performance-audit 0.1.0, icm-architect 8bc2f56 (all MIT) under `vendor/`; `lean-project vendor status|update ponytail|icm|retire`, `lean-project phpcs`, `lean-project icm`.
- Fix: the panel runs `lean-project` through the plugin bin folder (it was "command not found").
- Layout standard: `AGENTS.md` entry, one-line `CLAUDE.md`, numbered stages with checks.

Checks at last commit: 64 tests, selftest, `plugin validate` pass; CI selftest green on main.

## Install state

Marketplace `lean-project` in `~/.claude/settings.json` has `ref: "hub"` (backup `settings.json.pre-hub.bak`). To return to stable, remove the ref, re-add the marketplace, `claude plugin update lean-project`.

## Not done or not verified

- The panel has never been seen rendered (Project, Ponytail, WordPress checks, Built-in helpers sections are untested visually).
- PHPCS cannot run here: PHP and Composer are not installed.
- Standalone ponytail, wp-woo-performance-audit and lean-gate-local are still enabled; press Switch off standalone plugins in the panel, then restart.
- Registry starts empty (press Register folders here).
- Release gate: `review-scope` measures from the last tag, so the earlier hub commits were reviewed by hand, not by the tool.

## Next

1. Restart, check the panel, press Review (confirms the PATH fix).
2. Retire the standalone plugins, restart.
3. Use the beta for a while, then merge `hub` into `main` as 1.0.0 (tag, push, reset the marketplace ref).
4. Ideas: ICM walk test as a rule, an installer for PHP/Composer/WPCS, aliases editor for the registry.

## Commands

`claude plugin test .` · `npx --yes -p typescript@5 tsc --noEmit -p .` (old errors in `mod.test.tsx` about the Agent effort type) · `bash bin/lean-project selftest` · `claude plugin validate .`

# lean-project hub: handoff

Updated 2026-11-07. Branch `hub`, beta `v1.0.0-beta.1` (pushed, installed). `main` is 0.31.6, untouched.

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

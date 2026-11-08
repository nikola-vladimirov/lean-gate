# Changelog

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

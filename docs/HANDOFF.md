# lean-gate hub: handoff

Updated 2026-11-11. `1.1.0` released (see below). Repo `nikola-vladimirov/lean-gate` (renamed from lean-project 2026-11-08; GitHub redirects the old URL). `1.0.1` released: tag `v1.0.1` on `main` and `hub` (same commit, CI green on Linux and macOS), GitHub release page published, pushed and installed as `lean-gate@lean-gate` from the default branch (the `hub` ref is gone from `~/.claude/settings.json` and `plugins/known_marketplaces.json`; backups `*.bak-before-1.0.0`). The local folder stays `E:\Claude Sessions\lean-project` (sessions and memory are keyed by it). Work continues on `hub`; release by fast-forwarding `main`.

Guides: `docs/HUB.md` (start here), `docs/MANUAL.md` (every button, rule, setting and command; update it with every feature or fix, `lean-gate selftest` checks it), `skills/lean-gate/STRUCTURE.md` (project layout), `CHANGELOG.md` (every version).

Built before 1.0.0 (details verbatim in `docs/HANDOFF-ARCHIVE.md`): **rename** to lean-gate with the copy-once migration, **beta.4** PHPCS lookup and registry, **beta.5** noise reduction, **beta.6** panel build, Settings, Explain and the full manual, **beta.7** rule stats, **beta.8** panel colour and info icons.

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

## Next

Nothing in progress. Ideas: stats over a longer window; why the migration lock let several Linux hooks through (harmless now).

## Commands

`claude plugin test .` · `npx --yes -p typescript@5 tsc --noEmit -p .` (old errors in `mod.test.tsx` about the Agent effort type) · `bash bin/lean-gate selftest` · `claude plugin validate .`

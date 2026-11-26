# lean-gate hub: handoff

Updated 2026-11-26. `2.0.0` built on `hub`, not committed, tagged or pushed yet (see "2.0.0" below). Last release `1.1.1` (tag `v1.1.1` on `main` and `hub`, installed as lean-gate@lean-gate 1.1.1). Repo `nikola-vladimirov/lean-gate` (renamed from lean-project 2026-11-08). The local folder stays `E:\Claude Sessions\lean-project` (sessions and memory are keyed by it). Work continues on `hub`; release by fast-forwarding `main`.

Guides: `docs/HUB.md` (start here), `docs/MANUAL.md` (every button, rule, setting and command; update it with every feature or fix, `lean-gate selftest` checks it), `skills/lean-gate/STRUCTURE.md` (project layout), `CHANGELOG.md` (every version), `docs/PLAN-2.0.md` (the 2.0 spec).

History (verbatim in `docs/HANDOFF-ARCHIVE.md`): the rename and betas, **1.0.0** full review and release, **1.0.1** macOS CI and the migration race, **1.1.0** WordPress.org review safeguards (`audit wporg`). **1.1.1**: end-of-turn misses reach Claude via `scripts/pending-note.sh`, clearer release-block message.

Release steps: commit on `hub`, `git fetch . hub:main` (fast-forward, no branch switch: other sessions share the folder), Reviewed mark, tag, `lean-gate review-scope --full-done` only after a full review, push `main`, `hub` and the tag (needs the user's OK), `gh release create` with the CHANGELOG entry, `claude plugin marketplace update lean-gate` and `claude plugin update lean-gate`.

## 2.0.0: trackers, removals, local fixes (2026-11-26)

Asked for by the user: make lean-gate fit the Nashenski hub's Planka workflow, remove what is dead, improve local work. Spec and decisions: `docs/PLAN-2.0.md`. Built by two Opus coding agents (hooks; CLI and scripts) in parallel, docs by Sonnet, checked here.
- **Trackers** (global-only `person` and `trackers` keys, so a cloned repo cannot inject prompt text): rules `tracker-card-first`, `tracker-git-codes` (replaces `one-pr-per-fix` and `pr_repos`), `tracker-sync-after-push`, `tracker-brief`, all warn; a Tracker panel section; a session-start note to run the tracker's `start` instead of reading the index and state file. The user's global config has the Nashenski Planka entry (backup `~/.claude/lean-gate.json.bak-before-2.0.0`).
- **`no-secrets-outward`** (block): replaces the user's `secrets-in-files` custom rule once 2.0 is installed (remove that custom rule then).
- **Removed:** the rename shims (`bin/lean-project`, old config names, `gate_migrate`, `RENAMED_RULES`), the llama, ollama, unsloth, aider and goose runners.
- **Local:** session start loads SKILL.md itself (the `lean-gate-first` block fired 72 times in 30 days), prunes old markers, archives drafts; `lean-gate ignore` (workspace `.ignore` hides `Software Stuff/`, 250k third-party files; `Nashenski/.ignore` puts back the product repos the hub's whitelist `.gitignore` hid from Grep); `board archive` and `export`, one board per repo across worktrees; `review-scope` lists card codes; unknown config names are named.
- Done outside the repo: memory consolidated (8 notes archived), boards archived (Nashenski Commerce and TokenForge locally; Pro committed `70972a1` on its `main`, not pushed), hub `docs/RULES.md` line about the checks committed `c49c393` on nashenski-hub `main`, not pushed (then `node planka/sync.mjs` for each project). Boards left: Groundhogg, Shop and temu have open cards; `nashenski-pro-wt-bridge` holds its branch's copy.
- Full review (two Opus reviewers, the whole hooks and shell code): hooks 12 findings (high: git commands inside `{ }`, `then` or `do` were invisible to every git rule, PowerShell `if ($?) { ... }` included; also a repo's `routing` value could inject prompt text, a pre-2.0 bug), CLI 8 findings (draft archiving could move non-draft notes, `board archive` could lose a line). All fixed with failing-first tests by two Opus agents; checked here. Left on purpose: the before-call code-edit checks ignore MultiEdit (pre-2.0; Claude Code no longer has that tool).
- Checks: 107 tests, selftest ok, validate, tsc (37 old `mod.test.tsx` errors only), repo scan for key-shaped strings 0 hits. Not run on macOS or Linux (CI does that on push).

## Next

1. With the user's OK: release 2.0.0 (steps above; press Reviewed, then `review-scope --full-done`), push the Pro (`70972a1`) and hub (`c49c393`) commits, run `node planka/sync.mjs` for each hub project, then remove the `secrets-in-files` custom rule from the global config.

## Commands

`claude plugin test .` (in Git Bash: `/c/Users/bebog/.local/bin/claude.exe`) · `npx --yes -p typescript@5 tsc --noEmit -p .` (37 old errors in `mod.test.tsx` about the Agent effort type) · `bash bin/lean-gate selftest </dev/null` · `claude plugin validate .`

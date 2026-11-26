# lean-gate 2.0.0: build plan

Decided 2026-11-26 with the owner: a generic tracker module (Planka first, for the Nashenski hub), removal of 1.x leftovers, and local-work fixes. Breaking, so 2.0.0, with a full review before the tag.

## 1. Tracker config (global file only)

A repo-shipped `.lean-gate.json` must not set it: its hint text reaches the session prompt (same reason `workflow` is global only). `projectLayer` drops `trackers` and `person`.

```json
"person": "nick",
"trackers": [{
  "name": "Nashenski Planka",
  "paths": ["E:/Claude Sessions/Nashenski", "E:/Claude Sessions/NashenskiBiznes"],
  "start": "node planka/planka.mjs start <commerce|pro|engine|biznes> (Biznes: node ../Nashenski/planka/planka.mjs start biznes)",
  "start_match": "planka\\.mjs[\"']?\\s+start\\b",
  "claim_match": "planka\\.mjs[\"']?\\s+(create\\b|move\\s+\\S+\\s+[\"']?In Progress)",
  "code": "(CM|PR|EN|BZ)\\d+",
  "branch": "^{person}/{code}-",
  "docs": "\\.md$",
  "mirrored": "(^|/)(docs/[^/]+\\.md|CLAUDE\\.md|[^/]*-(INDEX|HANDOFF|PLAN|RULES)\\.md)$",
  "sync": "node planka/sync.mjs <project>",
  "sync_match": "planka/sync\\.mjs"
}]
```

- A folder is in a tracker when its slash-normalized path, compared case-insensitively, starts with one of `paths`. Edit rules use the file path; git rules use the repo the command runs in (`-C`, `cd x &&`, else the session folder); session start and Agent calls use the session folder.
- Bad regexes are dropped with the tracker (reuse `regexOk`). `{person}` and `{code}` are substituted before compiling `branch`.

## 2. New rules

| Rule | Default | Kind | What it checks |
| --- | --- | --- | --- |
| `tracker-card-first` | warn | before the call | A code edit in a tracker folder (not a path matching `docs`) before a shell command matching `start_match` and one matching `claim_match` ran in this session. |
| `tracker-git-codes` | warn | before the call | `git commit` in a tracker repo. Docs-only commits pass (staged files, plus tracked modified files for `-a`, all match `docs`). Otherwise: the branch must match `branch` (main or master gets "card work goes on <person>/<CODE>-<slug>"), and a `-m`/`--message` subject must start with a `code` match. `-F` skips the subject check. Replaces `one-pr-per-fix` and `pr_repos`. |
| `tracker-sync-after-push` | warn | end of turn, warn only | A turn ran `git push` in a tracker repo, the session edited a path matching `mirrored`, and no command matching `sync_match` ran after that push. Goes through the pending note like `push-after-tag`. |
| `tracker-brief` | warn | before the call | An Agent call from a tracker folder: the prompt has a `code` match and `AGENT_NAME`; any `AGENT_MODEL=` or `AGENT_EFFORT=` in it equals the call's own model and effort. |
| `no-secrets-outward` | block | before the call | Key-shaped strings in Edit, Write and MultiEdit text, in any shell command's text (commit messages, gh bodies, planka comments, curl data) and, at `git commit`, in the staged added lines (`git diff --cached -U0`, 2 MB cap). Placeholders (`EXAMPLE`, `xxxx`, `XXXX`, `dummy`, `fake`, `0000`) pass. The message never repeats the secret. |

Patterns for `no-secrets-outward`: `(sk|rk)_live_[A-Za-z0-9]{16,}`, `whsec_[A-Za-z0-9]{16,}`, `-----BEGIN [A-Z ]{0,20}PRIVATE KEY-----`, `gh[pousr]_[A-Za-z0-9]{30,}`, `github_pat_[A-Za-z0-9_]{30,}`, `AKIA[0-9A-Z]{16}`, `xox[baprs]-[A-Za-z0-9-]{10,}`, `sk-ant-[A-Za-z0-9_-]{20,}`, `glpat-[A-Za-z0-9_-]{20,}`, and `(api[_-]?key|secret|token|password)\s*[:=]\s*["'][A-Za-z0-9_\-]{20,}["']`.

## 3. Changed behaviour

- `lean-gate-first`: session start injects the lean-gate SKILL.md body in project folders, headed `[lean-gate skill loaded at session start]`; the rule counts that marker in the transcript as a load (also after a compaction, since the hook runs again).
- `distinctive-session-names`: a card code after the date (`09:30 26-11-2026 EN8 Fibank`) passes (test it; change only if it does not).
- Tracker orientation: at session start in a tracker folder Claude is told to run the tracker's `start` instead of reading the index and state file.
- Unknown config names: rule ids that are neither built in nor custom, and retired keys (`pr_repos`), are named once at session start (toast) and in the panel's Settings section.
- Panel: a Tracker section, shown only in a tracker folder: tracker name, `start` age this session (or "not run"), card codes seen this session; buttons `tr-start` Start, `tr-cards` My cards, `tr-review` To In Review (each asks Claude, like `mem-recall`).

## 4. CLI

- `delegate`: runners `none` and `opencode` only; llama, ollama, unsloth, aider and goose removed with their keys; default fallback `opencode`; a `.lean-project` naming a removed runner says so and falls back. The `.lean-project` file keeps its name.
- `board`: the default board is the main checkout's (`git rev-parse --git-common-dir`), so worktrees share it. `board archive [--force]` appends BOARD.md verbatim to `docs/BOARD-ARCHIVE.md` under a dated heading and removes it (refused while a card is doing or blocked, unless `--force`). The board view prints an archive hint when the file passes 60 lines or every card is done. `board export [ids]` prints a markdown summary for a tracker card comment and writes nothing.
- `review-scope`: also prints "Cards in this release:" with the codes (`^[A-Z]{2,4}[0-9]+\b`) of commit subjects since the last tag.
- `memory add --tag decision`: when the repo has a PLAN file (`docs/PLAN.md`, or `*PLAN*.md` at the top or in `docs/`), also prints "Also record it in <file>'s decision log: the repo is the source of truth."
- `ignore [dir] [--apply]`: child folders that are not registered projects and hold over 5000 files, plus `backups/`, `archive/`, `releases/` and `*.zip`, as `.ignore` lines (ripgrep, so Grep and Glob skip them); dry run unless `--apply`, which appends missing lines only.
- Session start: prunes `guard-docs-*`, `guard-test-*` and `nudge-*` markers older than 7 days (`setup-nag-*` stays: it counts setup reminders per project), and moves session drafts older than 30 days to `sessions/archive/`.

## 5. Removed

- `RENAMED_RULES` and the `lean-project-first` id; reading `lean-project.json` and `.lean-project.json`; `gate_migrate` in `scripts/gate-on.sh`; `lean-gate-local` in `vendor retire`; `lean-project` in `isLeanSkill`. The stats alias for old log rows stays.
- `one-pr-per-fix` and `pr_repos`.
- The five delegate runners above.

## 6. Order

1. Hooks agent (`hooks/`, `types/`) and CLI agent (`bin/`, `scripts/`) in parallel; no shared files.
2. Docs (Sonnet): MANUAL, CHANGELOG, HUB, README, skill guides (BUILD board, TOOLS delegate, SKILL).
3. Lead: version 2.0.0, global config, workspace `.ignore`, board archives, memory cleanup, hub note.
4. Checks: tests, selftest, validate, tsc; full Opus review of the 2.0 diff; fixes; `review-scope --full-done` after the review.

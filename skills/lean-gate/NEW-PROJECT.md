# New-project mode

Goal: a project any fresh session can pick up for about 1 to 2k tokens: a short index, a plan with gates, a state file. Nothing else until the project needs it.

## 0. Mandatory startup

Before anything else, run the startup cards in `STARTUP.md`. This applies to every new project and every adoption, with no exceptions. Its answers become the D# rows the rest of this guide writes into the plan.

## 1. Ask once, or grill

**Loosely described** (an idea or a one-liner, or the user cannot yet say what done looks like, who it is for, or what the main pieces are): read `GRILL.md` and follow it instead of the single round below. Its settled decisions feed the plan in step 3.

Otherwise, one round of questions (the AskUserQuestion tool if available), skipping anything already known:

- What it is, who it is for, and what done looks like.
- Stack or platform, and how it ships (zip, package, container, site).
- What exists already: spec, code, designs, APIs and their docs, reference projects.
- Hard constraints: deadline, budget, must and never rules, who else works on it.

Unknowns become assumptions and decisions with defaults in the plan, so they never block the start.

## 2. Lay out the folder

```
<project>/
├── CLAUDE.md         index: status, folder map, reading rules by task, upkeep, ground rules
├── docs/
│   ├── PLAN.md       goal, assumptions, decisions, architecture, sources, phases with gates, risks
│   └── HANDOFF.md    state: now, in progress, next
└── <code>/           the stack's usual layout
```

- **Docs never ship.** When the deliverable is a folder that ships whole (a WordPress plugin, an npm package, a theme), put the shipped code in a subfolder (`plugin/`, `src/`, `package/`) or exclude `docs/` and `CLAUDE.md` from the build (export-ignore, `files`, `.npmignore`).
- **Copy the templates** from the `templates/` folder (path in TOOLS.md; `INDEX.md` becomes `CLAUDE.md`; `PLAN.md` and `HANDOFF.md` go to `docs/`) and fill them. Delete template lines that do not apply; never leave placeholders.
- **Extras only when needed:** `templates/extras/RULES.md` once there are more than about 10 binding rules or several contributors; `INTEGRATIONS.md` when the project calls external APIs; `ARCHIVE.md` the first time text is replaced; `GLOSSARY.md` when grilling settles the first term (format in `GRILL.md`).

## 3. Write the plan

- Keep it as short as the project allows. Stable IDs on everything (A1, D1, P1, R1) so a grep finds one line.
- Every decision gets a default, so work can start before the user answers. Status is `open` or `decided`. Write `needs D<n>` in a decision's text when it waits on another; `lean-gate frontier docs/PLAN.md` then lists what to ask next.
- **Phases are gates.** Each phase lists its scope and acceptance checks that a command or a person can verify. The next phase starts only when every check is ticked in the plan.
- **Phase 0 verifies unknowns** (API behaviour, limits, data formats, access) when the project depends on anything external. Facts from unofficial sources are leads until checked.
- Optional per phase: which parts go to which model (see `BUILD.md`).

## 4. Version control

If the folder is not a repository, offer `git init` with a `.gitignore` for the stack. Ask before creating any remote or pushing.

## 4b. Delegation choice

Ask once with AskUserQuestion, with the default first: none (do all work here), llama (the local llama.cpp server, for example yuxinlu1 gemma-4-12B-coder Q4_K_M), or opencode (free OpenCode models, default `opencode/deepseek-v4.1-flash-free`). Save it with `lean-gate delegate set runner <value>`, then `lean-gate delegate check`. The same question is asked on a project's first session, and for adopted projects in step 1 of "Adopting a project". Never pick a paid model for opencode.

## 5. Finish

Run `lean-gate toc` on docs of 80+ lines and `lean-gate cost <project>`. Report the session-start tokens (auto-loaded plus the state file), list the open decisions the user should answer, and record a lesson.

## Adopting a project

For a project already under way: code, history and docs exist, but no phased plan. The plan is reconstructed, not invented, and existing files are never replaced.

0. **Pre-fill the startup cards.** Steps 1 and 2 give the evidence; `STARTUP.md` turns it into recommended answers ("Adopting an existing project"). Ask only the blank ones.
1. **Read what exists, cheaply:** the index and state file (whatever names the project uses), `git tag` and `git log --oneline` (a range, not the whole history), the changelog's recent window, and the code through the graph tool or `lean-gate map <dir>`. A haiku subagent does any bulk reading and returns a summary.
2. **Keep the project's layout.** Its index, state file, doc names and docs folder stay (see "Docs folder" in TOOLS.md). Only missing pieces are added: the plan from `templates/PLAN.md`, a state file if there is none. An oversized or duplicated index or state file is a job for `DOCS.md`, run after this.
3. **Write the plan from the evidence:**
   - Goal, architecture and sources: from the index, readme and code, one line each.
   - Released versions and finished work: one phase each, every check ticked, with the tag or commit as the evidence. Do not re-verify shipped work unless the user asks.
   - Work in progress and the state file's "Next": the open phases, each with acceptance checks.
   - Decisions already visible in code or docs: D# rows marked "decided", with a pointer to where they show.
   - Rules already in memory or a rules doc stay there; the plan points to them.
4. **Grill only the gaps** (`GRILL.md`, with docs): what done looks like for the open phases, decisions that contradict each other or the code, and anything the evidence cannot answer. Never ask what the code, git or the docs already say.
5. **Point the index to the plan** with one line, then finish as in step 5 above.

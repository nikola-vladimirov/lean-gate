# Build mode: plan-driven development across models

For building a project phase by phase from its plan. The main session is the lead: it plans, decides, integrates and verifies. Cheaper models do the parts that fit them, in subagents whose context is thrown away. Goal: the cheapest model that passes each task, and the least context carried by the lead.

## Before a phase

1. Read the "Local rules" and "Model fit" lines in the lessons file (path in SKILL.md). They override the routing table below.
2. No phased plan yet (a project already under way): adopt it first (`NEW-PROJECT.md`, "Adopting a project"). Then read the state file, then only the plan's section for this phase and the sections it names (contents table ranges). The binding rules doc in full only if code will be written.
3. Split the phase into tasks. Each task gets a file set, plan references (line ranges and IDs, not pasted text), an acceptance check (a command or an observable result) and a route from the table. Tasks that touch the same files go to one writer, in order. A phase that runs as stages with output handoffs gets a stage contract per stage (`templates/STAGE-CONTRACT.md`): its Inputs table lists the exact files and sections to load.
4. Put the task list in the app's task list (`update_plan`), not in a new doc. When two or more tasks are delegated, also add each as a card on the board (below), card ID = task ID.

## Board: how tasks talk to each other

Subagents cannot see each other, and their replies reach only the lead. The board is the shared channel: one append-only file, `BOARD.md` in the docs folder (SKILL.md), read and written only through `lean-project board`, so parallel writers never overwrite each other and readers get a compact view instead of the raw log.

```
lean-project board                      # columns (doing, blocked, todo, done) and the latest 10 notes
lean-project board T3                   # one card's full history
lean-project board add T3 <title>       # lead, before delegating
lean-project board move T3 doing        # todo | doing | blocked | done, optional reason after blocked
lean-project board note T3 <one line>   # a fact another task needs
lean-project board files T3 <paths>     # the files the card changes; the gate checks them on done
```

Every call is prefixed with `LEAN_BOARD=<absolute path to BOARD.md> LEAN_AS=<agent name>`. The absolute path matters: a worktree has its own copy of the docs folder, and a note written there reaches no one.

- **Agents:** read the board at start; move the card to `doing`; post a note the moment you learn something a sibling task depends on (a contract, a format, a gotcha, a file you had to touch outside your set); `blocked <reason>` and stop when you need another card's output; `done` before replying. Read another card (`board <id>`) when your task depends on it.
- **Lead:** check `lean-project board` instead of waiting on replies; unblock blocked cards (answer with a note, or rerun the task once its dependency is done). Notes are leads, not proof: verify before relying on them.
- **The gate runs on `done`.** Record a card's files with `board files`. Moving the card to `done` runs `lean-project check gate <ID>`: `php -l` on its PHP files, and `phpcs` with the WordPress standard when installed (or the project's own `phpcs.xml`). A failure moves the card back to `todo` with the tool output on the card; the agent fixes the code and moves it again. A missing tool is reported in the gate line, not treated as a failure. `LEAN_GATE_SKIP=1` skips the gate for one command.
- **Notes are facts, not progress.** One line each. "Started", "looking at X", "almost done" cost every reader and say nothing the column does not.
- **Separate sessions** (`start_session`) use the same file and the same absolute path.

## Routing

| Work | Model | Effort | How |
|---|---|---|---|
| Bulk reading: API docs, reference or competitor projects, long logs | haiku | low | Agent, background, several at once; returns answers with source paths, or writes them into one named doc section |
| Code sweep: where is X, every caller of Y | haiku | low | Explore agent, `model: haiku` |
| Fixtures: sanitise real responses, build test data | haiku | medium | Agent; the lead spot-checks for leftover personal data |
| Well-specified unit from the plan (one class or function with its contract) plus its tests | sonnet | medium | Agent (general-purpose), one writer per file set |
| Admin screens, settings, i18n strings, readme and changelog drafts | sonnet | low | Agent |
| Lint and static-analysis fixes | sonnet | low | Agent, loop until clean |
| Bricks or BricksExtras element, template, query, condition or form, one well-specified change | sonnet | medium | Agent; the brief names its one `builder/<skill>/SKILL.md` (from `builder/INDEX.md`) under "Read only" |
| Bricks site architecture, global styles, or a broad site audit | lead | the session's own | here, with `builder/INDEX.md` routing to the one skill needed |
| REA reverse-engineering analysis (evidence, decompile, version diff) | lead | the session's own | here, after `reverse/SKILL.md` and the one reference it names; REA MCP must be on |
| Architecture, data model, migrations, sync and idempotency, money or data-loss paths | lead | the session's own | here, not delegated |
| Security review and code review at release (review-scope list), acceptance check | opus | high | Agent with fresh context (not the author's); the lead itself when the lead is Opus and has not written the code |
| A failure the first route could not fix twice | see "After each task" | | |

Pass both with the Agent tool's `model` (`haiku`, `sonnet`, `opus`) and `effort` (`low`, `medium`, `high`, `xhigh`, `max`) parameters; `start_session` takes the same two. Effort is the cheaper dial: more thinking on the same model costs less than the next model up, so raise it first. Keep `xhigh` and `max` for the lead's own hardest calls, never for routine delegation.

## How to delegate

- **Always set `model` and `effort` on every Agent call, from the table.** An Agent call without `model` runs on the lead's active model, which is the cost this table exists to avoid. Explore and general-purpose agents inherit the same way, so pass `model` on them too. Never write a delegated call with the parameter left out, and never leave the choice to the default.
- **Read-only tasks:** Agent with `model` and `run_in_background: true`; run independent ones in parallel, at most about 5 at a time.
- **Writing tasks:** one at a time in the same checkout by default. Parallel writers only on disjoint files and only with `isolation: "worktree"` (needs git); the lead merges.
- **A large independent piece** (hours of work): propose a separate session (`start_session`, `model` set, own worktree). Start it only when the user asked for separate or parallel work.
- **Workflow tool:** only when the user says "use a workflow".
- **Runner:** when the project's `.lean-project` runner is `llama` or `opencode`, bulk reading, code sweeps, fixtures and lint loops go to `lean-project delegate run <brief> <output>` instead of an Agent call. The lead reads the output file and verifies it. Security, architecture and review stay on Claude. When the runner is `none`, use the Agent calls above.
- **Too small to delegate:** anything that takes fewer tool calls than writing its brief. Do it here.

## Brief (every delegated task)

Subagents start cold and do not see memory, so the hard rules go in the brief and the docs are pointed to, not pasted.

```
Task: <one sentence>. Project index: <path> (short, read it first).
Read only: <file:start-end>, <file:start-end>. Rules that apply: <IDs>.
Change only: <files>. Touch nothing else.
Done when: <command passes / observable check>.
Constraints: <user rules from memory: no em dashes, prefixes, text domain, no live writes, ...>.
Board (only when the phase has 2+ delegated tasks): card <ID>. Prefix every call with LEAN_BOARD=<abs path> LEAN_AS=<name>. Run `lean-project board` first, move <ID> to doing, note facts siblings need, blocked <reason> if stuck on another card, done before replying.
If the project has a code graph tool, query it before exploring; map files over 300 lines (lean-project map) and read ranges.
Return in under 15 lines: files changed, check result, open questions. No code dumps.
```

## After each task

- **Verify it yourself:** read only the changed hunks and run the check. A subagent's report is not proof.
- **Failed once:** the usual cause is a missing piece of context. Fix the brief and rerun on the same model.
- **Failed twice:** raise the effort one level on the same model (low to medium, medium to high) and rerun.
- **Failed three times:** move one model up (haiku to sonnet, sonnet to opus or the lead), starting again at medium effort.
- **Record model fit** in LESSONS.md as "Model fit: <task type>, <model> at <effort>, passed / failed because <reason>". When the same task type passes twice at a lower setting than the table says, or fails twice at the table's setting, add the corrected route to the "Local rules" in LESSONS.md.

## Phase gate

1. An Opus reviewer (or the lead, if it did not write the code) checks the phase's acceptance criteria and ticks them off in the plan.
2. Tests run on every change, with the stack's testing skills when installed. Security and code review run at release, on the list `lean-project review-scope` gives, not at each phase (SKILL.md, "Review scope").
3. Board: move notes that stay true (contracts, formats, gotchas) into the plan or rules doc, then append the board verbatim to the archive file under a dated heading and remove `BOARD.md`. The next phase starts with an empty board.
4. Update the state file, refresh the code graph if the project has one, and end the session. The next phase starts fresh from the state file.

## Cost guards

- Subagent replies stay under 15 lines; never open their transcripts.
- Read the board through `lean-project board`, never the raw file.
- Parallel only for independent tasks.
- The lead reads diffs and check output, not whole files a subagent wrote.

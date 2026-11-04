---
name: lean-project
description: Run a project with the fewest tokens per session. Plans new projects, grills fuzzy changes, trims docs and CLAUDE.md, maps large files, routes builds to Haiku, Sonnet or Opus on a shared board, and holds the WordPress, Bricks and REA guides (read on demand). Always on, for every project.
---

# lean-project

One goal: the fewest tokens a session spends to get oriented, stay oriented and get the work done, without losing information.

**Always on.** This applies to every project and task. Before any task, choose the model and tool for each part as set out in `ROUTING.md` (mandatory). Starting or adopting a project runs the setup cards in `STARTUP.md` first. WordPress, WooCommerce, Bricks and block-editor work follows `WORDPRESS.md` on every change.

## Review scope (release gate; mandatory)

Code, performance and security reviews are a release gate, not a per-task step. Testing still runs on every change. At release, `lean-project review-scope` lists the code changed since the last release tag and says whether a full review is due. Review those files, run `lean-project audit security` and `lean-project audit perf` on that list, and report findings in them.

A full review runs on every major release and every 5 to 10 minor ones; `review-scope` counts them. When it says one is due, run it and record it with `lean-project review-scope --full-done`. Never run a review on an in-progress build.

## Pick the mode, read only its guide

| The user wants to | Read |
|---|---|
| Start a new project | `STARTUP.md` first (mandatory setup cards), then `NEW-PROJECT.md` (loose ideas go through `GRILL.md`) |
| Take over a project already under way that has no phased plan | `STARTUP.md` first (mandatory setup cards), then `NEW-PROJECT.md`, "Adopting a project" |
| Sharpen a fuzzy change, feature or design in an existing project | `GRILL.md` (with docs) |
| Organize, audit or trim docs, CLAUDE.md, memory or handoffs | `DOCS.md` |
| Build from the plan (a phase, a feature, a release) | `BUILD.md` |
| Work on a live client website (approvals, drafts, backups, CDN, tokens) | `CLIENT-SITE.md`, then `WORDPRESS.md` for any code change |
| Write or edit website text (product pages, guides, blog, FAQ) | `SITE-COPY.md` (method), plus the project's voice notes |
| Any task at all (routing, which model and which tool or plugin) | `ROUTING.md`, before starting |
| Build or review WordPress, WooCommerce, Bricks or block-editor code (plugin, theme, companion script) | `WORDPRESS.md`: how to read the docs, check changelogs, best practices, the security checklist and fixes. Read it before changing that code, every time. |
| Audit a WordPress or WooCommerce site or codebase for performance, HPOS or layout, onboard an inherited store, or triage a slow store | The `wp-woo-performance-audit` skill (its own public repo, installed in `~/.claude/skills`). Scope: at release, the files `review-scope` lists; the whole folder only for an audit the user asked for. Its scan is `lean-project audit perf`. |
| Build or change a Bricks or BricksExtras site, page, template, element, query or condition | `builder/INDEX.md`, then only the one `builder/<skill>/SKILL.md` the task needs |
| Need a skill or plugin that is off (the wp-* skills, Bricks skills, the ui-ux plugin) | `lean-project pack status`; if it is off, `lean-project pack on <name>`, then a new session. Those packs are on demand, so nothing else loads them. |
| Reverse-engineer a shipped app, package, firmware or browser target | `reverse/SKILL.md`, then only the reference file it names |
| Check a WordPress plugin for WordPress.org submission, set up PHPStan, review WooCommerce code, check docs against code, or review tests | `reference/README.md`, then only the one file it points to |

The builder and reverse folders are on-demand reference. Their old standalone skills are parked, so nothing else loads them. Read them only for the task at hand: a plan step that names a Bricks element or REA target is the trigger, not a general interest. Plain WordPress plugin work does not need them.

REA needs its MCP server, which is parked for startup cost. If the REA tools are not loaded, tell the user to run `bash ~/.claude/skills-off/parked.sh rea on <folder>` and start a new session. Do not work without it.

## Before any mode: lessons

Read the lessons file if it exists (path in `TOOLS.md`). Its "Local rules" section outranks the defaults in these guides.

## The tool

The commands, paths and settings (the docs folder, backups, the lessons file), session hygiene and lesson recording are in `TOOLS.md`. Read only the part you need. The cost model is in `DOCS.md`.

## Memory layers (which file answers which question)

| Question | Layer | Where to look |
|---|---|---|
| What was decided, and why | Decisions | `LESSONS.md`, "Local rules" first |
| How is the code structured | Code map | `lean-project map`, `map predict` |
| What happened in earlier chats | Conversation history | `lean-project sessions [n] [--here]`, then the draft it names |
| Where did we leave off | Continuity | the project's state file; the newest draft line at session start |
| What do parallel agents know now | Live coordination | the board (`lean-project board`) |

Read only the layer the question needs.

## Reading rules (every mode, every project)

1. Never read a file over about 300 lines whole. Get its map (or its contents table), then `Read` with `offset` and `limit`.
2. Find before reading: `Grep -n` for an ID or symbol, then read that range. Use the project's code graph tool first if it has one.
3. Do not `cat` whole files in Bash or re-read a file still in context.
4. Large tool output (logs, test runs, search results): filter it (`tail`, `grep`, `head`) before it enters the conversation.
5. Screenshots only for visual checks; page text or the accessibility tree otherwise.

## Session hygiene

The context-limit reminder, the new-session steps and the session-end draft are in `TOOLS.md`. End a session at every phase or milestone boundary, after updating the state file.

## After any mode: improve

Record a lesson with `lean-project lesson` (usage in `TOOLS.md`). Offer a plugin issue only if it helps every user, and post only on the user's yes.

## Precedence

The user's own rules (CLAUDE.md, memory) outrank this skill. Never delete content: replaced text moves verbatim to an archive file. Confirm before anything outward-facing (pushing, creating remotes, posting).

## WordPress, WooCommerce, Bricks and block editor

The three WordPress operations (`map predict`, the card gate, `audit waste`) and their details are in `WORDPRESS.md`.

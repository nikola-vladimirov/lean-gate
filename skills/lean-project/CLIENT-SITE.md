# Client website mode

Goal: work on a live client site (WordPress, Bricks, WooCommerce) with no unapproved change reaching the public, a clear record of each change, and the fewest tokens per session. Use for any site a client owns, live or not. Plugin and theme work also follows `WORDPRESS.md`.

## 1. Set up the project (once)

Run the grill (`GRILL.md`) with these questions, in rounds, and write each answer into the plan as a D# row:

1. Which server is live? Check public DNS and the origin IP. A CDN in front (Bunny, Cloudflare) means the origin is the one to SSH into; confirm with the client's answer and the site's own config, not a guess.
2. Is there a staging copy? Is it empty? Who may use it?
3. Test area: drafts or private pages on live, or staging.
4. Approval: per change, or per batch. Who gives the yes.
5. Backups: what is dumped and copied before each kind of change.
6. Acceptance per change: visual checks (desktop and phone), error-log check, security audit at release.
7. Change channel order: MCP abilities first, SSH file edits only when the builder cannot express the change. No direct database edits.
8. CDN cache: ask the purge scope after each live change; never purge on your own.
9. Client-facing copy: language, voice, fact-check rule (below).

Layout: `CLAUDE.md` (index), `docs/PLAN.md`, `docs/HANDOFF.md`, `docs/STACK.md` (read-only facts about the site: theme, builder, plugins, translation, styling, measured by read-only commands; never secrets), `backups/` (gitignored, may hold client data).

## 2. Read the stack once, and record it

Read-only only: active theme and its parent, active plugins with versions, translation setup, the styling sources (CSS plugins, snippet tools), and the abilities the MCP exposes. Write the result to `docs/STACK.md`. Do not re-read it each session; read the file.

## 3. Each change

1. Plan: target, change, acceptance checks. Self-check against the checks.
2. Backups: a database dump only when the change is a plugin change or could break the site. Draft pages, templates and components need none. Copy every file a code change will touch into `backups/<date>-<slug>/`.
3. Build as a draft or private page first. Test there.
4. Ask for the approval yes with the target and the change summary.
5. Publish; read back; run the acceptance checks; read the error log.
6. Stop and report if any check fails or a new PHP error appears. Do not publish.
7. Log one line in `docs/HANDOFF.md` per publish: date, target, change, approval reference. Ask the CDN purge scope.

## 4. Copy for a client site

Follow `SITE-COPY.md` (fact-check first, the house forbidden list, the human-writing check). The project's own voice notes and product facts sit in its docs folder and are read per task.

## 5. Tools and tokens

Model and tool choice for every task follows `ROUTING.md` (mandatory). Design work on a client site uses `ui-ux-pro-max` before any build, and TokenForge once it is installed and approved.

- Read the map of a file, then only the lines needed (`lean-project map`, grep).
- Filter large output before it enters the conversation.
- Bulk reads (more than about 5 files, big logs, big discovery results) go to a subagent that returns only the answer.
- Load a tool's schema (ToolSearch) only when the task needs it. Do not load all of a server's tools at start.
- Read-only remote commands need no approval; any write does.
- A failed tool call: stop, report, ask. No retry through another route without a yes.
- Model use: bulk work on the cheapest capable model (a free OpenCode model that has passed a trial), review on a stronger model, effort set per task (paid: at least medium; free: at least extra high).
- Replies: the result and one decision. Product data as a single table. Big output filtered first; full output offered, not pasted.

## 6. Session start

- Read `CLAUDE.md` and `docs/HANDOFF.md` only.
- Skills: installed skills are all listed at start, so keep only the ones the project uses. Park the rest (move, never delete) with a note in the project index.
- MCP servers: connect only the one the project needs.

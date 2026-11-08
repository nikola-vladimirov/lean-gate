# Routing: model and tool choice (mandatory)

Before any task starts, decide two things and write them in one line in the reply: **who does each part** (model) and **which tool or plugin** (skill, plugin or MCP). This applies to every task, including reviews and short edits. Skipping it is a defect. A trivial task (one file, no decision, a few minutes) takes the default line `main session, no tool` and nothing more.

## 1. Model routing

The gate (the panel settings) outranks this table. Its Model routing (read, code, complex, review, plan: model, effort, agent cap) and its rules are the routing; the table below only fills what the gate does not set.

| Job | Route |
|---|---|
| Bulk reads, searches, summaries, first drafts of routine text or code | Sonnet at medium effort, or a free OpenCode model (`-free`) that has passed a trial on this kind of task |
| Planning, decisions, approvals, final edits to client-facing work | The main session |
| Review of every Sonnet or OpenCode output before it is used | Opus at high effort |

- Effort is set per task by how important it is. Paid models: at least medium. Free models: the effort that passed their trial, logged in the handoff.
- Free models: probe a few on small trial tasks, keep the one that passes, and prefer it. Only `-free` models.
- A worker's output is not used until the reviewer signs it off and the task's acceptance checks pass.
- Log the routing line (job, model, effort) in the handoff for the session.

## 2. Tool and plugin choice

Pick the tool that matches the work. Load its schema only when the task needs it.

| Work | Tool or skill |
|---|---|
| Any UI, layout, visual design, component or page design | `ui-ux-pro-max` (`--design-system` for a new page or system, then `--domain ux` for a focused concern). Read its rules before designing. |
| Styling for a site where TokenForge is the target | TokenForge (non-WordPress.org build) once installed; check whether the site already uses it. Until it is installed and approved, use the site's existing styles. |
| WordPress, WooCommerce, Bricks or block-editor code | `WORDPRESS.md` and the matching `wp-*` skill (security, REST, blocks, theme, WooCommerce). At release, run `lean-gate audit security` on the `review-scope` list. |
| Bricks or BricksExtras elements, templates, queries, conditions | The `bricks-*` and `bricksextras-*` skills for the element in question, read through `bricks/get-element-schema` where needed. |
| Client website text | `SITE-COPY.md` and the project's voice notes. |
| Live site reads or writes | The site's MCP abilities first; SSH only where the abilities cannot do it (`CLIENT-SITE.md`). |
| Performance audit of a WordPress or WooCommerce codebase | `wp-woo-performance-audit` (`lean-gate audit perf`). |

- If the right tool is not installed, say so and propose the install with its backup step; do not improvise a substitute silently.
- Plugin installs on a live site need a database backup and the owner's approval first, per `CLIENT-SITE.md`.

## 3. Where it is written down

- The project index lists the routing rules that apply to it.
- The handoff logs each task's routing line.
- Session-start check: if a task starts without a routing line, write one first. Whether that stops work or only warns is the gate's `routing-line` rule.

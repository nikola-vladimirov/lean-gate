# The hub

One plugin, one panel, one config for how Claude works on your projects. lean-gate is one plugin with a gate at its center: the token-saving guides (the lean-gate skill), ponytail, the WordPress performance audit, PHPCS and the ICM project structure are modules the gate switches and obeys. Where two parts disagree, the gate wins.

Contents: [What is in it](#what-is-in-it) · [Install and migrate](#install-and-migrate) · [One-click settings](#one-click-settings) · [Starting and adopting a project](#starting-and-adopting-a-project) · [Project detection](#project-detection) · [The project layout](#the-project-layout) · [Keeping vendored tools current](#keeping-vendored-tools-current) · [Examples](#examples)

## What is in it

| Module | What it does | Where it lives | Control |
| --- | --- | --- | --- |
| Gate | Rules that warn or block (models, agents, releases, em dashes, session names, PHPCS), the master mode, routing and agent caps | `hooks/` | Panel: Rules, Model routing, Workflow and limits |
| Guides | Token-lean sessions: docs, state files, file maps, memory, board, lessons, review gate, packs | `skills/lean-gate`, `bin/` | Panel: Memory, Board, Lessons, Review, Packs |
| Project | Registry, detection, start, adopt, walk test | `~/.claude/lean-projects.json`, `STRUCTURE.md` | Panel: Project |
| ICM | The folder-as-architecture method and its link, index and graph checks (vendored `RinDig/icm-architect`, MIT) | `vendor/icm` | `lean-gate icm`, the `icm-architect` skill |
| Ponytail | The simplest-change rules (vendored `DietrichGebert/ponytail`, MIT) | `vendor/ponytail` | Panel: Ponytail |
| WordPress checks | Performance and HPOS audit (your `wp-woo-performance-audit`) and PHPCS with the WordPress standard | `vendor/wp-audit`, `bin/lib/phpcs.sh` | Panel: WordPress checks |
| Helpers | Startup notes, context nudge, doc and test hints, session drafts | `scripts/` | Panel: Built-in helpers |

The panel reference, with every button explained, is [LEAN-GATE.md](LEAN-GATE.md). The layout standard is [STRUCTURE.md](../skills/lean-gate/STRUCTURE.md).

## Install and migrate

1. Install or update the plugin: `claude plugin update lean-gate`, then restart.
2. The hub carries its own ponytail and performance audit. If the standalone plugins are still enabled, the hub stays quiet about them so nothing loads twice. Press **Switch off standalone plugins** in the Ponytail section (or run `lean-gate vendor retire`) once, then restart. It also switches off the old `lean-gate-local` plugin.
3. Open the panel (`/lean-gate`, or the **Open** button above the prompt). Set **mode** in the top row to `block` for enforcement, or leave it on `warn` to try it first (warn caps every rule to a warning).
4. In your workspace folder, press **Register folders here** in the Project section. Every child folder with `.git`, `AGENTS.md`, `CLAUDE.md`, `composer.json` or `package.json` is registered (archives, backups and `*-reference` folders are skipped).

## One-click settings

Everything is a button; nothing needs a text editor. A press writes `~/.claude/lean-gate.json`.

| Want to | Press |
| --- | --- |
| Turn the whole gate off, warn only, or enforce | The mode button in the top row |
| Change a rule's level | The level button on its row under Rules |
| Add a rule | Rule builder: pick a pattern and level, Add |
| Pick the model, effort and agent cap for reading, coding, complex coding, review or planning | Model routing |
| Set the model for this task only | `route` and the effort button beside it (top row) |
| Limit agents, set when reads are delegated, set the context limit | Workflow and limits |
| Let Claude record memory and lessons by itself | The `automatic` buttons under Project memory and Lessons |
| Choose ponytail's level, or switch its hooks off | Ponytail |
| Run the performance audit or PHPCS, pick the PHPCS standard | WordPress checks |
| Switch a helper script off | Built-in helpers |
| Bring a parked skill set back | Packs |
| Register, start or adopt a project, run the walk test | Project |

## Starting and adopting a project

The top row shows **Set up project** while the folder is not registered. It adopts the folder if it looks like a project (it has `AGENTS.md`, `CLAUDE.md`, `.git`, `composer.json` or `package.json`) and starts a new one if it does not. The Project section has both buttons separately.

- **Start project:** Claude runs the setup cards (`STARTUP.md`), asks what the project is for, and scaffolds the smallest layout that carries it (see below). Loose ideas go through the grill (`GRILL.md`) first.
- **Adopt this folder:** Claude audits the folder, classifies every file, and shows a migration map. Nothing is renamed, moved or deleted until you approve it, and replaced text moves verbatim to an archive file. An existing `CLAUDE.md` and state file stay; `AGENTS.md` is added beside them.
- Both end with **Walk test**: Claude must orient, name the next step and report status from the files alone. `lean-gate icm links` checks that every link in the project resolves.

## Project detection

The hub knows your projects from `~/.claude/lean-projects.json` (name, path, aliases).

- Opening a session in a registered folder shows `registered: <name>`.
- Naming a registered project in a chat that started somewhere else shows **Attach** (Claude reads its entry and state file for this chat), **Switch folder** (Claude changes the session to it) or **Ignore**. A name or alias must be four letters or more.
- A project folder that is not registered shows **Set up project**.
- Detection only matches names and paths. It never acts without a button press.

## The project layout

Every hub project follows one standard, a merge of ICM and the lean-gate files:

```
AGENTS.md          entry: what this is, the map, where to start (every agent reads it)
CLAUDE.md          one line: "See AGENTS.md"
<INDEX>.md         the catalog: points down, holds no content
<STATE>.md         the handoff, updated at every stage end
01-<stage>/        numbered stages; each has a CONTEXT.md and ends at a check
docs/              reference read on demand (board, lessons, plans)
```

`AGENTS.md` is read by Codex, Gemini CLI, Cursor, Copilot and others, so the project works in any of them; `CLAUDE.md` stays a one-line pointer for Claude Code. Details, adopting rules and the walk test are in `STRUCTURE.md`.

## Keeping vendored tools current

| Command | Does |
| --- | --- |
| `lean-gate vendor status` | The vendored versions, and which standalone plugins are still enabled |
| `lean-gate vendor update ponytail` | Fetch the latest ponytail release into `vendor/ponytail` |
| `lean-gate vendor update icm` | Fetch the latest icm-architect into `vendor/icm` |
| `lean-gate vendor retire` | Switch off the standalone plugins the hub contains |

An update changes files in the plugin folder. Review `git diff`, run the tests (`claude plugin test .`, `bash bin/lean-gate selftest`), then commit and release. The Ponytail section's **Update** button runs the first of these.

## Examples

- **First day:** update, restart, open the panel, press **Switch off standalone plugins**, restart, press **Register folders here** in your workspace, set the mode to `block`.
- **A new idea:** open a folder, press **Set up project**. Claude asks what it is for, scaffolds the layout, you register it, Claude runs the walk test.
- **A project you have been working on for months:** press **Adopt this folder**. Read the migration map, approve what you want, and the rest stays as it is.
- **A chat about another project:** ask "check the Nashenski checkout" from any folder. The panel offers Attach or Switch folder.
- **Before a release of a WordPress plugin:** **Performance audit**, **Run PHPCS**, **Reviewed**, then tag and push. The `release-needs-review` rule refuses the tag until the review mark is set.
